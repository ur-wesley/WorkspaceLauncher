import type { Component, JSX } from "solid-js";
import { createSignal, For, Show } from "solid-js";
import { listRunsByAction } from "@/libs/api";
import type { Run } from "@/types/database";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./ui/dialog";

interface ActionRunHistoryProps {
	workspaceId: number;
	actionId: number;
	actionName: string;
	trigger?: JSX.Element;
	onClose?: () => void;
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

export const ActionRunHistory: Component<ActionRunHistoryProps> = (props) => {
	const [runs, setRuns] = createSignal<Run[]>([]);
	const [loading, setLoading] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const loadRuns = async () => {
		setLoading(true);
		setError(null);
		try {
			const result = await listRunsByAction(
				props.workspaceId,
				props.actionId,
				20,
			);
			if (result.isOk()) {
				setRuns(result.value);
			} else {
				setError(result.error);
			}
		} catch (err) {
			setError(`Failed to load runs: ${err}`);
		} finally {
			setLoading(false);
		}
	};

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
		<Dialog
			onOpenChange={(open) => {
				if (!open) {
					props.onClose?.();
				}
			}}
		>
			<Show
				when={props.trigger}
				fallback={
					<DialogTrigger
						as={(triggerProps: object) => (
							<button
								type="button"
								{...triggerProps}
								onClick={() => loadRuns()}
								class="text-xs text-muted-foreground hover:text-foreground transition-colors"
							>
								View History
							</button>
						)}
					/>
				}
			>
				<DialogTrigger onClick={() => loadRuns()}>
					{props.trigger}
				</DialogTrigger>
			</Show>
			<DialogContent class="max-w-3xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Run History: {props.actionName}</DialogTitle>
					<DialogDescription>
						Last 20 executions of this action
					</DialogDescription>
				</DialogHeader>

				<Show
					when={!loading() && runs().length > 0}
					fallback={
						<div class="p-4 text-center">
							<Show
								when={loading()}
								fallback={
									<p class="text-sm text-muted-foreground">No run history</p>
								}
							>
								<p class="text-sm text-muted-foreground">Loading...</p>
							</Show>
						</div>
					}
				>
					<div class="space-y-2">
						<For each={runs()}>
							{(run) => {
								const duration = formatDuration(
									run.started_at,
									run.completed_at,
								);

								return (
									<Card class="p-3 bg-muted/20">
										<div class="space-y-2">
											<div class="flex items-center gap-2">
												{getStatusBadge(run.status)}
												<span class="text-xs text-muted-foreground">
													{formatDateTime(run.started_at)}
												</span>
											</div>

											<div class="grid grid-cols-3 gap-2 text-xs">
												<div>
													<span class="text-muted-foreground">Duration:</span>
													<div class="font-medium">{duration}</div>
												</div>
												<Show when={run.completed_at}>
													<div>
														<span class="text-muted-foreground">
															Completed:
														</span>
														<div class="font-medium">
															{run.completed_at &&
																formatDateTime(run.completed_at)}
														</div>
													</div>
												</Show>
												<Show when={run.exit_code !== null}>
													<div>
														<span class="text-muted-foreground">
															Exit Code:
														</span>
														<div class="font-medium">{run.exit_code}</div>
													</div>
												</Show>
											</div>

											<Show when={run.error_message}>
												<div class="p-2 bg-destructive/10 rounded border border-destructive/20">
													<div class="text-xs font-medium text-destructive mb-1">
														Error:
													</div>
													<div class="text-xs text-destructive/90 break-words">
														{run.error_message}
													</div>
												</div>
											</Show>

											<Show when={run.status === "cancelled"}>
												<div class="text-xs text-muted-foreground italic">
													Manually stopped by user
												</div>
											</Show>
										</div>
									</Card>
								);
							}}
						</For>
					</div>
				</Show>

				<Show when={error()}>
					<Card class="p-3 bg-destructive/10">
						<p class="text-sm text-destructive">{error()}</p>
					</Card>
				</Show>
			</DialogContent>
		</Dialog>
	);
};
