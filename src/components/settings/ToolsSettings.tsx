import type { Component } from "solid-js";
import { createSignal, For, onMount } from "solid-js";
import { DeleteToolDialog } from "@/components/DeleteToolDialog";
import { ToolDialog } from "@/components/ToolDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Switch, SwitchControl, SwitchThumb } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Tool } from "@/models/tool.model";
import { useToolStore } from "@/store/tool";

const AddToolTrigger = (props: { onClick?: () => void }) => (
	<Button onClick={props.onClick}>
		<div class="i-mdi-plus w-4 h-4 mr-2" />
		Add Tool
	</Button>
);

const EditToolTrigger = (props: { onClick?: () => void }) => (
	<button
		type="button"
		class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
		onClick={props.onClick}
	>
		<div class="flex items-center gap-2">
			<div class="i-mdi-pencil w-4 h-4" />
			Edit
		</div>
	</button>
);

const DeleteToolTrigger = (props: { onClick?: () => void }) => (
	<button
		type="button"
		class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer text-destructive"
		onClick={props.onClick}
	>
		<div class="flex items-center gap-2">
			<div class="i-mdi-delete w-4 h-4" />
			Delete
		</div>
	</button>
);

export const ToolsSettings: Component = () => {
	const [toolStore, toolActions] = useToolStore();
	const [expandedTools, setExpandedTools] = createSignal<Set<number>>(
		new Set(),
	);

	onMount(() => {
		toolActions.loadTools();
	});

	const handleToggleTool = async (toolId: number, enabled: boolean) => {
		await toolActions.toggleTool(toolId, enabled);
	};

	const toggleTool = (toolId: number) => {
		const newSet = new Set(expandedTools());
		if (newSet.has(toolId)) {
			newSet.delete(toolId);
		} else {
			newSet.add(toolId);
		}
		setExpandedTools(newSet);
	};

	const getToolTypeColor = (type: string) => {
		switch (type) {
			case "cli":
				return "bg-blue-500";
			case "binary":
				return "bg-orange-500";
			default:
				return "bg-gray-500";
		}
	};

	const groupedTools = () => {
		const groups: Record<string, Tool[]> = {};
		for (const tool of toolStore.tools) {
			const category = tool.category || "Uncategorized";
			if (!groups[category]) {
				groups[category] = [];
			}
			groups[category].push(tool);
		}
		return groups;
	};

	return (
		<div class="space-y-4">
			<Card>
				<CardHeader>
					<div class="flex items-center justify-between">
						<div>
							<CardTitle>Tool Library</CardTitle>
							<CardDescription>
								Manage CLI tools and binaries for action creation
							</CardDescription>
						</div>
						<ToolDialog
							trigger={AddToolTrigger}
							onClose={() => {
								toolActions.loadTools();
							}}
						/>
					</div>
				</CardHeader>
				<CardContent>
					<div class="space-y-4">
						<For each={Object.entries(groupedTools())}>
							{([category, tools]) => (
								<div class="space-y-2">
									<h4 class="text-sm font-medium text-muted-foreground">
										{category}
									</h4>
									<div class="space-y-2">
										<For each={tools}>
											{(tool) => (
												<Collapsible
													open={expandedTools().has(tool.id)}
													onOpenChange={() => toggleTool(tool.id)}
												>
													<CollapsibleTrigger as="div">
														<div class="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer">
															<div class="flex items-center gap-3">
																<div
																	class={`w-2 h-2 rounded-full ${getToolTypeColor(tool.tool_type)}`}
																/>
																<div>
																	<p class="font-medium">{tool.name}</p>
																	<p class="text-sm text-muted-foreground">
																		{tool.description}
																	</p>
																</div>
															</div>
															<div class="flex items-center gap-2">
																<Badge
																	variant={
																		tool.enabled ? "default" : "secondary"
																	}
																>
																	{tool.enabled ? "Enabled" : "Disabled"}
																</Badge>
																<div class="i-mdi-chevron-down w-4 h-4" />
															</div>
														</div>
													</CollapsibleTrigger>
													<CollapsibleContent>
														<div class="p-3 border-t bg-muted/30">
															<div class="flex items-center justify-between">
																<div class="flex items-center gap-2">
																	<Switch
																		checked={tool.enabled}
																		onChange={(enabled) =>
																			handleToggleTool(tool.id, enabled)
																		}
																	>
																		<SwitchControl>
																			<SwitchThumb />
																		</SwitchControl>
																	</Switch>
																	<span class="text-sm">Enable tool</span>
																</div>
																<DropdownMenu>
																	<Tooltip>
																		<TooltipTrigger as="div">
																			<DropdownMenuTrigger as="div">
																				<Button size="sm" variant="outline">
																					<div class="i-mdi-dots-vertical w-4 h-4" />
																				</Button>
																			</DropdownMenuTrigger>
																		</TooltipTrigger>
																		<TooltipContent>
																			Tool options
																		</TooltipContent>
																	</Tooltip>
																	<DropdownMenuContent>
																		<ToolDialog
																			tool={tool}
																			trigger={EditToolTrigger}
																			onClose={() => {
																				toolActions.loadTools();
																			}}
																		/>
																		<DropdownMenuSeparator />
																		<DeleteToolDialog
																			tool={tool}
																			trigger={DeleteToolTrigger}
																		/>
																	</DropdownMenuContent>
																</DropdownMenu>
															</div>
														</div>
													</CollapsibleContent>
												</Collapsible>
											)}
										</For>
									</div>
									<Separator />
								</div>
							)}
						</For>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
