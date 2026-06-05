import { A, useLocation } from "@solidjs/router";
import type { Component } from "solid-js";
import {
	createMemo,
	createSignal,
	For,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import { Button } from "@/components/ui/button";
import { TextField, TextFieldRoot } from "@/components/ui/textfield";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { WorkspaceCreateDialog } from "@/components/WorkspaceCreateDialog";
import { cn } from "@/libs/cn";
import { hotkeyTitle } from "@/libs/hotkeys";
import { launchWorkspace } from "@/libs/launcher";
import { showToast } from "@/libs/toast";
import { runningActionsService } from "@/services/runningActions";
import { useActionStore } from "@/store/action";
import { useUI } from "@/store/ui";
import { useVariableStore } from "@/store/variable";
import { useWorkspaceStore } from "@/store/workspace";
import type { NewWorkspace } from "@/types/database";

interface SidebarProps {
	collapsed?: boolean;
}

export const Sidebar: Component<SidebarProps> = (props) => {
	const location = useLocation();
	const { store, actions } = useWorkspaceStore();
	const ui = useUI();
	const [, actionStoreActions] = useActionStore() ?? [null, null];
	const [, variableStoreActions] = useVariableStore() ?? [null, null];
	const actionStore = useActionStore()?.[0] ?? { actions: [] };
	const variableStore = useVariableStore()?.[0] ?? { variables: [] };
	const [runningWorkspaceIds, setRunningWorkspaceIds] = createSignal<
		Set<number>
	>(new Set());
	const [launchingWorkspaceId, setLaunchingWorkspaceId] = createSignal<
		number | null
	>(null);
	const [searchQuery, setSearchQuery] = createSignal("");
	const [showSearch, setShowSearch] = createSignal(false);
	const [createDialogOpen, setCreateDialogOpen] = createSignal(false);
	const [totalRunningActions, setTotalRunningActions] = createSignal(0);

	const toggleSearch = () => {
		if (showSearch()) {
			setSearchQuery("");
			setShowSearch(false);
		} else {
			setShowSearch(true);
		}
	};

	const handleCreateWorkspace = async (workspace: NewWorkspace) => {
		const result = await actions.createWorkspace(workspace);
		if (result) {
			setCreateDialogOpen(false);
			showToast({
				title: "Success",
				description: `Workspace "${workspace.name}" created successfully`,
			});
		}
	};

	const fuzzyMatch = (text: string, query: string): boolean => {
		if (!query) return true;
		const lowerText = text.toLowerCase();
		const lowerQuery = query.toLowerCase();
		let queryIndex = 0;
		for (
			let i = 0;
			i < lowerText.length && queryIndex < lowerQuery.length;
			i++
		) {
			if (lowerText[i] === lowerQuery[queryIndex]) {
				queryIndex++;
			}
		}
		return queryIndex === lowerQuery.length;
	};

	const updateRunningWorkspaces = () => {
		const running = runningActionsService.getAll();
		const workspaceIds = new Set(running.map((action) => action.workspace_id));
		setRunningWorkspaceIds(workspaceIds);
		setTotalRunningActions(running.length);
	};

	onMount(() => {
		actions.loadWorkspaces();

		updateRunningWorkspaces();

		const interval = setInterval(updateRunningWorkspaces, 1000);

		const handleRunningActionsChange = () => {
			updateRunningWorkspaces();
		};

		window.addEventListener(
			"running-actions-changed",
			handleRunningActionsChange,
		);

		onCleanup(() => {
			clearInterval(interval);
			window.removeEventListener(
				"running-actions-changed",
				handleRunningActionsChange,
			);
		});
	});

	const sortedWorkspaces = createMemo(() => {
		const query = searchQuery();
		const filtered = store.workspaces.filter((workspace) =>
			fuzzyMatch(workspace.name, query),
		);

		return filtered.sort((a, b) => {
			const aIsPinned = store.pinnedWorkspaceIds.has(a.id);
			const bIsPinned = store.pinnedWorkspaceIds.has(b.id);

			if (aIsPinned && !bIsPinned) return -1;
			if (!aIsPinned && bIsPinned) return 1;

			return a.name.localeCompare(b.name);
		});
	});

	const isActive = (path: string) => {
		if (path === "/") {
			return location.pathname === "/";
		}
		return location.pathname.startsWith(path);
	};

	const isWorkspaceActive = (workspaceId: number) => {
		return location.pathname.startsWith(`/w/${workspaceId}`);
	};

	return (
		<div
			class={cn(
				"flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-elevated-1 transition-all duration-200",
				props.collapsed ? "w-0" : "w-64",
			)}
		>
			<div class="flex-1 flex flex-col min-h-0">
				<div class="flex-1 p-2 overflow-hidden flex flex-col">
					<div class="flex items-center justify-between px-2 py-1 mb-2">
						<div class="flex items-center gap-2">
							<div class="i-mdi-folder-multiple w-4 h-4 text-muted-foreground" />
							<span class="text-sm font-medium text-muted-foreground">
								Workspaces
							</span>
						</div>
						<div class="flex items-center gap-1">
							<Button
								size="sm"
								variant="ghost"
								class="h-6 w-6 p-0"
								onclick={toggleSearch}
								title="Search workspaces"
							>
								<div class="w-3 h-3 i-mdi-magnify" />
							</Button>
							<Button
								size="sm"
								variant="ghost"
								class="h-6 w-6 p-0"
								onclick={() => setCreateDialogOpen(true)}
								title={hotkeyTitle("Create new workspace", "createWorkspace")}
							>
								<div class="w-3 h-3 i-mdi-plus" />
							</Button>
						</div>
					</div>

					<Show when={showSearch()}>
						<div class="px-2 mb-2">
							<TextFieldRoot>
								<TextField
									placeholder="Search workspaces..."
									value={searchQuery()}
									onInput={(e) => setSearchQuery(e.currentTarget.value)}
									class="h-8 text-xs"
								/>
							</TextFieldRoot>
						</div>
					</Show>

					<div class="space-y-1 overflow-y-auto flex-1">
						<For each={sortedWorkspaces()}>
							{(workspace) => {
								const hasRunningActions = () =>
									runningWorkspaceIds().has(workspace.id);
								const isPinned = () =>
									store.pinnedWorkspaceIds.has(workspace.id);
								const isLaunching = () =>
									launchingWorkspaceId() === workspace.id;

								const handleRunWorkspace = async (e: MouseEvent) => {
									e.preventDefault();
									e.stopPropagation();

									if (isLaunching()) return;

									try {
										setLaunchingWorkspaceId(workspace.id);

										await actionStoreActions.loadActions(workspace.id);
										await variableStoreActions.loadVariables(workspace.id);

										const variables = variableStore.variables.reduce(
											(acc, variable) => {
												if (variable.enabled) {
													acc[variable.key] = variable.value;
												}
												return acc;
											},
											{} as Record<string, string>,
										);

										const context = {
											workspaceId: workspace.id,
											variables,
										};

										await launchWorkspace(actionStore.actions, context);

										updateRunningWorkspaces();

										showToast({
											title: "Success",
											description: `Workspace "${workspace.name}" launched successfully`,
										});
									} catch (error) {
										console.error("Failed to launch workspace:", error);
										showToast({
											title: "Error",
											description: `Failed to launch workspace: ${error}`,
											variant: "destructive",
										});
									} finally {
										setLaunchingWorkspaceId(null);
									}
								};

								return (
									<div
										class={cn(
											"group flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors",
											"hover:bg-accent hover:text-accent-foreground",
											isWorkspaceActive(workspace.id)
												? "bg-accent text-accent-foreground"
												: "bg-background text-muted-foreground",
										)}
									>
										<div class="flex items-center gap-1.5 flex-1 min-w-0">
											<Button
												size="icon"
												variant="ghost"
												class={cn(
													"h-6 w-6 flex-shrink-0 rounded-full transition-colors",
													"bg-elevated-2 text-muted-foreground",
													"group-hover:bg-accent group-hover:text-accent-foreground",
													isWorkspaceActive(workspace.id) &&
														"bg-accent text-accent-foreground",
												)}
												onclick={handleRunWorkspace}
												disabled={isLaunching()}
												title={
													hasRunningActions()
														? "Stop running actions"
														: "Run all actions"
												}
											>
												<Show
													when={hasRunningActions()}
													fallback={
														<div class="i-mdi-play w-4 h-4 text-green-600" />
													}
												>
													<div class="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
												</Show>
											</Button>

											<A
												href={`/w/${workspace.id}`}
												class="flex items-center gap-1.5 flex-1 min-w-0"
											>
												<span
													class={cn(
														"iconify w-5 h-5 flex-shrink-0",
														!workspace.icon && "text-muted-foreground",
													)}
													data-icon={`mdi:${(workspace.icon ?? "folder").replace(/^i-mdi-/, "")}`}
												/>
												<span class="truncate">{workspace.name}</span>
											</A>
										</div>

										<Button
											size="icon"
											variant="ghost"
											class={cn(
												"h-6 w-6 rounded-full transition-colors",
												isPinned()
													? "opacity-100 bg-elevated-2 text-primary"
													: "opacity-0 bg-elevated-2 text-muted-foreground group-hover:opacity-100 group-hover:bg-accent group-hover:text-accent-foreground",
											)}
											onclick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												actions.togglePinWorkspace(workspace.id);
											}}
											title={isPinned() ? "Unpin workspace" : "Pin workspace"}
										>
											<div
												class={cn(
													"w-3 h-3",
													isPinned() ? "i-mdi-pin" : "i-mdi-pin-outline",
												)}
											/>
										</Button>
									</div>
								);
							}}
						</For>

						{store.workspaces.length === 0 && !store.loading && (
							<div class="text-xs text-muted-foreground p-2 text-center">
								No workspaces yet
							</div>
						)}

						{store.loading && (
							<div class="text-xs text-muted-foreground p-2 text-center">
								Loading...
							</div>
						)}
					</div>
				</div>
			</div>

			<div class="space-y-1 border-t border-border bg-elevated-2 p-2">
				<Tooltip>
					<TooltipTrigger
						as={Button}
						variant="ghost"
						class={cn(
							"w-full justify-start gap-3 px-3 py-2 text-sm font-medium",
							"hover:bg-accent hover:text-accent-foreground text-muted-foreground",
						)}
						onclick={() => ui.actions.openActiveActionsManager()}
					>
						<div class="i-mdi-application-cog w-5 h-5 flex-shrink-0" />
						<span class="flex-1 text-left">Active Actions</span>
						<Show when={totalRunningActions() > 0}>
							<span class="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-5 text-center">
								{totalRunningActions()}
							</span>
						</Show>
					</TooltipTrigger>
					<TooltipContent>
						{hotkeyTitle("Active Actions", "openActiveActionsManager")}
					</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger
						as={A}
						href="/settings"
						class={cn(
							"flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
							"hover:bg-accent hover:text-accent-foreground",
							isActive("/settings")
								? "bg-accent text-accent-foreground"
								: "text-muted-foreground",
						)}
					>
						<div class="i-mdi-cog w-5 h-5 flex-shrink-0" />
						<span class="flex-1">Settings</span>
					</TooltipTrigger>
					<TooltipContent>
						{hotkeyTitle("Settings", "navigateSettings")}
					</TooltipContent>
				</Tooltip>
			</div>

			<WorkspaceCreateDialog
				open={createDialogOpen()}
				onClose={() => setCreateDialogOpen(false)}
				onSubmit={handleCreateWorkspace}
			/>
		</div>
	);
};
