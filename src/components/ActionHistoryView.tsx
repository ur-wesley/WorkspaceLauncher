import { type Component, createEffect, createMemo, For, Show } from "solid-js";
import { useActionStore, useRunStore } from "@/store";
import type { Run } from "@/types/database";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface ActionHistoryViewProps {
	workspaceId: number;
}

const getStatusBadge = (status: Run["status"]) => {
	switch (status) {
		case "success":
			return (
				<Badge variant="default" class="bg-green-500">
					Success
				</Badge>
			);
		case "failed":
			return <Badge variant="destructive">Failed</Badge>;
		case "cancelled":
			return (
				<Badge variant="outline" class="text-orange-500 border-orange-500">
					Cancelled
				</Badge>
			);
		default:
			return <Badge variant="secondary">{status}</Badge>;
	}
};

export const ActionHistoryView: Component<ActionHistoryViewProps> = (props) => {
	const [state, actions] = useRunStore();
	const [actionState] = useActionStore();

	createEffect(() => {
		actions.loadRuns(props.workspaceId);
	});

	const actionNameMap = createMemo(() => {
		const map = new Map<number, string>();
		for (const action of actionState.actions) {
			map.set(action.id, action.name);
		}
		return map;
	});

	const formatDuration = (start: string, end: string | null) => {
		if (!end) return "N/A";
		const startTime = new Date(start).getTime();
		const endTime = new Date(end).getTime();
		const durationMs = endTime - startTime;

		const seconds = Math.floor(durationMs / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
		}
		if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`;
		}
		return `${seconds}s`;
	};

	const formatDateTime = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	};

	return (
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-semibold">Action History</h3>
				<div class="flex gap-2">
					<Button variant="ghost" size="sm" onClick={() => actions.loadRuns(props.workspaceId)}>
						Refresh
					</Button>
					<Button variant="ghost" size="sm" onClick={() => actions.clearRuns()}>
						Clear
					</Button>
				</div>
			</div>

			<Show
				when={!state.loading && state.runs.length > 0}
				fallback={
					<Card class="p-4 bg-muted/30 shadow-sm">
						<Show
							when={state.loading}
							fallback={<p class="text-sm text-muted-foreground text-center">No action history</p>}
						>
							<p class="text-sm text-muted-foreground text-center">Loading...</p>
						</Show>
					</Card>
				}
			>
				<div class="space-y-2">
					<For each={state.runs}>
						{(run) => {
							const actionName = actionNameMap().get(run.action_id) || `Action #${run.action_id}`;
							const duration = formatDuration(run.started_at, run.completed_at);

							return (
								<Card class="p-3 bg-muted/30 shadow-sm hover:bg-muted/40 transition-colors">
									<div class="flex items-start justify-between gap-3">
										<div class="flex-1 min-w-0 space-y-2">
											{/* Header with status badge and action name */}
											<div class="flex items-center gap-2">
												{getStatusBadge(run.status)}
												<span class="text-sm font-semibold truncate">{actionName}</span>
											</div>

											{/* Timing Information */}
											<div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
												<div>
													<span class="text-muted-foreground">Started:</span>
													<div class="font-medium">{formatDateTime(run.started_at)}</div>
												</div>
												<div>
													<span class="text-muted-foreground">Duration:</span>
													<div class="font-medium">{duration}</div>
												</div>
												<Show when={run.completed_at}>
													<div>
														<span class="text-muted-foreground">Completed:</span>
														<div class="font-medium">{run.completed_at && formatDateTime(run.completed_at)}</div>
													</div>
												</Show>
												<Show when={run.exit_code !== null}>
													<div>
														<span class="text-muted-foreground">Exit Code:</span>
														<div class="font-medium">{run.exit_code}</div>
													</div>
												</Show>
											</div>

											{/* Error Message */}
											<Show when={run.error_message}>
												<div class="mt-2 p-2 bg-destructive/10 rounded-md border border-destructive/20">
													<div class="text-xs font-medium text-destructive mb-1">Error:</div>
													<div class="text-xs text-destructive/90 break-words">{run.error_message}</div>
												</div>
											</Show>

											{/* Reason/Status Description */}
											<Show when={run.status === "cancelled"}>
												<div class="text-xs text-muted-foreground italic">Action was manually stopped by user</div>
											</Show>
										</div>
									</div>
								</Card>
							);
						}}
					</For>
				</div>
			</Show>

			<Show when={state.error}>
				<Card class="p-3 bg-destructive/10 shadow-sm">
					<p class="text-sm text-destructive">{state.error}</p>
				</Card>
			</Show>

			{/* Info about 20-entry limit */}
			<Show when={state.runs.length > 0}>
				<div class="text-xs text-muted-foreground text-center pt-2">Showing up to 20 most recent runs per action</div>
			</Show>
		</div>
	);
};
