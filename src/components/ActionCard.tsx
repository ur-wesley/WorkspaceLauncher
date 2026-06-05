import { openPath } from "@tauri-apps/plugin-opener";
import type { Component } from "solid-js";
import { createMemo, createSignal, Show } from "solid-js";
import { ActionRunHistory } from "@/components/ActionRunHistory";
import { ActionDialogStepper as ActionDialog } from "@/components/action/ActionDialogStepper";
import { DeleteActionDialog } from "@/components/DeleteActionDialog";
import { LogViewer } from "@/components/LogViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	DeleteActionTrigger,
	EditActionTrigger,
} from "@/components/WorkspaceDetailTriggers";
import { cn } from "@/libs/cn";
import type { Action } from "@/models/action.model";
import { parseActionConfig } from "@/pages/WorkspaceDetailPage.helpers";
import { useRunStore } from "@/store/run";

interface ActionCardProps {
	readonly action: Action;
	readonly workspaceId: number;
	readonly isRunning: boolean;
	readonly onLaunch: (action: Action) => Promise<void>;
}

export const ActionCard: Component<ActionCardProps> = (props) => {
	const config = () => parseActionConfig(props.action.config);

	const workingDir = createMemo(() => {
		try {
			const parsed = JSON.parse(props.action.config) as Record<string, unknown>;
			return (parsed.working_directory as string | undefined) || null;
		} catch {
			return null;
		}
	});

	const workingDirLabel = createMemo(() => {
		const dir = workingDir();
		if (!dir) return null;
		const parts = dir.replace(/\\/g, "/").split("/").filter(Boolean);
		return parts[parts.length - 1] ?? dir;
	});
	const [state] = useRunStore();
	const [showLogs, setShowLogs] = createSignal(false);
	const [isLaunching, setIsLaunching] = createSignal(false);
	const [showEditDialog, setShowEditDialog] = createSignal(false);
	let isClosingDialog = false;

	const handleDialogClose = (setter: (value: boolean) => void) => {
		isClosingDialog = true;
		setter(false);
		setTimeout(() => {
			isClosingDialog = false;
		}, 100);
	};

	const runningAction = () =>
		state.runningActions.find((a) => a.action_id === props.action.id);

	const handleLaunch = async () => {
		setIsLaunching(true);
		try {
			await props.onLaunch(props.action);
		} finally {
			setIsLaunching(false);
		}
	};

	const handleCardClick = (e: MouseEvent) => {
		if (isClosingDialog) {
			return;
		}
		const target = e.target as HTMLElement;
		const currentTarget = e.currentTarget as HTMLElement;

		const closestButton = target.closest("[role='button']");
		if (closestButton && closestButton !== currentTarget) {
			return;
		}

		if (
			target.closest("button") ||
			target.closest("a") ||
			target.closest("[role='menuitem']") ||
			target.closest("input") ||
			target.closest("textarea") ||
			target.closest("[role='dialog']")
		) {
			return;
		}
		setShowEditDialog(true);
	};

	return (
		<div
			class={cn(
				"group rounded-md transition-all duration-200",
				"bg-elevated-2 hover:bg-elevated-3",
				"shadow-sm hover:shadow-md",
			)}
		>
			<div class="p-3">
				<div class="flex items-center justify-between gap-2 mb-2">
					{/* biome-ignore lint/a11y/useSemanticElements: Cannot use button because it would nest inside interactive children */}
					<div
						role="button"
						tabIndex={0}
						class="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
						onClick={handleCardClick}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								handleCardClick(e as unknown as MouseEvent);
							}
						}}
					>
						<div class="flex items-center justify-center w-7 h-7 rounded bg-primary text-primary-foreground font-bold text-xs shrink-0">
							{props.action.order_index + 1}
						</div>
						<h4 class="font-semibold text-sm truncate">{props.action.name}</h4>
						<Show when={props.isRunning}>
							<div class="i-mdi-circle w-2 h-2 text-green-500 animate-pulse shrink-0" />
						</Show>
					</div>

					<div class="flex items-center gap-1 shrink-0">
						<ActionRunHistory
							workspaceId={props.workspaceId}
							actionId={props.action.id}
							actionName={props.action.name}
							onClose={() => {
								isClosingDialog = true;
								setTimeout(() => {
									isClosingDialog = false;
								}, 100);
							}}
							trigger={
								<Button variant="ghost" size="icon" class="h-7 w-7">
									<div class="i-mdi-history w-4 h-4" />
								</Button>
							}
						/>

						<Show when={props.isRunning && runningAction()?.run_id}>
							<Button
								variant="ghost"
								size="icon"
								class="h-7 w-7 text-muted-foreground hover:text-foreground"
								onClick={() => setShowLogs(true)}
								title="View Logs"
							>
								<div class="i-mdi-console w-4 h-4" />
							</Button>
						</Show>
						<Button
							variant={props.isRunning ? "destructive" : "default"}
							onClick={handleLaunch}
							disabled={isLaunching()}
							class="h-7 px-2 gap-1 shrink-0"
						>
							<Show
								when={!isLaunching()}
								fallback={
									<div class="i-mdi-loading w-3.5 h-3.5 animate-spin" />
								}
							>
								<Show
									when={props.isRunning}
									fallback={<div class="i-mdi-play w-3.5 h-3.5" />}
								>
									<div class="i-mdi-stop w-3.5 h-3.5" />
								</Show>
							</Show>
							<span class="text-xs">
								{isLaunching() ? "..." : props.isRunning ? "Stop" : "Launch"}
							</span>
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger
								as={Button}
								variant="ghost"
								size="icon"
								class="h-7 w-7"
							>
								<div class="i-mdi-dots-vertical w-4 h-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent class="w-48">
								<EditActionTrigger onClick={() => setShowEditDialog(true)} />
								<DropdownMenuSeparator />
								<DeleteActionDialog
									action={props.action}
									trigger={DeleteActionTrigger}
								/>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				<div class="flex items-center gap-1.5 flex-wrap text-xs">
					<Show when={props.action.action_type === "tool"}>
						<Badge variant="secondary" class="h-5 px-1.5 font-mono">
							{config().toolName}
						</Badge>
					</Show>
					<Show when={props.action.action_type !== "tool"}>
						<Badge variant="default" class="h-5 px-1.5 capitalize">
							{props.action.action_type}
						</Badge>
					</Show>
					<Show when={props.action.detached}>
						<Badge
							variant="outline"
							class="h-5 px-1.5 border-orange-500/50 text-orange-600 dark:text-orange-400"
						>
							<div class="i-mdi-launch w-3 h-3 mr-0.5" />
							Detached
						</Badge>
					</Show>
					<Show when={props.action.track_process}>
						<Badge
							variant="outline"
							class="h-5 px-1.5 border-blue-500/50 text-blue-600 dark:text-blue-400"
						>
							<div class="i-mdi-chart-line w-3 h-3 mr-0.5" />
							Tracked
						</Badge>
					</Show>
					<Show when={props.action.auto_launch}>
						<Badge
							variant="outline"
							class="h-5 px-1.5 border-green-500/50 text-green-600 dark:text-green-400"
						>
							<div class="i-mdi-rocket-launch w-3 h-3 mr-0.5" />
							Auto-start
						</Badge>
					</Show>
					<Show when={props.action.timeout_seconds}>
						<Badge variant="outline" class="h-5 px-1.5">
							<div class="i-mdi-timer-outline w-3 h-3 mr-0.5" />
							{props.action.timeout_seconds}s
						</Badge>
					</Show>
					<Show when={config().commandPreview}>
						<code class="bg-muted/80 px-1.5 py-0.5 rounded font-mono text-muted-foreground truncate flex-1 min-w-0">
							{config().commandPreview}
						</code>
					</Show>
					<Show when={workingDir()}>
						{(dir) => (
							<div class="inline-flex items-center h-5 rounded border border-border bg-muted/50 text-muted-foreground font-mono text-xs shrink-0 max-w-[200px] overflow-hidden">
								<button
									type="button"
									title={`Open in file manager: ${dir()}`}
									onClick={(e) => {
										e.stopPropagation();
										openPath(dir());
									}}
									class="inline-flex items-center gap-0.5 h-full px-1.5 hover:text-foreground hover:bg-muted transition-colors cursor-pointer min-w-0"
								>
									<div class="i-mdi-folder-outline w-3 h-3 shrink-0" />
									<span class="truncate">{workingDirLabel()}</span>
								</button>
								<div class="w-px h-3 bg-border shrink-0" />
								<button
									type="button"
									title={`Copy path: ${dir()}`}
									onClick={(e) => {
										e.stopPropagation();
										navigator.clipboard.writeText(dir());
									}}
									class="inline-flex items-center justify-center h-full px-1 hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
								>
									<div class="i-mdi-content-copy w-3 h-3" />
								</button>
							</div>
						)}
					</Show>
				</div>
			</div>

			<Dialog
				open={showLogs()}
				onOpenChange={(open) => {
					if (!open) {
						handleDialogClose(setShowLogs);
					} else {
						setShowLogs(true);
					}
				}}
			>
				<DialogContent class="max-w-3xl h-[80vh] flex flex-col">
					<DialogHeader>
						<DialogTitle>Action Logs: {props.action.name}</DialogTitle>
					</DialogHeader>
					<div class="min-h-0 flex-1 px-4 py-4">
						<Show
							when={runningAction()?.run_id}
							fallback={<div>No active run logs</div>}
						>
							{(runId) => (
								<LogViewer logs={state.logs[runId().toString()] || []} />
							)}
						</Show>
					</div>
				</DialogContent>
			</Dialog>

			<ActionDialog
				workspaceId={props.workspaceId.toString()}
				action={props.action}
				forceOpen={showEditDialog()}
				onClose={() => handleDialogClose(setShowEditDialog)}
				trigger={() => <div />}
			/>
		</div>
	);
};
