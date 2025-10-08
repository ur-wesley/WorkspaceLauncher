import { type Component, createSignal, For, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { TextField, TextFieldRoot } from "@/components/ui/textfield";
import * as api from "@/libs/api";
import { type ExportData, shareHandler } from "@/libs/share";
import { showToast } from "@/libs/toast";
import { useToolStore } from "@/store/tool";
import { useWorkspaceStore } from "@/store/workspace";
import type { Action } from "@/types/database";

interface ShareDialogProps {
	trigger: Component<{ onClick?: () => void }>;
}

export const ShareDialog: Component<ShareDialogProps> = (props) => {
	const [open, setOpen] = createSignal(false);
	const workspaceStore = useWorkspaceStore();
	const [toolStore] = useToolStore();
	const [searchQuery, setSearchQuery] = createSignal("");

	const [selectedWorkspaces, setSelectedWorkspaces] = createSignal<Set<number>>(new Set<number>());
	const [selectedTools, setSelectedTools] = createSignal<Set<number>>(new Set<number>());

	const filteredWorkspaces = () => {
		const query = searchQuery().toLowerCase();
		if (!query) return workspaceStore.store.workspaces;
		return workspaceStore.store.workspaces.filter(
			(w) => w.name.toLowerCase().includes(query) || w.description?.toLowerCase().includes(query),
		);
	};

	const filteredTools = () => {
		const query = searchQuery().toLowerCase();
		if (!query) return toolStore.tools;
		return toolStore.tools.filter(
			(t) => t.name.toLowerCase().includes(query) || t.description?.toLowerCase().includes(query),
		);
	};

	const toggleWorkspace = (id: number) => {
		const newSet = new Set<number>(selectedWorkspaces());
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		setSelectedWorkspaces(newSet);
	};

	const toggleTool = (id: number) => {
		const newSet = new Set<number>(selectedTools());
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		setSelectedTools(newSet);
	};

	const selectAllWorkspaces = () => {
		setSelectedWorkspaces(new Set<number>(filteredWorkspaces().map((w) => w.id)));
	};

	const deselectAllWorkspaces = () => {
		setSelectedWorkspaces(new Set<number>());
	};

	const selectAllTools = () => {
		setSelectedTools(new Set<number>(filteredTools().map((t) => t.id)));
	};

	const deselectAllTools = () => {
		setSelectedTools(new Set<number>());
	};

	const handleExport = async (toClipboard = false) => {
		try {
			const exportData: ExportData = {
				version: "1.0.0",
				exportDate: new Date().toISOString(),
			};

			if (selectedWorkspaces().size > 0) {
				exportData.workspaces = workspaceStore.store.workspaces.filter((w) => selectedWorkspaces().has(w.id));

				const actions: Action[] = [];
				for (const workspace of exportData.workspaces) {
					const result = await api.listActionsByWorkspace(workspace.id);
					if (result.isOk()) {
						actions.push(...result.value);
					}
				}
				if (actions.length > 0) {
					exportData.actions = actions;
				}
			}

			if (selectedTools().size > 0) {
				exportData.tools = toolStore.tools.filter((t) => selectedTools().has(t.id));
			}

			if (!exportData.workspaces?.length && !exportData.tools?.length) {
				showToast({
					title: "Nothing to export",
					description: "Please select at least one item to export",
					variant: "destructive",
				});
				return;
			}

			if (toClipboard) {
				await shareHandler.exportToClipboard(exportData);
				showToast({
					title: "Exported to clipboard",
					description: `Copied ${(exportData.workspaces?.length || 0) + (exportData.tools?.length || 0)} items`,
					variant: "success",
				});
			} else {
				await shareHandler.exportToFile(exportData);
				showToast({
					title: "Export successful",
					description: "Data has been exported to file",
					variant: "success",
				});
			}

			setOpen(false);
		} catch (error) {
			showToast({
				title: "Export failed",
				description: error instanceof Error ? error.message : "Unknown error occurred",
				variant: "destructive",
			});
		}
	};

	return (
		<Dialog open={open()} onOpenChange={setOpen}>
			<props.trigger onClick={() => setOpen(true)} />
			<DialogContent class="max-w-3xl max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Export Data</DialogTitle>
					<DialogDescription>
						Select workspaces and tools to export. You can save to a file or copy to clipboard.
					</DialogDescription>
				</DialogHeader>

				<div class="flex-1 overflow-y-auto space-y-4">
					{/* Search */}
					<TextFieldRoot>
						<TextField
							type="text"
							placeholder="Search workspaces and tools..."
							value={searchQuery()}
							onInput={(e: InputEvent) => setSearchQuery((e.target as HTMLInputElement).value)}
							class="w-full"
						/>
					</TextFieldRoot>

					{/* Workspaces Section */}
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<h3 class="text-sm font-medium">Workspaces ({filteredWorkspaces().length})</h3>
							<div class="flex gap-2">
								<Button
									variant="ghost"
									size="sm"
									onClick={selectAllWorkspaces}
									disabled={filteredWorkspaces().length === 0}
								>
									Select All
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={deselectAllWorkspaces}
									disabled={selectedWorkspaces().size === 0}
								>
									Deselect All
								</Button>
							</div>
						</div>
						<div class="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
							<Show
								when={filteredWorkspaces().length > 0}
								fallback={<p class="text-sm text-muted-foreground text-center py-4">No workspaces found</p>}
							>
								<For each={filteredWorkspaces()}>
									{(workspace) => {
										const isSelected = () => selectedWorkspaces().has(workspace.id);
										return (
											<div
												class={`flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer ${
													isSelected() ? "bg-accent/50 border border-accent" : ""
												}`}
												onClick={() => toggleWorkspace(workspace.id)}
											>
												<Checkbox checked={isSelected()} />
												<div class="flex-1">
													<p class="text-sm font-medium">{workspace.name}</p>
													<Show when={workspace.description}>
														<p class="text-xs text-muted-foreground">{workspace.description}</p>
													</Show>
												</div>
											</div>
										);
									}}
								</For>
							</Show>
						</div>
					</div>

					<Separator />

					{/* Tools Section */}
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<h3 class="text-sm font-medium">Tools ({filteredTools().length})</h3>
							<div class="flex gap-2">
								<Button variant="ghost" size="sm" onClick={selectAllTools} disabled={filteredTools().length === 0}>
									Select All
								</Button>
								<Button variant="ghost" size="sm" onClick={deselectAllTools} disabled={selectedTools().size === 0}>
									Deselect All
								</Button>
							</div>
						</div>
						<div class="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
							<Show
								when={filteredTools().length > 0}
								fallback={<p class="text-sm text-muted-foreground text-center py-4">No tools found</p>}
							>
								<For each={filteredTools()}>
									{(tool) => {
										const isSelected = () => selectedTools().has(tool.id);
										return (
											<div
												class={`flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer ${
													isSelected() ? "bg-accent/50 border border-accent" : ""
												}`}
												onClick={() => toggleTool(tool.id)}
											>
												<Checkbox checked={isSelected()} />
												<div class="flex-1">
													<p class="text-sm font-medium">{tool.name}</p>
													<Show when={tool.description}>
														<p class="text-xs text-muted-foreground">{tool.description}</p>
													</Show>
												</div>
											</div>
										);
									}}
								</For>
							</Show>
						</div>
					</div>
				</div>

				{/* Actions */}
				<div class="flex justify-between pt-4 border-t">
					<div class="text-sm text-muted-foreground">
						Selected: {selectedWorkspaces().size} workspaces, {selectedTools().size} tools
					</div>
					<div class="flex gap-2">
						<Button variant="outline" onClick={() => handleExport(true)}>
							<span class="iconify w-4 h-4 mr-2" data-icon="mdi:content-copy" /> Copy to Clipboard
						</Button>
						<Button onClick={() => handleExport(false)}>
							<span class="iconify w-4 h-4 mr-2" data-icon="mdi:download" /> Export to File
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
