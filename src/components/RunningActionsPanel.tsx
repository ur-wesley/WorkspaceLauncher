import { type Component, createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { useRunStore } from "@/store";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface RunningActionsPanelProps {
	workspaceId?: number;
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

export const RunningActionsPanel: Component<RunningActionsPanelProps> = (props) => {
	const [state, actions] = useRunStore();
	const [, setTick] = createSignal(0);

	let intervalId: number | undefined;

	createEffect(() => {
		if (props.workspaceId) {
			actions.loadRunningActions(props.workspaceId);
		} else {
			actions.loadRunningActions();
		}

		intervalId = window.setInterval(() => {
			if (props.workspaceId) {
				actions.loadRunningActions(props.workspaceId);
			} else {
				actions.loadRunningActions();
			}
			setTick((t) => t + 1);
		}, 5000);
	});

	onCleanup(() => {
		if (intervalId) {
			window.clearInterval(intervalId);
		}
	});

	return (
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-semibold">Running Actions</h3>
				<Button variant="ghost" size="sm" onClick={() => actions.loadRunningActions(props.workspaceId)}>
					Refresh
				</Button>
			</div>

			<Show
				when={!state.loading && state.runningActions.length > 0}
				fallback={
					<Card class="p-4 bg-muted/30 shadow-sm">
						<Show
							when={state.loading}
							fallback={<p class="text-sm text-muted-foreground text-center">No running actions</p>}
						>
							<p class="text-sm text-muted-foreground text-center">Loading...</p>
						</Show>
					</Card>
				}
			>
				<div class="space-y-2">
					<For each={state.runningActions}>
						{(action) => (
							<Card class="p-3 bg-muted/30 hover:bg-muted/50 shadow-sm hover:shadow-md transition-all">
								<div class="flex items-center justify-between gap-3">
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<Badge variant="default" class="bg-blue-500">
												Running
											</Badge>
											<span class="text-sm font-medium truncate">{action.action_name}</span>
										</div>
										<div class="mt-1 space-y-0.5">
											<p class="text-xs text-muted-foreground">PID: {action.process_id}</p>
											<p class="text-xs text-muted-foreground">Duration: {formatDuration(action.started_at)}</p>
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
			</Show>

			<Show when={state.error}>
				<Card class="p-3 bg-destructive/10 shadow-sm">
					<p class="text-sm text-destructive">{state.error}</p>
				</Card>
			</Show>
		</div>
	);
};
