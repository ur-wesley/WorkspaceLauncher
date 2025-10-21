import { A, useLocation } from "@solidjs/router";
import type { Component } from "solid-js";
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import { Image, ImageFallback, ImageRoot } from "@/components/ui/image.tsx";
import { TextField, TextFieldRoot } from "@/components/ui/textfield";
import { WorkspaceCreateDialog } from "@/components/WorkspaceCreateDialog";
import { cn } from "@/libs/cn";
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
	onToggle?: () => void;
}

export const Sidebar: Component<SidebarProps> = (props) => {
	const location = useLocation();
	const { store, actions } = useWorkspaceStore();
	const ui = useUI();
	const [, actionStoreActions] = useActionStore() ?? [null, null];
	const [, variableStoreActions] = useVariableStore() ?? [null, null];
	const actionStore = useActionStore()?.[0] ?? { actions: [] };
	const variableStore = useVariableStore()?.[0] ?? { variables: [] };
	const [runningWorkspaceIds, setRunningWorkspaceIds] = createSignal<Set<number>>(new Set());
	const [launchingWorkspaceId, setLaunchingWorkspaceId] = createSignal<number | null>(null);
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
		for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
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

		window.addEventListener("running-actions-changed", handleRunningActionsChange);

		onCleanup(() => {
			clearInterval(interval);
			window.removeEventListener("running-actions-changed", handleRunningActionsChange);
		});
	});

	const sortedWorkspaces = createMemo(() => {
		const query = searchQuery();
		const filtered = store.workspaces.filter((workspace) => fuzzyMatch(workspace.name, query));

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
				"flex flex-col h-full bg-card shadow-md transition-all duration-200",
				props.collapsed ? "w-16" : "w-64",
			)}
		>
			<div class="bg-muted/30 shadow-sm">
				<A href="/" class="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
					<ImageRoot>
						<Image src="/icon.png" />
						<ImageFallback>WSL</ImageFallback>
					</ImageRoot>
					<div class={cn("transition-opacity duration-200", props.collapsed ? "opacity-0 hidden" : "opacity-100")}>
						<h1 class="text-lg font-semibold">Workspace Launcher</h1>
					</div>
				</A>
			</div>

			<div class="flex-1 flex flex-col min-h-0">
				<div class={cn("flex-1 p-2 overflow-hidden flex flex-col")}>
					<Show when={!props.collapsed}>
						<div class="flex items-center justify-between px-2 py-1 mb-2">
							<div class="flex items-center gap-2">
								<div class="i-mdi-folder-multiple w-4 h-4 text-muted-foreground" />
								<span class="text-sm font-medium text-muted-foreground">Workspaces</span>
							</div>
							<div class="flex items-center gap-1">
								<Button size="sm" variant="ghost" class="h-6 w-6 p-0" onclick={toggleSearch} title="Search workspaces">
									<div class="w-3 h-3 i-mdi-magnify" />
								</Button>
								<Button
									size="sm"
									variant="ghost"
									class="h-6 w-6 p-0"
									onclick={() => setCreateDialogOpen(true)}
									title="Create new workspace"
								>
									<div class="w-3 h-3 i-mdi-plus" />
								</Button>
							</div>
						</div>
					</Show>

					<Show when={showSearch() && !props.collapsed}>
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
								const hasRunningActions = () => runningWorkspaceIds().has(workspace.id);
								const isPinned = () => store.pinnedWorkspaceIds.has(workspace.id);
								const isLaunching = () => launchingWorkspaceId() === workspace.id;

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
									<div class="relative group">
										<A
											href={`/w/${workspace.id}`}
											class={cn(
												"flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors w-full",
												"hover:bg-accent hover:text-accent-foreground",
												isWorkspaceActive(workspace.id) ? "bg-accent text-accent-foreground" : "text-muted-foreground",
												props.collapsed && "justify-center px-0 py-2",
											)}
											title={props.collapsed ? workspace.name : undefined}
										>
											<div
												class={cn(
													"w-2 h-2 flex-shrink-0 transition-opacity duration-200",
													props.collapsed ? "opacity-0 hidden" : "opacity-100",
													hasRunningActions() && "rounded-full bg-green-500 animate-pulse",
												)}
												title={hasRunningActions() ? "Has running actions" : undefined}
											/>

											<Show
												when={workspace.icon}
												fallback={<span class="iconify w-5 h-5 flex-shrink-0" data-icon="mdi:folder" />}
											>
												<span
													class={cn("iconify flex-shrink-0", props.collapsed ? "w-5 h-5" : "w-4 h-4")}
													data-icon={`mdi:${workspace.icon?.replace(/^i-mdi-/, "")}`}
												/>
											</Show>

											<div
												class={cn(
													"absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500 animate-pulse transition-opacity duration-200",
													props.collapsed && hasRunningActions() ? "opacity-100" : "opacity-0 hidden",
												)}
											/>

											<span
												class={cn(
													"truncate flex-1 transition-opacity duration-200",
													props.collapsed ? "opacity-0 hidden" : "opacity-100",
												)}
											>
												{workspace.name}
											</span>

											<div
												class={cn(
													"w-14 flex-shrink-0 transition-opacity duration-200",
													props.collapsed ? "opacity-0 hidden" : "opacity-100",
												)}
											/>
										</A>

										<div
											class={cn(
												"absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-opacity",
												props.collapsed ? "opacity-0 hidden" : "opacity-0 group-hover:opacity-100",
											)}
										>
											<Button
												size="sm"
												variant="ghost"
												class="h-6 w-6 p-0"
												onclick={handleRunWorkspace}
												disabled={isLaunching()}
												title="Run all actions"
											>
												<div
													class={cn(
														"w-3 h-3",
														isLaunching() ? "i-mdi-loading animate-spin" : "i-mdi-play text-green-600",
													)}
												/>
											</Button>

											<Button
												size="sm"
												variant="ghost"
												class="h-6 w-6 p-0"
												onclick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													actions.togglePinWorkspace(workspace.id);
												}}
												title={isPinned() ? "Unpin workspace" : "Pin workspace"}
											>
												<div class={cn("w-3 h-3", isPinned() ? "i-mdi-pin text-primary" : "i-mdi-pin-outline")} />
											</Button>
										</div>

										<Show when={isPinned()}>
											<div
												class={cn(
													"absolute right-7 top-1/2 -translate-y-1/2 transition-opacity pointer-events-none",
													props.collapsed ? "opacity-0 hidden" : "opacity-100 group-hover:opacity-0",
												)}
											>
												<div class="i-mdi-pin w-3 h-3 text-primary" />
											</div>
										</Show>

										<div
											class={cn(
												"absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-primary transition-opacity duration-200",
												props.collapsed && isPinned() ? "opacity-100" : "opacity-0 hidden",
											)}
										/>
									</div>
								);
							}}
						</For>

						{store.workspaces.length === 0 && !store.loading && (
							<div class="text-xs text-muted-foreground px-2 py-4 text-center">No workspaces yet</div>
						)}

						{store.loading && <div class="text-xs text-muted-foreground px-2 py-4 text-center">Loading...</div>}
					</div>
				</div>
			</div>

			<div class="p-2 border-t border-border space-y-1">
				<Button
					variant="ghost"
					class={cn(
						"w-full justify-start gap-3 px-3 py-2 text-sm font-medium",
						"hover:bg-accent hover:text-accent-foreground text-muted-foreground",
					)}
					onclick={() => ui.actions.openActiveActionsManager()}
				>
					<div class="i-mdi-application-cog w-5 h-5 flex-shrink-0" />
					<span
						class={cn(
							"transition-opacity duration-200 flex-1 text-left",
							props.collapsed ? "opacity-0 hidden" : "opacity-100",
						)}
					>
						Active Actions
					</span>
					<Show when={!props.collapsed && totalRunningActions() > 0}>
						<span class="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-5 text-center">
							{totalRunningActions()}
						</span>
					</Show>
				</Button>

				<A
					href="/settings"
					class={cn(
						"flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
						"hover:bg-accent hover:text-accent-foreground",
						isActive("/settings") ? "bg-accent text-accent-foreground" : "text-muted-foreground",
					)}
				>
					<div class="i-mdi-cog w-5 h-5 flex-shrink-0" />
					<span class={cn("transition-opacity duration-200", props.collapsed ? "opacity-0 hidden" : "opacity-100")}>
						Settings
					</span>
				</A>

				<Button variant="ghost" size="sm" class="w-full justify-start gap-3" onclick={props.onToggle}>
					<div
						class={cn("w-5 h-5 transition-transform", props.collapsed ? "i-mdi-chevron-right" : "i-mdi-chevron-left")}
					/>
					<span class={cn("transition-opacity duration-200", props.collapsed ? "opacity-0 hidden" : "opacity-100")}>
						Collapse
					</span>
				</Button>
			</div>

			<WorkspaceCreateDialog
				open={createDialogOpen()}
				onClose={() => setCreateDialogOpen(false)}
				onSubmit={handleCreateWorkspace}
			/>
		</div>
	);
};
