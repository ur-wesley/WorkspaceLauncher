import { makeTimer } from "@solid-primitives/timer";
import {
	type Component,
	createEffect,
	createSignal,
	For,
	onCleanup,
	Show,
} from "solid-js";
import { useRunStore } from "@/store";
import { useWorkspaceStore } from "@/store/workspace";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./ui/table";

interface ActiveActionsManagerDialogProps {
	open: boolean;
	onClose: () => void;
}

function formatDuration(startedAt: string, now: number): string {
	const started = new Date(startedAt).getTime();
	const diffMs = Math.max(0, now - started);

	const seconds = Math.floor(diffMs / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	if (hours > 0) {
		return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	}
	return `${seconds}s`;
}

export const ActiveActionsManagerDialog: Component<
	ActiveActionsManagerDialogProps
> = (props) => {
	const [state, actions] = useRunStore();
	const workspaceStore = useWorkspaceStore();
	const [now, setNow] = createSignal(Date.now());

	const clearTimer = makeTimer(() => setNow(Date.now()), 1000, setInterval);

	onCleanup(() => clearTimer());

	let refreshInterval: number | undefined;

	createEffect(() => {
		if (props.open) {
			void actions.reconcileAndRefresh();
			setNow(Date.now());

			refreshInterval = window.setInterval(() => {
				void actions.reconcileAndRefresh();
			}, 3000);
		} else if (refreshInterval) {
			window.clearInterval(refreshInterval);
		}
	});

	onCleanup(() => {
		if (refreshInterval) {
			window.clearInterval(refreshInterval);
		}
	});

	const getWorkspaceName = (id: number) => {
		const workspace = workspaceStore.actions.getWorkspace(id);
		return workspace?.name || `Workspace ${id}`;
	};

	const totalActionsCount = () => state.runningActions.length;

	return (
		<Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
			<DialogContent class="max-w-4xl max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Active Actions Manager</DialogTitle>
					<DialogDescription>
						View and manage all running actions across all workspaces
					</DialogDescription>
				</DialogHeader>

				<div class="mb-4 flex items-center justify-between px-4">
					<div class="flex items-center gap-2">
						<Badge variant="default" class="bg-blue-500">
							{totalActionsCount()} Active
						</Badge>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							void actions.reconcileAndRefresh();
						}}
					>
						Refresh
					</Button>
				</div>

				<div class="mx-4 mb-4 flex-1 overflow-y-auto rounded-md bg-elevated-2">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Action</TableHead>
								<TableHead>Workspace</TableHead>
								<TableHead>PID</TableHead>
								<TableHead>Duration</TableHead>
								<TableHead>Started At</TableHead>
								<TableHead class="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<Show
								when={!state.loading && totalActionsCount() > 0}
								fallback={
									<TableRow>
										<TableCell colSpan={7} class="h-24 text-center">
											<Show
												when={state.loading}
												fallback={
													<div class="flex flex-col items-center justify-center text-muted-foreground">
														<p>No running actions</p>
														<p class="text-xs">
															All actions have completed or been stopped
														</p>
													</div>
												}
											>
												Loading...
											</Show>
										</TableCell>
									</TableRow>
								}
							>
								<For each={state.runningActions}>
									{(action) => (
										<TableRow>
											<TableCell class="font-medium">
												{action.action_name}
											</TableCell>
											<TableCell class="text-muted-foreground">
												{getWorkspaceName(action.workspace_id)}
											</TableCell>
											<TableCell class="font-mono text-xs">
												{action.process_id}
												<Show when={action.status === "unreachable"}>
													<span class="ml-1 text-amber-600 text-[10px]">
														(unreachable)
													</span>
												</Show>
											</TableCell>
											<TableCell class="font-mono tabular-nums">
												{formatDuration(action.started_at, now())}
											</TableCell>
											<TableCell class="text-muted-foreground text-xs">
												{new Date(action.started_at).toLocaleTimeString()}
											</TableCell>
											<TableCell class="text-right">
												<div class="flex justify-end gap-1">
													<Button
														variant="destructive"
														size="sm"
														class="h-7 px-2"
														onClick={() => actions.stopAction(action)}
													>
														Stop
													</Button>
													<Show
														when={
															action.status === "unreachable" ||
															action.status === "exited"
														}
													>
														<Button
															variant="outline"
															size="sm"
															class="h-7 px-2"
															onClick={() => actions.dismissAction(action)}
														>
															Dismiss
														</Button>
													</Show>
												</div>
											</TableCell>
										</TableRow>
									)}
								</For>
							</Show>
						</TableBody>
					</Table>
				</div>
			</DialogContent>
		</Dialog>
	);
};
