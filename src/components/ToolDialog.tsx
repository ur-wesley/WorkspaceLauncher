import { type Component, createSignal, Show } from "solid-js";
import { IconPicker } from "@/components/IconPicker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch, SwitchControl, SwitchThumb } from "@/components/ui/switch";
import { TextArea } from "@/components/ui/textarea";
import { TextField, TextFieldLabel, TextFieldRoot } from "@/components/ui/textfield";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { pickExecutable } from "@/libs/filePicker";
import { showToast } from "@/libs/toast";
import { useToolStore } from "@/store/tool";
import type { NewTool, PlaceholderDefinition, Tool } from "@/types/database";

interface ToolDialogProps {
	tool?: Tool;
	trigger: Component<{ onClick?: () => void }>;
	onClose?: () => void;
}

export const ToolDialog: Component<ToolDialogProps> = (props) => {
	const [, toolActions] = useToolStore();
	const [open, setOpen] = createSignal(false);
	const [loading, setLoading] = createSignal(false);

	const [name, setName] = createSignal(props.tool?.name || "");
	const [description, setDescription] = createSignal(props.tool?.description || "");
	const [icon, setIcon] = createSignal(props.tool?.icon || "");
	const [enabled, setEnabled] = createSignal(props.tool?.enabled ?? true);
	const [toolType, setToolType] = createSignal<"binary" | "cli">(props.tool?.tool_type || "cli");
	const [template, setTemplate] = createSignal(props.tool?.template || "");
	const [category, setCategory] = createSignal(props.tool?.category || "");
	const [placeholdersText, setPlaceholdersText] = createSignal(props.tool?.placeholders || "[]");

	const handlePickBinary = async () => {
		const path = await pickExecutable({ title: "Select Binary Executable" });
		if (path) {
			setTemplate(path);
		}
	};

	const resetForm = () => {
		setName(props.tool?.name || "");
		setDescription(props.tool?.description || "");
		setIcon(props.tool?.icon || "");
		setEnabled(props.tool?.enabled ?? true);
		setToolType(props.tool?.tool_type || "cli");
		setTemplate(props.tool?.template || "");
		setCategory(props.tool?.category || "");
		setPlaceholdersText(props.tool?.placeholders || "[]");
	};

	const handleSubmit = async (e: SubmitEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			let placeholders: PlaceholderDefinition[];
			try {
				placeholders = JSON.parse(placeholdersText());
				if (!Array.isArray(placeholders)) {
					throw new Error("Placeholders must be an array");
				}
			} catch {
				alert("Invalid placeholders JSON format");
				return;
			}

			const toolData: NewTool = {
				name: name().trim(),
				description: description().trim() || undefined,
				icon: icon().trim() || undefined,
				enabled: enabled(),
				tool_type: toolType(),
				template: template().trim(),
				placeholders: JSON.stringify(placeholders),
				category: category().trim() || undefined,
			};

			if (props.tool) {
				await toolActions.updateTool(props.tool.id, toolData);
			} else {
				await toolActions.createTool(toolData);
			}
			setOpen(false);
			resetForm();
		} catch (error) {
			console.error("Tool save error:", error);
			alert(`Failed to save tool: ${error}`);
		} finally {
			setLoading(false);
		}
	};

	const handleOpenChange = (isOpen: boolean) => {
		setOpen(isOpen);
		if (!isOpen) {
			resetForm();
			props.onClose?.();
		}
	};

	const placeholderExamples: PlaceholderDefinition[] = [
		{
			name: "workspace_path",
			description: "Path to workspace/folder",
			required: true,
			type: "path",
		},
		{ name: "url", description: "URL to open", required: true, type: "url" },
		{
			name: "path",
			description: "File or folder path",
			required: false,
			type: "path",
			default: ".",
		},
		{
			name: "args",
			description: "Command line arguments",
			required: false,
			type: "text",
		},
		{
			name: "binary_path",
			description: "Path to executable",
			required: true,
			type: "path",
		},
	];

	const insertPlaceholderExample = (placeholder: PlaceholderDefinition) => {
		try {
			const current = JSON.parse(placeholdersText() || "[]");
			current.push(placeholder);
			setPlaceholdersText(JSON.stringify(current, null, 2));
		} catch {
			setPlaceholdersText(JSON.stringify([placeholder], null, 2));
		}
	};

	const prettifyJson = () => {
		try {
			const parsed = JSON.parse(placeholdersText());
			setPlaceholdersText(JSON.stringify(parsed, null, 2));
			showToast({
				title: "Success",
				description: "JSON formatted successfully",
				variant: "default",
			});
		} catch {
			showToast({
				title: "Error",
				description: "Invalid JSON format",
				variant: "destructive",
			});
		}
	};

	return (
		<>
			<props.trigger onClick={() => setOpen(true)} />
			<Dialog open={open()} onOpenChange={handleOpenChange}>
				<DialogContent class="max-w-3xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{props.tool ? "Edit Tool" : "Create New Tool"}</DialogTitle>
						<DialogDescription>
							{props.tool
								? "Modify the tool configuration."
								: "Create a new tool that can be used to generate actions."}
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleSubmit} class="space-y-6">
						<div class="space-y-4">
							<h3 class="text-lg font-medium">Basic Information</h3>

							<div class="grid grid-cols-2 gap-4">
								<TextFieldRoot>
									<TextFieldLabel for="tool-name">Name *</TextFieldLabel>
									<TextField
										id="tool-name"
										value={name()}
										onInput={(e: InputEvent) => setName((e.target as HTMLInputElement).value)}
										placeholder="Tool name"
										required
									/>
								</TextFieldRoot>

								<TextFieldRoot>
									<TextFieldLabel for="tool-category">Category</TextFieldLabel>
									<TextField
										id="tool-category"
										value={category()}
										onInput={(e: InputEvent) => setCategory((e.target as HTMLInputElement).value)}
										placeholder="development, browser, utility, custom"
									/>
								</TextFieldRoot>
							</div>

							<TextFieldRoot>
								<TextFieldLabel for="tool-description">Description</TextFieldLabel>
								<TextField
									id="tool-description"
									value={description()}
									onInput={(e: InputEvent) => setDescription((e.target as HTMLInputElement).value)}
									placeholder="Tool description"
								/>
							</TextFieldRoot>

							<div class="space-y-2">
								<TextFieldLabel for="tool-icon">Icon</TextFieldLabel>
								<div id="tool-icon" class="flex items-center gap-3">
									<Show
										when={icon()}
										fallback={
											<div class="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
												<span class="iconify w-6 h-6 text-muted-foreground" data-icon="mdi:emoticon-outline" />
											</div>
										}
									>
										<div class="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
											<span class="iconify w-6 h-6" data-icon={`mdi:${icon()?.replace(/^i-mdi-/, "")}`} />
										</div>
									</Show>{" "}
									<IconPicker
										value={icon()}
										onChange={setIcon}
										trigger={
											<Button variant="outline" type="button">
												<span class="iconify w-4 h-4 mr-2" data-icon="mdi:palette" />
												{icon() ? "Change Icon" : "Choose Icon"}
											</Button>
										}
									/>{" "}
									<Show when={icon()}>
										<Button variant="ghost" size="sm" type="button" onClick={() => setIcon("")}>
											Clear
										</Button>
									</Show>
								</div>
								<p class="text-xs text-muted-foreground">Search from 7,000+ Material Design Icons</p>
							</div>

							<div class="space-y-2">
								<div class="flex items-center gap-2">
									<Switch checked={enabled()} onChange={setEnabled}>
										<SwitchControl>
											<SwitchThumb />
										</SwitchControl>
									</Switch>
									<span class="text-sm font-medium">Enabled</span>
								</div>
								<p class="text-xs text-muted-foreground">
									When disabled, this tool won't be available for creating actions
								</p>
							</div>
						</div>

						<div class="space-y-4">
							<h3 class="text-lg font-medium">Tool Configuration</h3>

							<div class="space-y-2">
								<TextFieldLabel>Tool Type *</TextFieldLabel>
								<ToggleGroup value={toolType()} onChange={(value) => setToolType(value as "binary" | "cli")}>
									<ToggleGroupItem value="cli">
										<span class="iconify w-4 h-4 mr-2" data-icon="mdi:console" /> CLI Command
									</ToggleGroupItem>
									<ToggleGroupItem value="binary">
										<span class="iconify w-4 h-4 mr-2" data-icon="mdi:application" /> Binary Executable
									</ToggleGroupItem>
								</ToggleGroup>
								<p class="text-xs text-muted-foreground">
									CLI: Command-line tools (npm, bun, code). Binary: Direct executable files (.exe, .app)
								</p>
							</div>

							<TextFieldRoot>
								<TextFieldLabel for="tool-template">
									{toolType() === "binary" ? "Binary Path *" : "Command Template *"}
								</TextFieldLabel>
								<div class="flex gap-2">
									<TextField
										id="tool-template"
										value={template()}
										onInput={(e: InputEvent) => setTemplate((e.target as HTMLInputElement).value)}
										placeholder={
											toolType() === "binary" ? "C:\\Program Files\\MyApp\\app.exe {args}" : "code {workspace_path}"
										}
										required
										class="flex-1"
									/>
									<Show when={toolType() === "binary"}>
										<Button type="button" variant="outline" onClick={handlePickBinary} title="Browse for binary">
											<span class="iconify w-4 h-4" data-icon="mdi:folder-open" />
										</Button>
									</Show>
								</div>
								<div class="text-xs text-muted-foreground mt-1">
									{toolType() === "binary"
										? "Path to the executable file. Use placeholders in {} for dynamic values."
										: "Use placeholders in {} brackets. Examples: code {workspace_path}, chrome {url}"}
								</div>
							</TextFieldRoot>
						</div>

						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<h3 class="text-lg font-medium">Placeholders</h3>
								<div class="flex gap-2">
									{placeholderExamples.map((example) => (
										<Button type="button" variant="outline" size="sm" onClick={() => insertPlaceholderExample(example)}>
											{example.name}
										</Button>
									))}
									<Button type="button" variant="outline" size="sm" onClick={prettifyJson} title="Format JSON">
										<div class="i-mdi-code-json w-4 h-4" />
									</Button>
								</div>
							</div>

							<TextFieldRoot>
								<TextFieldLabel for="placeholders">Placeholder Definitions (JSON)</TextFieldLabel>
								<TextArea
									id="placeholders"
									value={placeholdersText()}
									onInput={(e: InputEvent) => setPlaceholdersText((e.target as HTMLTextAreaElement).value)}
									placeholder='[{"name": "workspace_path", "description": "Path to workspace", "required": true, "type": "path"}]'
									rows={8}
									class="font-mono text-sm"
								/>
								<div class="text-xs text-muted-foreground mt-1">
									Define placeholders used in the template. Each placeholder should have: name, description, required,
									type (text/path/url/number), and optional default value.
								</div>
							</TextFieldRoot>
						</div>

						<div class="flex justify-end gap-3 pt-4 border-t">
							<Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading()}>
								Cancel
							</Button>
							<Button type="submit" disabled={loading()}>
								{(() => {
									if (loading()) return "Saving...";
									if (props.tool) return "Update Tool";
									return "Create Tool";
								})()}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
};
