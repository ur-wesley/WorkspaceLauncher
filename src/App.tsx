import { ColorModeProvider, ColorModeScript } from "@kobalte/core";
import { MetaProvider } from "@solidjs/meta";
import { Route, Router } from "@solidjs/router";
import type { Component } from "solid-js";
import { createSignal, Match, onCleanup, onMount, Suspense, Switch } from "solid-js";
import { Layout } from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import { checkDatabaseSchema, initializeDatabase, listenToActionEvents } from "@/libs/api";
import { SettingsPage } from "@/pages/SettingsPage";
import WorkspaceDetailPage from "@/pages/WorkspaceDetailPage";
import { WorkspacesListPage } from "@/pages/WorkspacesListPage";
import { startPidChecker, stopPidChecker } from "@/services/pidChecker";
import { StoreProvider } from "@/store";

const App: Component = () => {
	const [initialized, setInitialized] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	onMount(async () => {
		try {
			console.log("Starting app initialization...");
			const dbResult = await initializeDatabase();

			if (dbResult.isErr()) {
				console.error("Database initialization failed:", dbResult.error);
				setError(`Failed to initialize database: ${dbResult.error.message}`);
				return;
			}

			console.log("Database initialized successfully");

			const schemaResult = await checkDatabaseSchema();
			if (schemaResult.isErr()) {
				console.error("Schema check failed:", schemaResult.error);
				setError(`Database schema is invalid: ${schemaResult.error.message}`);
				return;
			}

			console.log("Database schema validated");

			listenToActionEvents();

			startPidChecker();

			console.log("App initialization complete");
			setInitialized(true);
		} catch (err) {
			console.error("Unexpected initialization error:", err);
			setError(`Failed to initialize: ${err}`);
		}
	});

	onCleanup(() => {
		stopPidChecker();
	});

	return (
		<Switch>
			<Match when={error()}>
				<div class="flex items-center justify-center h-screen bg-destructive/10">
					<div class="bg-card rounded-lg shadow-md p-4 max-w-md">
						<h1 class="text-2xl font-bold text-destructive mb-2">Initialization Error</h1>
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
										<Route path="/w/:workspaceId" component={WorkspaceDetailPage} />
										<Route path="/settings" component={SettingsPage} />
									</Route>
								</Suspense>
							</MetaProvider>
						</Router>
						<Toaster />
					</ColorModeProvider>
				</StoreProvider>
			</Match>
		</Switch>
	);
};

export default App;
