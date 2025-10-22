import { type Component, createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { useRunStore } from "@/store";
import { useWorkspaceStore } from "@/store/workspace";
import type { RunningAction } from "@/types/database";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

interface ActiveActionsManagerDialogProps {
	open: boolean;
	onClose: () => void;
}

interface GroupedActions {
	workspaceId: number;
	workspaceName: string;
	actions: RunningAction[];
}

function formatDuration(startedAt: string): string {
	const started = new Date(startedAt).getTime();
	const now = Date.now();
	const diffMs = now - started;

	const seconds = Math.floor(diffMs / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	if (hours > 0) {
		return `${hours}h ${minutes % 60}m`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	}
	return `${seconds}s`;
}

export const ActiveActionsManagerDialog: Component<ActiveActionsManagerDialogProps> = (props) => {
	const [state, actions] = useRunStore();
	const workspaceStore = useWorkspaceStore();
	const [, setTick] = createSignal(0);

	let intervalId: number | undefined;

	createEffect(() => {
		if (props.open) {
			actions.loadRunningActions();

			intervalId = window.setInterval(() => {
				actions.loadRunningActions();
				setTick((t) => t + 1);
			}, 5000);
		}
	});

	onCleanup(() => {
		if (intervalId) {
			window.clearInterval(intervalId);
		}
	});

	const groupedActions = (): GroupedActions[] => {
		const groups = new Map<number, GroupedActions>();

		for (const action of state.runningActions) {
			if (!groups.has(action.workspace_id)) {
				const workspace = workspaceStore.actions.getWorkspace(action.workspace_id);
				groups.set(action.workspace_id, {
					workspaceId: action.workspace_id,
					workspaceName: workspace?.name || `Workspace ${action.workspace_id}`,
					actions: [],
				});
			}
			groups.get(action.workspace_id)?.actions.push(action);
		}

		return Array.from(groups.values()).sort((a, b) => a.workspaceName.localeCompare(b.workspaceName));
	};

	const totalActionsCount = () => state.runningActions.length;

	return (
		<Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
			<DialogContent class="max-w-3xl max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Active Actions Manager</DialogTitle>
					<DialogDescription>View and manage all running actions across all workspaces</DialogDescription>
				</DialogHeader>

				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						<Badge variant="default" class="bg-blue-500">
							{totalActionsCount()} Active
						</Badge>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							actions.loadRunningActions();
							setTick((t) => t + 1);
						}}
					>
						Refresh
					</Button>
				</div>

				<div class="flex-1 overflow-y-auto space-y-4">
					<Show
						when={!state.loading && totalActionsCount() > 0}
						fallback={
							<Card class="p-8 bg-muted/30 shadow-sm">
								<Show
									when={state.loading}
									fallback={
										<div class="text-center">
											<p class="text-sm text-muted-foreground mb-2">No running actions</p>
											<p class="text-xs text-muted-foreground">All actions have completed or been stopped</p>
										</div>
									}
								>
									<p class="text-sm text-muted-foreground text-center">Loading...</p>
								</Show>
							</Card>
						}
					>
						<For each={groupedActions()}>
							{(group) => (
								<div class="space-y-2">
									<div class="flex items-center gap-2 px-2">
										<h3 class="text-sm font-semibold text-foreground">{group.workspaceName}</h3>
										<Badge variant="secondary" class="text-xs">
											{group.actions.length}
										</Badge>
									</div>
									<div class="space-y-2">
										<For each={group.actions}>
											{(action) => (
												<Card class="p-3 bg-muted/30 hover:bg-muted/50 shadow-sm hover:shadow-md transition-all">
													<div class="flex items-center justify-between gap-3">
														<div class="flex-1 min-w-0">
															<div class="flex items-center gap-2">
																<Badge variant="default" class="bg-green-500 text-xs">
																	Running
																</Badge>
																<span class="text-sm font-medium truncate">{action.action_name}</span>
															</div>
															<div class="mt-1 flex items-center gap-4 flex-wrap">
																<p class="text-xs text-muted-foreground">PID: {action.process_id}</p>
																<p class="text-xs text-muted-foreground">
																	Duration: {formatDuration(action.started_at)}
																</p>
																<p class="text-xs text-muted-foreground">
																	Started: {new Date(action.started_at).toLocaleTimeString()}
																</p>
															</div>
														</div>
														<Button variant="destructive" size="sm" onClick={() => actions.stopAction(action)}>
															Stop
														</Button>
													</div>
												</Card>
											)}
										</For>
									</div>
								</div>
							)}
						</For>
					</Show>

					<Show when={state.error}>
						<Card class="p-3 bg-destructive/10 shadow-sm">
							<p class="text-sm text-destructive">{state.error}</p>
						</Card>
					</Show>
				</div>
			</DialogContent>
		</Dialog>
	);
};
