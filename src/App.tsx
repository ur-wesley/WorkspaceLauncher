import { ColorModeProvider, ColorModeScript } from "@kobalte/core";
import { MetaProvider } from "@solidjs/meta";
import { Route, Router } from "@solidjs/router";
import type { Component } from "solid-js";
import {
	createSignal,
	Match,
	onCleanup,
	onMount,
	Suspense,
	Switch,
} from "solid-js";
import { Layout } from "@/components/Layout";
import { UpdateDialog } from "@/components/UpdateDialog";
import { Toaster } from "@/components/ui/sonner";
import {
	checkDatabaseSchema,
	createRun,
	initializeDatabase,
	listAutoLaunchActions,
	listenToActionEvents,
	listGlobalVariables,
	listVariablesByWorkspace,
} from "@/libs/api";
import type { ActionCompletedEvent } from "@/libs/api/types";
import {
	launchAction as launchActionTS,
	prepareVariables,
} from "@/libs/launcher";
import { checkForUpdatesOnStartup } from "@/libs/updater";
import { SettingsHotkeysPage } from "@/pages/SettingsHotkeysPage";
import { SettingsPage } from "@/pages/SettingsPage";
import WorkspaceDetailPage from "@/pages/WorkspaceDetailPage";
import { WorkspacesListPage } from "@/pages/WorkspacesListPage";
import { startPidChecker, stopPidChecker } from "@/services/pidChecker";
import {
	isActionTrackedAndAlive,
	reconcileRunningActions,
} from "@/services/processTracking";
import { runningActionsService } from "@/services/runningActions";
import { StoreProvider } from "@/store";
import type { NewRun } from "@/types/database";

const App: Component = () => {
	const [initialized, setInitialized] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const handleActionCompleted = (event: CustomEvent<ActionCompletedEvent>) => {
		const { action_id, workspace_id, exit_code, success } = event.detail;

		const isTracked = runningActionsService
			.getAll()
			.some(
				(action) =>
					action.action_id === action_id &&
					action.workspace_id === workspace_id,
			);
		if (isTracked) {
			return;
		}

		let status: "success" | "failed" | "cancelled" = "failed";
		if (success) {
			status = "success";
		} else if (exit_code !== undefined && exit_code !== null) {
			status = exit_code === 0 ? "success" : "failed";
		}

		const newRun: NewRun = {
			workspace_id,
			action_id,
			status,
			started_at: new Date().toISOString(),
			completed_at: new Date().toISOString(),
			exit_code: exit_code ?? undefined,
			error_message: success ? undefined : "Action completed with errors",
		};

		createRun(newRun)
			.then((result) => {
				if (result.isErr()) {
					console.error("Failed to create run record:", result.error);
				} else {
					console.log(
						"Created run record for action-completed event:",
						result.value,
					);
				}
			})
			.catch((error) => {
				console.error("Error creating run record:", error);
			});
	};

	onMount(async () => {
		try {
			console.log("Starting app initialization...");
			const result = await initializeDatabase();

			if (result.isOk()) {
				console.log("Database initialized successfully");
			} else {
				console.error("Database initialization failed:", result.error);
				setError(`Failed to initialize database: ${result.error.message}`);
				return;
			}

			const schemaResult = await checkDatabaseSchema();
			if (schemaResult.isErr()) {
				console.error("Schema check failed:", schemaResult.error);
				setError(`Database schema is invalid: ${schemaResult.error.message}`);
				return;
			}

			console.log("Database schema validated");

			listenToActionEvents();

			window.addEventListener(
				"action-completed",
				handleActionCompleted as EventListener,
			);

			await reconcileRunningActions({ cold: true });
			startPidChecker();

			checkForUpdatesOnStartup().catch((err) => {
				console.error("Failed to check for updates:", err);
			});

			try {
				const autoActionsResult = await listAutoLaunchActions();
				if (autoActionsResult.isOk() && autoActionsResult.value.length > 0) {
					console.log(
						`Auto-launching ${autoActionsResult.value.length} actions...`,
					);

					for (const action of autoActionsResult.value) {
						try {
							const isAlreadyRunning = await isActionTrackedAndAlive(
								action.workspace_id,
								action.id,
							);

							if (isAlreadyRunning) {
								console.log(
									`Skipping auto-launch for ${action.name} - already running`,
								);
								continue;
							}

							const variablesResult = await listVariablesByWorkspace(
								action.workspace_id,
							);
							const variables = variablesResult.isOk()
								? variablesResult.value
								: [];

							const globalVariablesResult = await listGlobalVariables();
							const globalVariables = globalVariablesResult.isOk()
								? globalVariablesResult.value
								: [];

							const variableMap = prepareVariables(variables, globalVariables);
							const context = {
								workspaceId: action.workspace_id,
								variables: variableMap,
							};

							const result = await launchActionTS(action, context);

							if (result.success) {
								console.log(`Auto-launched action: ${action.name}`);
							} else {
								console.error(
									`Auto-launch failed for ${action.name}: ${result.message}`,
								);
							}
						} catch (actionError) {
							console.error(
								`Failed to auto-launch action ${action.name}:`,
								actionError,
							);
						}
					}
				}
			} catch (e) {
				console.error("Auto-launch startup failed:", e);
			}

			console.log("App initialization complete");
			setInitialized(true);
		} catch (err) {
			console.error("Unexpected initialization error:", err);
			setError(`Failed to initialize: ${err}`);
		}
	});

	onCleanup(() => {
		stopPidChecker();
		window.removeEventListener(
			"action-completed",
			handleActionCompleted as EventListener,
		);
	});

	return (
		<>
			<UpdateDialog />
			<Switch>
				<Match when={error()}>
					<div class="flex items-center justify-center h-screen bg-destructive/10">
						<div class="bg-card rounded-lg shadow-md p-4 max-w-md space-y-4">
							<h1 class="text-2xl font-bold text-destructive">
								Initialization Error
							</h1>
							<p class="text-muted-foreground">{error()}</p>
						</div>
					</div>
				</Match>
				<Match when={!initialized()}>
					<div class="flex items-center justify-center h-screen">
						<div class="flex flex-col items-center gap-3">
							<div class="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
							<p class="text-muted-foreground">Initializing...</p>
						</div>
					</div>
				</Match>
				<Match when={initialized()}>
					<StoreProvider>
						<ColorModeScript />
						<ColorModeProvider>
							<Router>
								<MetaProvider>
									<Suspense>
										<Route component={Layout}>
											<Route path="/" component={WorkspacesListPage} />
											<Route
												path="/w/:workspaceId"
												component={WorkspaceDetailPage}
											/>
											<Route path="/settings" component={SettingsPage} />
											<Route
												path="/settings/hotkeys"
												component={SettingsHotkeysPage}
											/>
										</Route>
									</Suspense>
								</MetaProvider>
							</Router>
							<Toaster />
						</ColorModeProvider>
					</StoreProvider>
				</Match>
			</Switch>
		</>
	);
};

export default App;
