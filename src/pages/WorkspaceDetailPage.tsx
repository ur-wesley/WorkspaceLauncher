import { useParams } from "@solidjs/router";
import { createEffect, createSignal, onMount, Show } from "solid-js";
import { ActionDialog } from "@/components/ActionDialog";
import { ActionHistoryView } from "@/components/ActionHistoryView";
import { ActionRunHistory } from "@/components/ActionRunHistory";
import { DeleteActionDialog } from "@/components/DeleteActionDialog";
import { DeleteVariableDialog } from "@/components/DeleteVariableDialog";
import { RunningActionsPanel } from "@/components/RunningActionsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch, SwitchControl, SwitchThumb } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { VariableDialog } from "@/components/VariableDialog";
import { WorkspaceEditDialog } from "@/components/WorkspaceEditDialog";
import { stopProcess } from "@/libs/api";
import { cn } from "@/libs/cn";
import {
	launchAction as launchActionTS,
	launchWorkspace as launchWorkspaceTS,
	prepareVariables,
} from "@/libs/launcher";
import { showToast } from "@/libs/toast";
import { runningActionsService } from "@/services/runningActions";
import { useActionStore } from "@/store/action";
import { useVariableStore } from "@/store/variable";
import { useWorkspaceStore } from "@/store/workspace";
import type { Action, Workspace } from "@/types/database";


export default function WorkspaceDetailPage() {
	const params = useParams();
	const workspaceId = () => Number(params.workspaceId);
	const workspaceCtx = useWorkspaceStore();
	const [, actionStoreActions] = useActionStore() ?? [null, null];
	const [, variableStoreActions] = useVariableStore() ?? [null, null];
	const actionStore = useActionStore()?.[0] ?? { actions: [] };
	const variableStore = useVariableStore()?.[0] ?? { variables: [] };
	const [currentWorkspace, setCurrentWorkspace] = createSignal<Workspace | null>(null);
	const [isLaunching, setIsLaunching] = createSignal(false);
	const [runningActionsCount, setRunningActionsCount] = createSignal(0);
	const [showFullDescription, setShowFullDescription] = createSignal(false);
	const [runningActionIds, setRunningActionIds] = createSignal<Set<number>>(new Set());

	const updateRunningActionsCount = () => {
		const runningActions = runningActionsService.getByWorkspace(workspaceId());
		setRunningActionsCount(runningActions.length);
		setRunningActionIds(new Set(runningActions.map((a) => a.action_id)));
	};

	const isActionRunning = (actionId: number) => {
		return runningActionIds().has(actionId);
	};

	const getStoredTab = () => {
		try {
			return localStorage.getItem(`workspace-${workspaceId()}-tab`) || "actions";
		} catch {
			return "actions";
		}
	};
	const [activeTab, setActiveTab] = createSignal(getStoredTab());

	const handleTabChange = (value: string) => {
		setActiveTab(value);
		try {
			localStorage.setItem(`workspace-${workspaceId()}-tab`, value);
		} catch {
		}
	};

	onMount(async () => {
		await workspaceCtx.actions.loadWorkspaces();

		updateRunningActionsCount();

		const interval = setInterval(updateRunningActionsCount, 1000);

		return () => clearInterval(interval);
	});

	createEffect(() => {
		const id = workspaceId();
		console.log("WorkspaceDetailPage: workspaceId changed to", id);

		actionStoreActions?.clearActions();
		variableStoreActions?.clearVariables();

		actionStoreActions?.loadActions(id);
		variableStoreActions?.loadVariables(id);

		const workspace = workspaceCtx.store.workspaces.find((w: Workspace) => w.id === id);
		setCurrentWorkspace(workspace || null);

		setActiveTab(getStoredTab());
	});

	const handleVariableToggle = async (variableId: number, enabled: boolean) => {
		console.log("Toggle variable called:", { variableId, enabled });

		if (!variableStoreActions) {
			console.error("variableStoreActions is null");
			return;
		}

		try {
			await variableStoreActions.toggleVariable(variableId, enabled);
			console.log("Toggle completed, store should be updated reactively");
		} catch (error) {
			console.error("Toggle variable failed:", error);
		}
	};

	const EditVariableTrigger = (props: { onClick?: () => void }) => (
		<button
			type="button"
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				setTimeout(() => props.onClick?.(), 100);
			}}
			class="flex items-center w-full px-2 py-2 text-sm cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground text-left border-none bg-transparent"
		>
			<div class="i-mdi-pencil w-4 h-4 mr-2" />
			Edit Variable
		</button>
	);

	const DeleteVariableTrigger = (props: { onClick?: () => void }) => (
		<button
			type="button"
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				setTimeout(() => props.onClick?.(), 100);
			}}
			class="flex items-center w-full px-2 py-2 text-sm cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground text-destructive hover:text-destructive text-left border-none bg-transparent"
		>
			<div class="i-mdi-delete w-4 h-4 mr-2" />
			Delete Variable
		</button>
	);

	const EditActionTrigger = (props: { onClick?: () => void }) => (
		<button
			type="button"
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				setTimeout(() => props.onClick?.(), 100);
			}}
			class="flex items-center w-full px-2 py-2 text-sm cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground text-left border-none bg-transparent"
		>
			<div class="i-mdi-pencil w-4 h-4 mr-2" />
			Edit Action
		</button>
	);

	const DeleteActionTrigger = (props: { onClick?: () => void }) => (
		<button
			type="button"
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				setTimeout(() => props.onClick?.(), 100);
			}}
			class="flex items-center w-full px-2 py-2 text-sm cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground text-destructive hover:text-destructive text-left border-none bg-transparent"
		>
			<div class="i-mdi-delete w-4 h-4 mr-2" />
			Delete Action
		</button>
	);

	const handleLaunchWorkspace = async () => {
		const workspace = currentWorkspace();
		if (!workspace) return;

		setIsLaunching(true);
		try {
			console.log("Launching workspace:", workspace.id);

			const variables = prepareVariables(variableStore.variables);
			const context = {
				workspaceId: workspace.id,
				variables,
			};

			console.log("Launch context:", context);

			const results = await launchWorkspaceTS(actionStore.actions, context);

			const successCount = results.filter((r) => r.success).length;
			const totalCount = results.length;

			showToast({
				title: "Workspace Launched",
				description: `${successCount}/${totalCount} actions started successfully`,
				variant: successCount === totalCount ? "default" : "destructive",
			});

			console.log("Launch results:", results);
		} catch (error) {
			console.error("Launch workspace error:", error);
			showToast({
				title: "Launch Error",
				description: `Failed to launch workspace: ${error}`,
				variant: "destructive",
			});
		} finally {
			setIsLaunching(false);
		}
	};

	const handleLaunchAction = async (action: Action) => {
		const workspace = currentWorkspace();
		if (!workspace) return;

		const runningAction = runningActionsService.getByWorkspace(workspace.id).find((ra) => ra.action_id === action.id);

		if (runningAction) {
			try {
				console.log("Stopping action:", action.id, "PID:", runningAction.process_id);

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
				console.error("Stop action error:", error);
				showToast({
					title: "Stop Error",
					description: `Failed to stop action: ${error}`,
					variant: "destructive",
				});
			}
			return;
		}

		try {
			console.log("Launching action:", action.id);

			const variables = prepareVariables(variableStore.variables);
			const context = {
				workspaceId: workspace.id,
				variables,
			};

			console.log("Action launch context:", context);

			const result = await launchActionTS(action, context);

			if (result.success) {
				showToast({
					title: "Action Launched",
					description: `${action.name} started successfully`,
					variant: "default",
				});

				console.log("Action launch result:", result);

				updateRunningActionsCount();
			} else {
				showToast({
					title: "Launch Failed",
					description: result.message,
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Launch action error:", error);
			showToast({
				title: "Launch Error",
				description: `Failed to launch action: ${error}`,
				variant: "destructive",
			});
		}
	};

	const EditTrigger = (props: { onClick?: () => void }) => (
		<Button variant="outline" size="icon" onClick={props.onClick}>
			<div class="i-mdi-pencil w-4 h-4" />
		</Button>
	);

	const AddVariableTrigger = (props: { onClick?: () => void }) => (
		<Button onClick={props.onClick}>
			<div class="i-mdi-plus w-4 h-4 mr-2" />
			Add Variable
		</Button>
	);

	const AddActionTrigger = (props: { onClick?: () => void }) => (
		<Button onClick={props.onClick}>
			<div class="i-mdi-plus w-4 h-4 mr-2" />
			Add Action
		</Button>
	);
	return (
		<div class="h-full flex flex-col w-full">
			<Show when={currentWorkspace()} fallback={<div class="p-4 sm:p-6 lg:p-8">Loading workspace...</div>}>
				{(workspace) => (
					<>
						{/* Workspace Header */}
						<div class="w-full flex flex-col sm:flex-row justify-between items-start gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 bg-muted/30 shadow-sm border-b border-border">
							<div class="flex-1 min-w-0 w-full sm:w-auto">
								<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold truncate">{workspace().name}</h1>
								<Show when={workspace().description}>
									<div class="mt-2">
										<p
											class={cn(
												"text-muted-foreground whitespace-pre-line text-sm sm:text-base",
												!showFullDescription() && "line-clamp-4",
											)}
										>
											{workspace().description}
										</p>
									</div>
									<Show when={(workspace().description?.length ?? 0) > 200}>
										<button
											type="button"
											onClick={() => setShowFullDescription(!showFullDescription())}
											class="text-sm text-primary hover:underline mt-0.5 inline-block"
										>
											{showFullDescription() ? "Show less" : "Show more"}
										</button>
									</Show>
								</Show>
							</div>
							<div class="flex gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
								<Button
									variant="outline"
									onClick={handleLaunchWorkspace}
									disabled={isLaunching() || actionStore.actions.length === 0}
									class="whitespace-nowrap flex-1 sm:flex-initial"
								>
									<div class="i-mdi-play w-4 h-4 mr-2" />
									<span class="hidden sm:inline">{isLaunching() ? "Launching..." : "Run All Actions"}</span>
									<span class="sm:hidden">{isLaunching() ? "Launching..." : "Run All"}</span>
								</Button>
								<Show when={workspace()}>{(ws) => <WorkspaceEditDialog workspace={ws()} trigger={EditTrigger} />}</Show>
							</div>
						</div>

						{/* Tabs for Actions and Environment Variables */}
						<Tabs
							value={activeTab()}
							onChange={handleTabChange}
							class="flex-1 flex flex-col w-full px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 min-h-0"
						>
							<TabsList class="mb-4 w-full sm:w-auto flex-wrap sm:flex-nowrap">
								<TabsTrigger value="actions" class="flex-1 sm:flex-initial min-w-0">
									<div class="i-mdi-play-circle w-4 h-4 mr-2 flex-shrink-0" />
									<span class="hidden sm:inline truncate">Actions ({actionStore.actions.length})</span>
									<span class="sm:hidden truncate">Actions</span>
								</TabsTrigger>
								<TabsTrigger value="variables" class="flex-1 sm:flex-initial min-w-0">
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

							{/* Actions Tab */}
							<TabsContent value="actions" class="flex-1 w-full overflow-auto">
								<Card class="h-full w-full flex flex-col border-0 shadow-none bg-transparent">
									<CardHeader class="px-0 pt-0">
										<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
											<div>
												<CardTitle>Actions</CardTitle>
												<CardDescription>Tasks and commands to run in this workspace</CardDescription>
											</div>
											<Show when={workspace()}>
												{(ws) => <ActionDialog workspaceId={ws().id.toString()} trigger={AddActionTrigger} />}
											</Show>
										</div>
									</CardHeader>
									<CardContent class="flex-1 overflow-y-auto px-0 pb-0">
										<Show
											when={actionStore.actions.length > 0}
											fallback={
												<div class="text-center py-12 text-muted-foreground">
													<div class="i-mdi-play-circle-outline text-5xl mb-3 opacity-50" />
													<p class="text-lg font-medium">No actions configured</p>
													<p class="text-sm mt-1">Add actions to automate your workflow</p>
												</div>
											}
										>
											<div class="space-y-3">
												{actionStore.actions.map((action) => {
													let actionConfig: Record<string, unknown> = {};
													let toolName = "Unknown";
													let commandPreview = "";

													try {
														actionConfig = JSON.parse(action.config);
														if (action.action_type === "tool" && typeof actionConfig.tool_name === "string") {
															toolName = actionConfig.tool_name;
															if (
																typeof actionConfig.placeholder_values === "object" &&
																actionConfig.placeholder_values !== null
															) {
																const placeholders = Object.entries(actionConfig.placeholder_values)
																	.map(([key, value]) => `${key}="${String(value)}"`)
																	.join(", ");
																commandPreview = placeholders;
															}
														}
													} catch {
													}

													return (
														<div class="group rounded-lg bg-muted/30 hover:bg-muted/50 shadow-sm hover:shadow-md transition-all duration-200">
															<div class="p-3">
																{/* Action header with name and badges */}
																<div class="flex items-center justify-between mb-2 gap-2">
																	<div class="flex items-center gap-3 flex-1 min-w-0">
																		{/* Order Badge */}
																		<div class="flex items-center justify-center w-8 h-8 rounded bg-primary text-primary-foreground text-xs font-bold shrink-0">
																			{action.order_index + 1}
																		</div>

																		{/* Action Name and Type */}
																		<div class="flex items-center gap-2 flex-1 min-w-0">
																			<h4 class="font-semibold text-sm truncate">{action.name}</h4>
																			<Show when={isActionRunning(action.id)}>
																				<Badge
																					variant="default"
																					class="text-xs font-medium shrink-0 bg-green-500 hover:bg-green-600"
																				>
																					<div class="i-mdi-loading w-3 h-3 mr-1 animate-spin" />
																					Running
																				</Badge>
																			</Show>
																			<Show when={action.action_type === "tool"}>
																				<Badge variant="secondary" class="text-xs font-medium shrink-0">
																					{toolName}
																				</Badge>
																			</Show>
																			<Show when={action.action_type !== "tool"}>
																				<Badge variant="default" class="text-xs font-medium capitalize shrink-0">
																					{action.action_type}
																				</Badge>
																			</Show>
																		</div>
																	</div>

																	{/* Action dropdown */}
																	<DropdownMenu>
																		<Tooltip>
																			<TooltipTrigger>
																				<DropdownMenuTrigger
																					as={Button}
																					variant="ghost"
																					size="sm"
																					class="h-8 w-8 p-0 opacity-60 hover:opacity-100"
																				>
																					<div class="i-mdi-dots-vertical w-4 h-4" />
																				</DropdownMenuTrigger>
																			</TooltipTrigger>
																			<TooltipContent>
																				<p>Action Options</p>
																			</TooltipContent>
																		</Tooltip>
																		<DropdownMenuContent class="w-48">
																			<Show when={workspace()}>
																				{(ws) => (
																					<ActionDialog
																						workspaceId={ws().id.toString()}
																						action={action}
																						trigger={EditActionTrigger}
																					/>
																				)}
																			</Show>
																			<DropdownMenuSeparator />
																			<DeleteActionDialog action={action} trigger={DeleteActionTrigger} />
																		</DropdownMenuContent>
																	</DropdownMenu>
																</div>

																{/* Action details */}
																<div class="flex items-center justify-between pl-11">
																	<div class="flex items-center gap-2 flex-1 min-w-0">
																		<Show when={commandPreview}>
																			<code class="bg-muted px-2 py-1 rounded text-xs font-mono text-muted-foreground truncate">
																				{commandPreview}
																			</code>
																		</Show>
																		<Show when={action.timeout_seconds}>
																			<Badge variant="outline" class="text-xs shrink-0">
																				<div class="i-mdi-timer-outline w-3 h-3 mr-1" />
																				{action.timeout_seconds}s
																			</Badge>
																		</Show>
																	</div>

																	{/* Action buttons */}
																	<div class="flex items-center gap-2">
																		{/* History button */}
																		<Show when={workspace()}>
																			{(ws) => (
																				<ActionRunHistory
																					workspaceId={ws().id}
																					actionId={action.id}
																					actionName={action.name}
																					trigger={
																						<Button
																							variant="outline"
																							size="sm"
																							title={`View history for ${action.name}`}
																							class="gap-1.5 shrink-0"
																						>
																							<div class="i-mdi-history w-4 h-4" />
																							<span class="hidden sm:inline">History</span>
																						</Button>
																					}
																				/>
																			)}
																		</Show>

																		{/* Launch/Stop button */}
																		<Button
																			variant={isActionRunning(action.id) ? "destructive" : "default"}
																			size="sm"
																			onClick={() => handleLaunchAction(action)}
																			title={
																				isActionRunning(action.id) ? `Stop ${action.name}` : `Launch ${action.name}`
																			}
																			class="gap-1.5 shrink-0"
																		>
																			<Show
																				when={isActionRunning(action.id)}
																				fallback={<div class="i-mdi-play w-4 h-4" />}
																			>
																				<div class="i-mdi-stop w-4 h-4" />
																			</Show>
																			<span class="hidden sm:inline">
																				{isActionRunning(action.id) ? "Stop" : "Launch"}
																			</span>
																		</Button>
																	</div>
																</div>
															</div>
														</div>
													);
												})}
											</div>
										</Show>
									</CardContent>
								</Card>
							</TabsContent>

							{/* Running Actions Tab */}
							<TabsContent value="running" class="flex-1 w-full overflow-auto">
								<Card class="h-full w-full flex flex-col border-0 shadow-none bg-transparent">
									<CardHeader class="px-0 pt-0">
										<CardTitle>Running Actions</CardTitle>
										<CardDescription>Currently executing actions with live process monitoring</CardDescription>
									</CardHeader>
									<CardContent class="flex-1 overflow-y-auto px-0 pb-0">
										<Show when={workspace()}>{(ws) => <RunningActionsPanel workspaceId={ws().id} />}</Show>
									</CardContent>
								</Card>
							</TabsContent>

							{/* Action History Tab */}
							<TabsContent value="history" class="flex-1 w-full overflow-auto">
								<Card class="h-full w-full flex flex-col border-0 shadow-none bg-transparent">
									<CardHeader class="px-0 pt-0">
										<CardTitle>Action History</CardTitle>
										<CardDescription>Complete execution history with status tracking</CardDescription>
									</CardHeader>
									<CardContent class="flex-1 overflow-y-auto px-0 pb-0">
										<Show when={workspace()}>{(ws) => <ActionHistoryView workspaceId={ws().id} />}</Show>
									</CardContent>
								</Card>
							</TabsContent>

							{/* Environment Variables Tab */}
							<TabsContent value="variables" class="flex-1 w-full overflow-auto">
								<Card class="h-full w-full flex flex-col border-0 shadow-none bg-transparent">
									<CardHeader class="px-0 pt-0">
										<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
											<div>
												<CardTitle>Environment Variables</CardTitle>
												<CardDescription>Key-value pairs available to all actions in this workspace</CardDescription>
											</div>
											<Show when={workspace()}>
												{(ws) => <VariableDialog workspaceId={ws().id.toString()} trigger={AddVariableTrigger} />}
											</Show>
										</div>
									</CardHeader>
									<CardContent class="flex-1 overflow-y-auto px-0 pb-0">
										<Show
											when={variableStore.variables.length > 0}
											fallback={
												<div class="text-center py-12 text-muted-foreground">
													<div class="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
														<div class="i-mdi-variable text-2xl" />
													</div>
													<h3 class="text-lg font-medium text-foreground mb-2">No environment variables</h3>
													<p class="text-sm">
														Environment variables allow you to configure paths and settings for your actions
													</p>
													<p class="text-sm mt-2 text-muted-foreground">
														Use the button in the top right to add your first variable
													</p>
												</div>
											}
										>
											<div class="space-y-3">
												{variableStore.variables.map((variable) => (
													<div class="group rounded-lg bg-muted/30 hover:bg-muted/50 shadow-sm hover:shadow-md transition-all duration-200">
														<div class="p-3">
															{/* Key-Value pair display in environment variable format */}
															<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
																<div class="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto">
																	{/* Environment variable syntax: KEY=VALUE */}
																	<div class="flex items-center gap-1 flex-1 min-w-0">
																		<code class="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono font-semibold truncate">
																			{variable.key}
																		</code>
																		<span class="text-muted-foreground font-mono flex-shrink-0">=</span>
																		<Show
																			when={variable.is_secure}
																			fallback={
																				<code class="bg-muted px-2 py-1 rounded text-sm font-mono text-foreground flex-1 truncate">
																					"{variable.value}"
																				</code>
																			}
																		>
																			<code class="bg-muted px-2 py-1 rounded text-sm font-mono text-muted-foreground italic">
																				"••••••••"
																			</code>
																		</Show>
																	</div>
																</div>

																{/* Action dropdown */}
																<DropdownMenu>
																	<Tooltip>
																		<TooltipTrigger>
																			<DropdownMenuTrigger
																				as={Button}
																				variant="ghost"
																				size="sm"
																				class="h-8 w-8 p-0 opacity-60 hover:opacity-100"
																			>
																				<div class="i-mdi-dots-vertical w-4 h-4" />
																			</DropdownMenuTrigger>
																		</TooltipTrigger>
																		<TooltipContent>
																			<p>Variable Actions</p>
																		</TooltipContent>
																	</Tooltip>
																	<DropdownMenuContent class="w-48">
																		<Show when={workspace()}>
																			{(ws) => (
																				<VariableDialog
																					workspaceId={ws().id.toString()}
																					variable={variable}
																					trigger={EditVariableTrigger}
																				/>
																			)}
																		</Show>
																		<DeleteVariableDialog variable={variable} trigger={DeleteVariableTrigger} />
																	</DropdownMenuContent>
																</DropdownMenu>
															</div>

															{/* Status badges and toggle */}
															<div class="flex items-center justify-between">
																<div class="flex items-center gap-2">
																	<Show when={variable.is_secure}>
																		<Badge variant="secondary" class="text-xs px-2 py-0.5">
																			<div class="i-mdi-lock w-3 h-3 mr-1" />
																			Secure
																		</Badge>
																	</Show>
																	<Show when={!variable.enabled}>
																		<Badge variant="destructive" class="text-xs px-2 py-0.5">
																			<div class="i-mdi-pause w-3 h-3 mr-1" />
																			Disabled
																		</Badge>
																	</Show>
																	<Show when={variable.enabled && !variable.is_secure}>
																		<Badge variant="default" class="text-xs px-2 py-0.5">
																			<div class="i-mdi-check-circle w-3 h-3 mr-1" />
																			Active
																		</Badge>
																	</Show>
																	<Show when={variable.enabled && variable.is_secure}>
																		<Badge variant="default" class="text-xs px-2 py-0.5">
																			<div class="i-mdi-shield-check w-3 h-3 mr-1" />
																			Active & Secure
																		</Badge>
																	</Show>
																</div>

																<div class="flex items-center gap-2">
																	<span class="text-sm text-muted-foreground select-none">Enable</span>
																	<Switch
																		checked={variable.enabled}
																		onChange={(checked) => {
																			console.log("Switch toggled for variable", variable.id, "to", checked);
																			handleVariableToggle(variable.id, checked);
																		}}
																	>
																		<SwitchControl>
																			<SwitchThumb />
																		</SwitchControl>
																	</Switch>
																</div>
															</div>
														</div>
													</div>
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
