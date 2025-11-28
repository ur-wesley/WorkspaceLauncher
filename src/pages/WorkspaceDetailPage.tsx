import { useNavigate, useParams } from "@solidjs/router";
import {
	createEffect,
	createMemo,
	createSignal,
	onMount,
	Show,
} from "solid-js";
import { ActionAIPromptDialog } from "@/components/ActionAIPromptDialog";
import { ActionCard } from "@/components/ActionCard";
import { ActionHistoryView } from "@/components/ActionHistoryView";
import { ActionDialogStepper as ActionDialog } from "@/components/action/ActionDialogStepper";
import { RunningActionsPanel } from "@/components/RunningActionsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Tabs,
	TabsContent,
	TabsIndicator,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";
import { VariableCard } from "@/components/VariableCard";
import { VariableDialog } from "@/components/variable/VariableDialog";
import {
	AddActionTrigger,
	AddVariableTrigger,
	EditWorkspaceTrigger,
} from "@/components/WorkspaceDetailTriggers";
import { WorkspaceEditDialog } from "@/components/WorkspaceEditDialog";
import { stopProcess } from "@/libs/api";
import { cn } from "@/libs/cn";
import { useHotkeys } from "@/libs/hotkeys";
import {
	launchAction as launchActionTS,
	launchWorkspace as launchWorkspaceTS,
	prepareVariables,
} from "@/libs/launcher";
import {
	buildWorkspaceScript,
	formatScriptFilename,
} from "@/libs/scriptBuilder";
import { showToast } from "@/libs/toast";
import { setAppWindowTitle } from "@/libs/windowTitle";
import {
	getWorkspaceDescriptionExpanded,
	isDescriptionExpandable,
	setWorkspaceDescriptionExpanded,
} from "@/libs/workspaceDescriptionToggle";
import type { Action } from "@/models/action.model";
import type { Workspace } from "@/models/workspace.model";
import {
	fuzzyMatch,
	getNextTab,
	getStoredTab,
	isInteractiveTarget,
	setStoredTab,
} from "@/pages/WorkspaceDetailPage.helpers";
import { runningActionsService } from "@/services/runningActions";
import { useActionStore } from "@/store/action";
import { useGlobalVariableStore } from "@/store/globalVariable";
import { useUI } from "@/store/ui";
import { useVariableStore } from "@/store/variable";
import { useWorkspaceStore } from "@/store/workspace";

export default function WorkspaceDetailPage() {
	const ui = useUI();
	const params = useParams();
	const navigate = useNavigate();
	const workspaceId = () => Number(params.workspaceId);
	const workspaceCtx = useWorkspaceStore();
	const [, actionStoreActions] = useActionStore() ?? [null, null];
	const [, variableStoreActions] = useVariableStore() ?? [null, null];
	const [, globalVariableStoreActions] = useGlobalVariableStore() ?? [
		null,
		null,
	];
	const actionStore = useActionStore()?.[0] ?? { actions: [] };
	const variableStore = useVariableStore()?.[0] ?? { variables: [] };
	const globalVariableStore = useGlobalVariableStore()?.[0] ?? {
		variables: [],
	};
	const [currentWorkspace, setCurrentWorkspace] =
		createSignal<Workspace | null>(null);
	const [isLaunching, setIsLaunching] = createSignal(false);
	const [runningActionsCount, setRunningActionsCount] = createSignal(0);
	const [showFullDescription, setShowFullDescription] = createSignal(false);
	const [runningActionIds, setRunningActionIds] = createSignal<Set<number>>(
		new Set(),
	);
	const [activeTab, setActiveTab] = createSignal(getStoredTab(workspaceId()));
	const [actionsQuery, setActionsQuery] = createSignal("");
	let filterActionsRef: HTMLInputElement | undefined;
	let filterVarsRef: HTMLInputElement | undefined;

	const updateRunningActionsCount = () => {
		const runningActions = runningActionsService.getByWorkspace(workspaceId());
		setRunningActionsCount(runningActions.length);
		setRunningActionIds(new Set(runningActions.map((a) => a.action_id)));
	};

	const isActionRunning = (actionId: number) =>
		runningActionIds().has(actionId);

	const handleTabChange = (value: string) => {
		setActiveTab(value);
		setStoredTab(workspaceId(), value);
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key !== "Tab") return;
		const target = e.target as HTMLElement | null;
		if (isInteractiveTarget(target)) return;

		e.preventDefault();
		const direction = e.shiftKey ? "backward" : "forward";
		const nextTab = getNextTab(activeTab(), direction);
		handleTabChange(nextTab);
	};

	onMount(async () => {
		await workspaceCtx.actions.loadWorkspaces();
		await globalVariableStoreActions?.loadVariables();

		ui.actions.setWorkspaceContext(workspaceId());
		ui.actions.setFocusSearch(() => {
			if (activeTab() === "actions") return filterActionsRef?.focus();
			if (activeTab() === "variables") return filterVarsRef?.focus();
			return undefined;
		});

		const id = workspaceId();
		const workspace = workspaceCtx.store.workspaces.find((w) => w.id === id);
		if (!workspace) {
			navigate("/");
			return;
		}

		updateRunningActionsCount();
		window.addEventListener("keydown", handleKeyDown);

		const interval = setInterval(updateRunningActionsCount, 1000);
		return () => {
			clearInterval(interval);
			window.removeEventListener("keydown", handleKeyDown);
		};
	});

	createEffect(() => {
		const id = workspaceId();
		actionStoreActions?.clearActions();
		variableStoreActions?.clearVariables();
		actionStoreActions?.loadActions(id);
		variableStoreActions?.loadVariables(id);

		const workspace = workspaceCtx.store.workspaces.find((w) => w.id === id);
		setCurrentWorkspace(workspace || null);
		setShowFullDescription(getWorkspaceDescriptionExpanded(id));

		if (!workspace && workspaceCtx.store.workspaces.length > 0) {
			navigate("/");
		}

		setActiveTab(getStoredTab(id));
	});

	createEffect(() => {
		if (ui.store.runAllRequested) {
			void handleLaunchWorkspace();
			ui.actions.clearRunAll();
		}
	});

	createEffect(() => {
		const workspace = currentWorkspace();
		setAppWindowTitle(workspace?.name);
	});

	useHotkeys("workspaceDetail", {
		createAction: () => ui.actions.openActionCreate(workspaceId()),
		createVariable: () => ui.actions.openVariableCreate(workspaceId()),
		focusSearch: () => {
			if (activeTab() === "actions") return filterActionsRef?.focus();
			if (activeTab() === "variables") return filterVarsRef?.focus();
		},
		runAll: () => void handleLaunchWorkspace(),
		stopAll: () => void handleStopAllActions(),
	});

	const filteredActions = createMemo(() => {
		const query = actionsQuery().trim();
		if (!query) return actionStore.actions;
		return actionStore.actions.filter((action) =>
			fuzzyMatch(action.name, query),
		);
	});

	const handleGenerateScript = async () => {
		const workspace = currentWorkspace();
		const baseActions = [...actionStore.actions].sort(
			(a, b) => a.order_index - b.order_index,
		);

		if (baseActions.length === 0) {
			showToast({
				title: "Nothing to export",
				description: "This workspace has no actions to include in the script",
				variant: "default",
			});
			return;
		}

		const script = buildWorkspaceScript({
			actions: baseActions,
			variables: variableStore.variables,
		});

		if (script.length === 0) {
			showToast({
				title: "Nothing to export",
				description: "Generating the script produced no output",
				variant: "default",
			});
			return;
		}

		const fileName = formatScriptFilename(workspace?.name ?? "workspace");

		try {
			if (
				"showSaveFilePicker" in window &&
				typeof window.showSaveFilePicker === "function"
			) {
				const handle = await window.showSaveFilePicker({
					suggestedName: fileName,
					types: [
						{
							description: "PowerShell script",
							accept: { "application/x-powershell": [".ps1"] },
						},
					],
				});
				const writable = await handle.createWritable();
				await writable.write(script);
				await writable.close();
			} else {
				const blob = new Blob([script], { type: "text/plain" });
				const url = URL.createObjectURL(blob);
				const anchor = document.createElement("a");
				anchor.href = url;
				anchor.download = fileName;
				anchor.click();
				URL.revokeObjectURL(url);
			}

			showToast({
				title: "Script saved",
				description: `Saved ${fileName}`,
				variant: "default",
			});
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") {
				return;
			}

			showToast({
				title: "Save failed",
				description: String(error),
				variant: "destructive",
			});
		}
	};

	const handleLaunchWorkspace = async () => {
		const workspace = currentWorkspace();
		if (!workspace) return;

		const existingRunningIds = new Set(runningActionIds());
		const actionsToLaunch = actionStore.actions.filter(
			(action) => !existingRunningIds.has(action.id),
		);

		if (actionsToLaunch.length === 0) {
			showToast({
				title: "Actions Already Running",
				description: "All actions in this workspace are already running",
				variant: "default",
			});
			return;
		}

		setIsLaunching(true);
		try {
			// Ensure global variables are up to date
			await globalVariableStoreActions?.loadVariables();

			console.log("Launching workspace. Global Store State:", {
				variablesLength: globalVariableStore.variables.length,
				loading: globalVariableStore.loading,
				error: globalVariableStore.error,
			});

			const variables = prepareVariables(
				variableStore.variables,
				globalVariableStore.variables,
			);
			const context = { workspaceId: workspace.id, variables };
			const results = await launchWorkspaceTS(actionsToLaunch, context);

			const successCount = results.filter((r) => r.success).length;
			const totalCount = actionsToLaunch.length;

			showToast({
				title: "Workspace Launched",
				description: `${successCount}/${totalCount} actions started successfully`,
				variant: successCount === totalCount ? "default" : "destructive",
			});
		} catch (error) {
			showToast({
				title: "Launch Error",
				description: `Failed to launch workspace: ${error}`,
				variant: "destructive",
			});
		} finally {
			setIsLaunching(false);
			updateRunningActionsCount();
		}
	};

	const handleStopAllActions = async () => {
		const workspace = currentWorkspace();
		if (!workspace) return;

		const runningActions = runningActionsService.getByWorkspace(workspace.id);
		if (runningActions.length === 0) {
			showToast({
				title: "No Running Actions",
				description: "There are no running actions to stop",
				variant: "default",
			});
			return;
		}

		let stoppedCount = 0;
		let failedCount = 0;

		for (const runningAction of runningActions) {
			try {
				const result = await stopProcess(runningAction.process_id);
				if (result.isOk()) {
					runningActionsService.remove(runningAction.id);
					stoppedCount++;
				} else {
					failedCount++;
				}
			} catch {
				failedCount++;
			}
		}

		updateRunningActionsCount();

		if (stoppedCount > 0) {
			showToast({
				title: "Actions Stopped",
				description: `Stopped ${stoppedCount} of ${
					runningActions.length
				} running action${runningActions.length !== 1 ? "s" : ""}`,
				variant: failedCount > 0 ? "default" : "success",
			});
		}

		if (failedCount > 0 && stoppedCount === 0) {
			showToast({
				title: "Stop Failed",
				description: `Failed to stop ${failedCount} action${failedCount !== 1 ? "s" : ""}`,
				variant: "destructive",
			});
		}
	};

	const handleLaunchAction = async (action: Action) => {
		const workspace = currentWorkspace();
		if (!workspace) return;

		const runningAction = runningActionsService
			.getByWorkspace(workspace.id)
			.find((ra) => ra.action_id === action.id);

		if (runningAction) {
			try {
				const result = await stopProcess(runningAction.process_id);
				if (result.isOk()) {
					runningActionsService.remove(runningAction.id);
					updateRunningActionsCount();
					showToast({
						title: "Action Stopped",
						description: `${action.name} has been stopped`,
						variant: "default",
					});
				} else {
					showToast({
						title: "Stop Failed",
						description: result.error,
						variant: "destructive",
					});
				}
			} catch (error) {
				showToast({
					title: "Stop Error",
					description: `Failed to stop action: ${error}`,
					variant: "destructive",
				});
			}
			return;
		}

		try {
			// Ensure global variables are up to date
			await globalVariableStoreActions?.loadVariables();

			console.log("Launching action. Global Store State:", {
				variablesLength: globalVariableStore.variables.length,
			});

			const variables = prepareVariables(
				variableStore.variables,
				globalVariableStore.variables,
			);
			const context = { workspaceId: workspace.id, variables };
			const result = await launchActionTS(action, context);

			if (result.success) {
				showToast({
					title: "Action Launched",
					description: `${action.name} started successfully`,
					variant: "default",
				});
				updateRunningActionsCount();
			} else {
				showToast({
					title: "Launch Failed",
					description: result.message,
					variant: "destructive",
				});
			}
		} catch (error) {
			showToast({
				title: "Launch Error",
				description: `Failed to launch action: ${error}`,
				variant: "destructive",
			});
		}
	};

	const handleVariableToggle = async (variableId: number, enabled: boolean) => {
		if (!variableStoreActions) return;
		await variableStoreActions.toggleVariable(variableId, enabled);
	};
	return (
		<div class="h-full flex flex-col w-full">
			<Show
				when={currentWorkspace()}
				fallback={<div class="p-4 sm:p-6 lg:p-8">Loading workspace...</div>}
			>
				{(workspace) => (
					<>
						<div class="w-full flex flex-col gap-2 p-4">
							<div class="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
								<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold truncate flex-1 min-w-0">
									{workspace().name}
								</h1>
								<div class="flex gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
									<Button
										variant="outline"
										onClick={handleLaunchWorkspace}
										disabled={isLaunching() || actionStore.actions.length === 0}
										class="whitespace-nowrap flex-1 sm:flex-initial"
									>
										<div class="i-mdi-play w-4 h-4 mr-2" />
										<span class="hidden sm:inline">
											{isLaunching() ? "Launching..." : "Run All Actions"}
										</span>
										<span class="sm:hidden">
											{isLaunching() ? "Launching..." : "Run All"}
										</span>
									</Button>
									<Button
										variant="outline"
										onClick={handleGenerateScript}
										disabled={actionStore.actions.length === 0}
										class="flex-1 sm:flex-initial whitespace-nowrap"
									>
										<div class="i-mdi-file-code-outline w-4 h-4 mr-2" />
										Generate Script
									</Button>
									<Show when={workspace()}>
										{(ws) => (
											<WorkspaceEditDialog
												workspace={ws()}
												trigger={EditWorkspaceTrigger}
											/>
										)}
									</Show>
								</div>
							</div>
							<Show when={workspace().description}>
								<Card class="bg-muted/80 shadow-md">
									<CardContent class="p-5">
										<p
											class={cn(
												"text-muted-foreground whitespace-pre-line text-sm sm:text-base",
												!showFullDescription() && "line-clamp-4",
											)}
										>
											{workspace().description}
										</p>
										<Show
											when={isDescriptionExpandable(workspace().description, {
												minCharacters: 200,
												minLineBreaks: 2,
											})}
										>
											<button
												type="button"
												onClick={() => {
													const next = !showFullDescription();
													setShowFullDescription(next);
													setWorkspaceDescriptionExpanded(workspace().id, next);
												}}
												class="text-sm text-primary hover:underline mt-2 inline-block"
											>
												{showFullDescription() ? "Show less" : "Show more"}
											</button>
										</Show>
									</CardContent>
								</Card>
							</Show>
						</div>

						<Tabs
							value={activeTab()}
							onChange={handleTabChange}
							class="flex-1 flex flex-col w-full px-4 py-4 min-h-0"
						>
							<TabsList class="mb-4 w-full sm:w-auto flex-wrap sm:flex-nowrap">
								<TabsTrigger
									value="actions"
									class="flex-1 sm:flex-initial min-w-0"
								>
									<div class="i-mdi-play-circle w-4 h-4 mr-2 flex-shrink-0" />
									<span class="hidden sm:inline truncate">
										Actions ({actionStore.actions.length})
									</span>
									<span class="sm:hidden truncate">Actions</span>
								</TabsTrigger>
								<TabsTrigger
									value="variables"
									class="flex-1 sm:flex-initial min-w-0"
								>
									<div class="i-mdi-variable w-4 h-4 mr-2 flex-shrink-0" />
									<span class="hidden sm:inline truncate">
										Environment Variables ({variableStore.variables.length})
									</span>
									<span class="sm:hidden truncate">Vars</span>
								</TabsTrigger>
								<TabsTrigger value="running" class="flex-1 sm:flex-initial">
									<div class="i-mdi-flash w-4 h-4 mr-2" />
									<span class="hidden sm:inline">Running</span>
									<span class="sm:hidden">Run</span>
									<Show when={runningActionsCount() > 0}>
										<Badge variant="default" class="ml-2 px-1.5 py-0 text-xs">
											{runningActionsCount()}
										</Badge>
									</Show>
								</TabsTrigger>
								<TabsTrigger value="history" class="flex-1 sm:flex-initial">
									<div class="i-mdi-history w-4 h-4 mr-2" />
									<span class="hidden sm:inline">History</span>
									<span class="sm:hidden">Hist</span>
								</TabsTrigger>
								<TabsIndicator />
							</TabsList>

							<TabsContent value="actions" class="flex-1 w-full overflow-auto">
								<Card class="h-full w-full flex flex-col border-0 shadow-none bg-transparent">
									<CardHeader class="px-0 pt-0">
										<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
											<div>
												<CardTitle>Actions</CardTitle>
												<CardDescription>
													Tasks and commands to run in this workspace
												</CardDescription>
											</div>
											<div class="flex gap-2">
												<ActionAIPromptDialog
													workspaceId={workspaceId()}
													onImportSuccess={() =>
														actionStoreActions?.loadActions(workspaceId())
													}
												/>
												<Show when={workspace()}>
													{(ws) => (
														<ActionDialog
															workspaceId={ws().id.toString()}
															trigger={AddActionTrigger}
														/>
													)}
												</Show>
											</div>
										</div>
									</CardHeader>
									<CardContent class="flex-1 overflow-y-auto px-0 pb-0">
										<div class="mb-3">
											<input
												type="text"
												placeholder="filter actions..."
												ref={(el) => {
													filterActionsRef = el;
												}}
												class="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:(outline-none ring-2 ring-ring border-ring)"
												onInput={(e) => setActionsQuery(e.currentTarget.value)}
											/>
										</div>
										<Show
											when={filteredActions().length > 0}
											fallback={
												<div class="text-center py-12 text-muted-foreground">
													<div class="i-mdi-play-circle-outline text-5xl mb-3 opacity-50" />
													<p class="text-lg font-medium">
														No actions configured
													</p>
													<p class="text-sm mt-1">
														Add actions to automate your workflow
													</p>
												</div>
											}
										>
											<div class="space-y-2">
												{filteredActions().map((action) => (
													<ActionCard
														action={action}
														workspaceId={workspaceId()}
														isRunning={isActionRunning(action.id)}
														onLaunch={handleLaunchAction}
													/>
												))}
											</div>
										</Show>
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value="running" class="flex-1 w-full overflow-auto">
								<Card class="h-full w-full flex flex-col border-0 shadow-none bg-transparent">
									<CardHeader class="px-0 pt-0">
										<CardTitle>Running Actions</CardTitle>
										<CardDescription>
											Currently executing actions with live process monitoring
										</CardDescription>
									</CardHeader>
									<CardContent class="flex-1 overflow-y-auto px-0 pb-0">
										<Show when={workspace()}>
											{(ws) => <RunningActionsPanel workspaceId={ws().id} />}
										</Show>
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value="history" class="flex-1 w-full overflow-auto">
								<Card class="h-full w-full flex flex-col border-0 shadow-none bg-transparent">
									<CardHeader class="px-0 pt-0">
										<CardTitle>Action History</CardTitle>
										<CardDescription>
											Complete execution history with status tracking
										</CardDescription>
									</CardHeader>
									<CardContent class="flex-1 overflow-y-auto px-0 pb-0">
										<Show when={workspace()}>
											{(ws) => <ActionHistoryView workspaceId={ws().id} />}
										</Show>
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent
								value="variables"
								class="flex-1 w-full overflow-auto"
							>
								<Card class="h-full w-full flex flex-col border-0 shadow-none bg-transparent">
									<CardHeader class="px-0 pt-0">
										<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
											<div>
												<CardTitle>Environment Variables</CardTitle>
												<CardDescription>
													Key-value pairs available to all actions in this
													workspace
												</CardDescription>
											</div>
											<Show when={workspace()}>
												{(ws) => (
													<VariableDialog
														workspaceId={ws().id.toString()}
														trigger={AddVariableTrigger}
													/>
												)}
											</Show>
										</div>
									</CardHeader>
									<CardContent class="flex-1 overflow-y-auto px-0 pb-0">
										<div />
										<Show
											when={variableStore.variables.length > 0}
											fallback={
												<div class="text-center py-12 text-muted-foreground">
													<div class="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
														<div class="i-mdi-variable text-2xl" />
													</div>
													<h3 class="text-lg font-medium text-foreground mb-2">
														No environment variables
													</h3>
													<p class="text-sm">
														Environment variables allow you to configure paths
														and settings for your actions
													</p>
													<p class="text-sm mt-2 text-muted-foreground">
														Use the button in the top right to add your first
														variable
													</p>
												</div>
											}
										>
											<div class="space-y-2">
												{variableStore.variables.map((variable) => (
													<VariableCard
														variable={variable}
														workspaceId={workspaceId()}
														onToggle={handleVariableToggle}
													/>
												))}
											</div>
										</Show>
									</CardContent>
								</Card>
							</TabsContent>
						</Tabs>
					</>
				)}
			</Show>
		</div>
	);
}
