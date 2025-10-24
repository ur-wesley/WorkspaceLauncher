import type { Component } from "solid-js";
import { Show } from "solid-js";
import { ActionRunHistory } from "@/components/ActionRunHistory";
import { ActionDialogStepper as ActionDialog } from "@/components/action/ActionDialogStepper";
import { DeleteActionDialog } from "@/components/DeleteActionDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteActionTrigger, EditActionTrigger } from "@/components/WorkspaceDetailTriggers";
import { cn } from "@/libs/cn";
import { parseActionConfig } from "@/pages/WorkspaceDetailPage.helpers";
import type { Action } from "@/types/database";

interface ActionCardProps {
	readonly action: Action;
	readonly workspaceId: number;
	readonly isRunning: boolean;
	readonly onLaunch: (action: Action) => void;
}

export const ActionCard: Component<ActionCardProps> = (props) => {
	const config = () => parseActionConfig(props.action.config);

	return (
		<div
			class={cn(
				"group rounded-md transition-all duration-200",
				"bg-card border border-border hover:border-primary/50",
				"shadow-sm hover:shadow",
			)}
		>
			<div class="p-3">
				<div class="flex items-center justify-between gap-2 mb-2">
					<div class="flex items-center gap-2 flex-1 min-w-0">
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
							trigger={
								<Button variant="ghost" size="icon" class="h-7 w-7">
									<div class="i-mdi-history w-4 h-4" />
								</Button>
							}
						/>
						<Button
							variant={props.isRunning ? "destructive" : "default"}
							size="sm"
							onClick={() => props.onLaunch(props.action)}
							class="h-7 px-2 gap-1"
						>
							<Show when={props.isRunning} fallback={<div class="i-mdi-play w-3.5 h-3.5" />}>
								<div class="i-mdi-stop w-3.5 h-3.5" />
							</Show>
							<span class="text-xs">{props.isRunning ? "Stop" : "Launch"}</span>
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger as={Button} variant="ghost" size="icon" class="h-7 w-7">
								<div class="i-mdi-dots-vertical w-4 h-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent class="w-48">
								<ActionDialog
									workspaceId={props.workspaceId.toString()}
									action={props.action}
									trigger={EditActionTrigger}
								/>
								<DropdownMenuSeparator />
								<DeleteActionDialog action={props.action} trigger={DeleteActionTrigger} />
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
						<Badge variant="outline" class="h-5 px-1.5 border-orange-500/50 text-orange-600 dark:text-orange-400">
							<div class="i-mdi-launch w-3 h-3 mr-0.5" />
							Detached
						</Badge>
					</Show>
					<Show when={props.action.track_process}>
						<Badge variant="outline" class="h-5 px-1.5 border-blue-500/50 text-blue-600 dark:text-blue-400">
							<div class="i-mdi-chart-line w-3 h-3 mr-0.5" />
							Tracked
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
				</div>
			</div>
		</div>
	);
};
