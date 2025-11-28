import type { Component } from "solid-js";
import { Show } from "solid-js";
import { DeleteGlobalVariableDialog } from "@/components/global-variable/DeleteGlobalVariableDialog";
import { GlobalVariableDialog } from "@/components/global-variable/GlobalVariableDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch, SwitchControl, SwitchThumb } from "@/components/ui/switch";
import {
	DeleteVariableTrigger,
	EditVariableTrigger,
} from "@/components/WorkspaceDetailTriggers";
import { cn } from "@/libs/cn";
import type { GlobalVariable } from "@/types/database";

interface GlobalVariableCardProps {
	readonly variable: GlobalVariable;
	readonly onToggle: (variableId: number, enabled: boolean) => void;
}

export const GlobalVariableCard: Component<GlobalVariableCardProps> = (
	props,
) => {
	return (
		<div
			class={cn(
				"group rounded-md transition-all duration-200",
				"bg-card border border-border hover:border-primary/50",
				"shadow-sm hover:shadow",
			)}
		>
			<div class="p-3">
				<div class="flex items-center justify-between gap-2 mb-1.5">
					<div class="flex items-center gap-1.5 flex-1 min-w-0 w-full">
						<code class="bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-mono text-sm font-semibold truncate">
							{props.variable.key}
						</code>
						<span class="text-muted-foreground font-mono">=</span>
						<Show
							when={props.variable.is_secure}
							fallback={
								<code class="bg-muted/80 px-1.5 py-0.5 rounded font-mono text-sm text-foreground flex-1 truncate">
									"{props.variable.value}"
								</code>
							}
						>
							<code class="bg-muted/80 px-1.5 py-0.5 rounded font-mono text-sm text-muted-foreground italic">
								"••••••••"
							</code>
						</Show>

						<DropdownMenu>
							<DropdownMenuTrigger
								as={Button}
								variant="ghost"
								size="icon"
								class="h-7 w-7 shrink-0"
							>
								<div class="i-mdi-dots-vertical w-4 h-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent class="w-48">
								<GlobalVariableDialog
									variable={props.variable}
									trigger={EditVariableTrigger}
								/>
								<DeleteGlobalVariableDialog
									variable={props.variable}
									trigger={DeleteVariableTrigger}
								/>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				<div class="flex items-center justify-between gap-2">
					<div class="flex items-center gap-1.5 flex-wrap text-xs">
						<Show when={props.variable.is_secure}>
							<Badge
								variant="outline"
								class="h-5 px-1.5 border-purple-500/50 text-purple-600 dark:text-purple-400"
							>
								<div class="i-mdi-lock w-3 h-3 mr-0.5" />
								Secure
							</Badge>
						</Show>
						<Badge
							variant={props.variable.enabled ? "default" : "secondary"}
							class={cn(
								"h-5 px-1.5",
								props.variable.enabled && "bg-green-500 hover:bg-green-600",
							)}
						>
							{props.variable.enabled ? "Active" : "Disabled"}
						</Badge>
					</div>

					<div class="flex items-center gap-1.5">
						<Switch
							checked={props.variable.enabled}
							onChange={(checked) => props.onToggle(props.variable.id, checked)}
						>
							<SwitchControl>
								<SwitchThumb />
							</SwitchControl>
						</Switch>
					</div>
				</div>
			</div>
		</div>
	);
};
