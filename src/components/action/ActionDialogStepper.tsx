import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	onCleanup,
	Show,
} from "solid-js";
import * as v from "valibot";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Switch, SwitchControl, SwitchThumb } from "@/components/ui/switch";
import { TextArea } from "@/components/ui/textarea";
import {
	TextField,
	TextFieldLabel,
	TextFieldRoot,
} from "@/components/ui/textfield";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/libs/cn";
import { pickDirectory, pickExecutable } from "@/libs/filePicker";
import { showToast } from "@/libs/toast";
import type { Action } from "@/models/action.model";
import type { Tool as ToolModel } from "@/models/tool.model";
import { useActionStore } from "@/store/action";
import { useGlobalVariableStore } from "@/store/globalVariable";
import { useToolStore } from "@/store/tool";
import { useVariableStore } from "@/store/variable";
import type {
	CustomToolActionConfig,
	NewAction,
	NewTool,
	PlaceholderDefinition,
	SavedToolActionConfig,
	ToolActionConfig,
} from "@/types/database";
import { basicInfoSchema } from "./ActionDialogValidation";
import {
	gatherMissingVariables,
	normalizePlaceholderValues,
	parseArgsText,
	parsePlaceholderDefinitions,
	parseToolActionConfig,
} from "./actionDialogHelpers";

type ToolMode = "saved" | "custom";
type CustomToolType = "cli" | "binary";

type ActionDialogStepperProps = {
	workspaceId: string;
	action?: Action;
	trigger: Component<{ onClick?: () => void }>;
	onClose?: () => void;
	forceOpen?: boolean;
};

export const ActionDialogStepper: Component<ActionDialogStepperProps> = (
	props,
) => {
	const [actionStore, actionActions] = useActionStore();
	const [toolStore, toolActions] = useToolStore();
	const [variableStore, variableActions] = useVariableStore();
	const [globalVariableStore] = useGlobalVariableStore();

	const [open, setOpen] = createSignal(false);
	const isOpen = () =>
		props.forceOpen !== undefined ? props.forceOpen : open();
	const [loading, setLoading] = createSignal(false);
	const [savingCustomTool, setSavingCustomTool] = createSignal(false);
	const [showAdvanced, setShowAdvanced] = createSignal(false);
	const initializationRef = {
		initialized: false,
		actionId: null as number | null,
	};

	const [name, setName] = createSignal(props.action?.name ?? "");
	const [toolMode, setToolMode] = createSignal<ToolMode>("saved");
	const [selectedToolId, setSelectedToolId] = createSignal<number | null>(null);
	const [placeholderValues, setPlaceholderValues] = createSignal<
		Record<string, string>
	>({});
	const [missingVariables, setMissingVariables] = createSignal<string[]>([]);

	const initialTimeout =
		props.action && typeof props.action.timeout_seconds === "number"
			? props.action.timeout_seconds
			: 30;
	const [timeoutSeconds, setTimeoutSeconds] = createSignal<number | null>(
		initialTimeout,
	);
	const [orderIndex, setOrderIndex] = createSignal<number>(
		props.action?.order_index ?? actionStore.actions.length,
	);
	const [detached, setDetached] = createSignal<boolean>(
		props.action?.detached ?? false,
	);
	const [trackProcess, setTrackProcess] = createSignal<boolean>(
		props.action?.track_process ?? true,
	);
	const [autoLaunch, setAutoLaunch] = createSignal<boolean>(
		props.action?.auto_launch ?? false,
	);

	const [customToolType, setCustomToolType] =
		createSignal<CustomToolType>("cli");
	const [customCommand, setCustomCommand] = createSignal("");
	const [customBinaryPath, setCustomBinaryPath] = createSignal("");
	const [customArgsText, setCustomArgsText] = createSignal("");
	const [customWorkingDirectory, setCustomWorkingDirectory] = createSignal("");

	const commandSuggestion = createMemo(() => {
		const cmd = customCommand().trim();
		if (!cmd || customToolType() !== "cli") return null;

		const cdPattern = /^cd\s+([^;]+)\s*;\s*(.+)$/i;
		const cdMatch = cmd.match(cdPattern);
		if (cdMatch) {
			const [, dir, actualCmd] = cdMatch;
			const cleanDir = dir.trim().replace(/^["']|["']$/g, "");
			const parts = actualCmd.trim().split(/\s+/);
			return {
				workingDirectory: cleanDir,
				command: parts[0],
				args: parts.slice(1).join(" "),
			};
		}

		const cdDPattern = /^cd\s+\/d\s+([^&]+)\s*&&\s*(.+)$/i;
		const cdDMatch = cmd.match(cdDPattern);
		if (cdDMatch) {
			const [, dir, actualCmd] = cdDMatch;
			const cleanDir = dir.trim().replace(/^["']|["']$/g, "");
			const parts = actualCmd.trim().split(/\s+/);
			return {
				workingDirectory: cleanDir,
				command: parts[0],
				args: parts.slice(1).join(" "),
			};
		}

		return null;
	});

	const allowedTools = createMemo(() =>
		toolStore.tools.filter((tool) => tool.enabled),
	);
	const selectedTool = createMemo<ToolModel | null>(() => {
		const id = selectedToolId();
		if (id == null) return null;
		return toolStore.tools.find((tool) => tool.id === id) ?? null;
	});

	const toolPlaceholders = createMemo(() => {
		if (toolMode() !== "saved") return [] as PlaceholderDefinition[];
		const tool = selectedTool();
		if (!tool) return [] as PlaceholderDefinition[];
		return parsePlaceholderDefinitions(tool.placeholders);
	});

	const availableVariables = createMemo(() => {
		const workspaceVars = variableStore.variables
			.filter((variable) => variable.enabled)
			.map((variable) => variable.key);
		const globalVars = globalVariableStore.variables
			.filter((variable) => variable.enabled)
			.map((variable) => variable.key);
		return [...workspaceVars, ...globalVars];
	});

	const customCommandPreview = createMemo(() => {
		if (toolMode() !== "custom") return "";
		const args = parseArgsText(customArgsText());
		const base =
			customToolType() === "cli"
				? customCommand().trim()
				: customBinaryPath().trim();
		return [base, ...args]
			.filter((s) => s.length > 0)
			.join(" ")
			.trim();
	});

	const canSaveCustomTool = createMemo(() => {
		if (toolMode() !== "custom") return false;
		if (name().trim().length === 0) return false;
		return customToolType() === "cli"
			? customCommand().trim().length > 0
			: customBinaryPath().trim().length > 0;
	});

	const isNameValid = () =>
		v.safeParse(basicInfoSchema, { name: name() }).success;

	const isToolSelectionValid = () => {
		if (toolMode() === "saved") return selectedToolId() !== null;
		return true;
	};

	const isConfigValid = () => {
		if (toolMode() === "saved") {
			const tool = selectedTool();
			if (!tool) return false;
			return toolPlaceholders().every((p) => {
				if (!p.required) return true;
				const val = placeholderValues()[p.name];
				return Boolean(val && val.trim().length > 0);
			});
		}
		return customToolType() === "cli"
			? customCommand().trim().length > 0
			: customBinaryPath().trim().length > 0;
	};

	const canSubmit = createMemo(
		() => isNameValid() && isToolSelectionValid() && isConfigValid(),
	);

	const applyCommandSuggestion = () => {
		const s = commandSuggestion();
		if (!s) return;
		setCustomWorkingDirectory(s.workingDirectory);
		setCustomCommand(s.command);
		setCustomArgsText(s.args);
		showToast({
			title: "Command fixed!",
			description: "Separated directory, command, and arguments.",
			variant: "success",
		});
	};

	const handlePickExecutable = async () => {
		const path = await pickExecutable({ title: "Select Executable" });
		if (path) setCustomBinaryPath(path);
	};

	const handlePickWorkingDirectory = async () => {
		const path = await pickDirectory({ title: "Select Working Directory" });
		if (path) setCustomWorkingDirectory(path);
	};

	const applySavedConfig = (config: SavedToolActionConfig) => {
		setToolMode("saved");
		setSelectedToolId(config.tool_id);
		setPlaceholderValues(config.placeholder_values ?? {});
		resetCustomFields();
	};

	const applyCustomConfig = (config: CustomToolActionConfig) => {
		setToolMode("custom");
		setCustomToolType(config.tool_type ?? "cli");
		setCustomCommand(config.command ?? "");
		setCustomBinaryPath(config.binary_path ?? "");
		setCustomArgsText((config.args ?? []).join("\n"));
		setCustomWorkingDirectory(config.working_directory ?? "");
		setSelectedToolId(null);
		setPlaceholderValues({});
	};

	const resetCustomFields = () => {
		setCustomToolType("cli");
		setCustomCommand("");
		setCustomBinaryPath("");
		setCustomArgsText("");
		setCustomWorkingDirectory("");
	};

	const chooseDefaultTool = () => {
		const tools = allowedTools();
		if (tools.length > 0) {
			setToolMode("saved");
			setSelectedToolId(tools[0]?.id ?? null);
			return;
		}
		setToolMode("custom");
		setSelectedToolId(null);
	};

	const configureForAction = (action: Action) => {
		resetCustomFields();
		setPlaceholderValues({});
		setMissingVariables([]);
		setShowAdvanced(false);
		setName(action.name);
		setOrderIndex(action.order_index);
		setTimeoutSeconds(action.timeout_seconds ?? null);
		setDetached(action.detached ?? false);
		setTrackProcess(action.track_process ?? true);
		setAutoLaunch(action.auto_launch ?? false);

		const parsedConfig = parseToolActionConfig(action.config);
		if (parsedConfig?.source === "saved") {
			applySavedConfig(parsedConfig);
			return;
		}
		if (parsedConfig?.source === "custom") {
			applyCustomConfig(parsedConfig);
			return;
		}
		chooseDefaultTool();
	};

	const configureForNewAction = () => {
		resetCustomFields();
		setPlaceholderValues({});
		setMissingVariables([]);
		setShowAdvanced(false);
		setName("");
		setOrderIndex(actionStore.actions.length);
		setTimeoutSeconds(30);
		setDetached(false);
		setTrackProcess(true);
		setAutoLaunch(false);
		chooseDefaultTool();
	};

	const buildSavedActionConfig = (): SavedToolActionConfig | null => {
		const tool = selectedTool();
		if (!tool) {
			showToast({
				title: "Missing Tool",
				description: "Please choose a saved tool.",
				variant: "destructive",
			});
			return null;
		}
		return {
			type: "tool",
			source: "saved",
			tool_id: tool.id,
			tool_name: tool.name,
			tool_type: tool.tool_type,
			template: tool.template,
			placeholder_values: normalizePlaceholderValues(
				toolPlaceholders(),
				placeholderValues(),
			),
		};
	};

	const buildCustomActionConfig = (): CustomToolActionConfig => {
		const args = parseArgsText(customArgsText());
		const workingDir = customWorkingDirectory().trim();
		return {
			type: "tool",
			source: "custom",
			tool_name: name().trim(),
			tool_type: customToolType(),
			command:
				customToolType() === "cli" ? customCommand().trim() : undefined,
			binary_path:
				customToolType() === "binary"
					? customBinaryPath().trim()
					: undefined,
			args: args.length > 0 ? args : undefined,
			working_directory: workingDir.length > 0 ? workingDir : null,
		};
	};

	const buildActionConfig = (): ToolActionConfig | null =>
		toolMode() === "saved"
			? buildSavedActionConfig()
			: buildCustomActionConfig();

	const buildActionPayload = (config: ToolActionConfig): NewAction => ({
		workspace_id: Number(props.workspaceId),
		name: name().trim(),
		action_type: "tool",
		config: JSON.stringify(config),
		dependencies: props.action?.dependencies ?? null,
		timeout_seconds: timeoutSeconds(),
		detached: detached(),
		track_process: trackProcess(),
		auto_launch: autoLaunch(),
		os_overrides: props.action?.os_overrides ?? null,
		order_index: orderIndex(),
	});

	const handleSubmit = async () => {
		if (loading()) return;
		setLoading(true);
		try {
			const missing = missingVariables();
			if (missing.length > 0) {
				for (const varName of missing) {
					await variableActions.addVariable({
						workspace_id: Number(props.workspaceId),
						key: varName,
						value: "",
						is_secure: false,
						enabled: true,
					});
				}
				await variableActions.loadVariables(Number(props.workspaceId));
			}

			const actionConfig = buildActionConfig();
			if (!actionConfig) {
				setLoading(false);
				return;
			}

			const actionData = buildActionPayload(actionConfig);

			if (props.action) {
				await actionActions.updateAction(props.action.id, actionData);
			} else {
				await actionActions.addAction(actionData);
			}

			showToast({
				title: "Action Saved",
				description: props.action
					? `"${name().trim()}" has been updated.`
					: `"${name().trim()}" has been created.`,
				variant: "default",
			});

			setOpen(false);
			props.onClose?.();
		} catch (error) {
			showToast({
				title: "Failed to Save",
				description: error instanceof Error ? error.message : String(error),
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleSaveCustomTool = async () => {
		if (!canSaveCustomTool() || savingCustomTool()) return;
		setSavingCustomTool(true);
		const toolName = name().trim();
		const templateBase =
			customToolType() === "cli"
				? customCommand().trim()
				: customBinaryPath().trim();
		const args = parseArgsText(customArgsText());
		const template =
			args.length > 0 ? `${templateBase} ${args.join(" ")}` : templateBase;
		const newTool: NewTool = {
			name: toolName,
			description: `Saved from action ${toolName}`,
			enabled: true,
			tool_type: customToolType(),
			template,
			placeholders: "[]",
			icon: undefined,
			category: "custom",
		};
		try {
			const toolId = await toolActions.createTool(newTool);
			if (toolId) {
				setToolMode("saved");
				setSelectedToolId(toolId);
				setPlaceholderValues({});
				showToast({
					title: "Tool Saved",
					description: `"${toolName}" is now available as a saved tool.`,
					variant: "success",
				});
			} else {
				showToast({
					title: "Failed to Save Tool",
					description: "Could not create the tool. Please try again.",
					variant: "destructive",
				});
			}
		} catch (error) {
			showToast({
				title: "Failed to Save Tool",
				description: error instanceof Error ? error.message : String(error),
				variant: "destructive",
			});
		} finally {
			setSavingCustomTool(false);
		}
	};

	const resetForm = () => {
		setName("");
		setToolMode(allowedTools().length > 0 ? "saved" : "custom");
		setSelectedToolId(allowedTools()[0]?.id ?? null);
		setPlaceholderValues({});
		setMissingVariables([]);
		setTimeoutSeconds(30);
		setOrderIndex(actionStore.actions.length);
		setDetached(false);
		setTrackProcess(true);
		setAutoLaunch(false);
		setShowAdvanced(false);
		resetCustomFields();
	};

	const handleOpenChange = (openNext: boolean) => {
		if (props.forceOpen !== undefined) {
			if (!openNext) props.onClose?.();
			return;
		}
		setOpen(openNext);
		if (!openNext) {
			resetForm();
			initializationRef.initialized = false;
			initializationRef.actionId = null;
			props.onClose?.();
		}
	};

	createEffect(() => {
		if (!isOpen()) return;
		if (toolStore.tools.length === 0 && !toolStore.isLoading) {
			void toolActions.loadTools();
		}
	});

	createEffect(() => {
		if (!isOpen()) return;
		const currentActionId = props.action?.id ?? null;
		const isSameAction =
			initializationRef.initialized &&
			initializationRef.actionId === currentActionId;
		if (isSameAction) return;
		if (props.action) {
			configureForAction(props.action);
		} else {
			configureForNewAction();
		}
		initializationRef.initialized = true;
		initializationRef.actionId = currentActionId;
	});

	createEffect(() => {
		if (!open()) return;
		if (toolMode() === "saved") {
			setPlaceholderValues((current) =>
				normalizePlaceholderValues(toolPlaceholders(), current),
			);
		}
	});

	createEffect(() => {
		const available = new Set(availableVariables());
		const sources =
			toolMode() === "saved"
				? Object.values(placeholderValues())
				: [
						customCommand(),
						customBinaryPath(),
						customArgsText(),
						customWorkingDirectory(),
					];
		setMissingVariables(
			Array.from(gatherMissingVariables(sources, available)) as string[],
		);
	});

	createEffect(() => {
		if (!isOpen()) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				if (canSubmit()) void handleSubmit();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
	});

	return (
		<>
			<props.trigger
				onClick={() => {
					setOpen(true);
					const currentActionId = props.action?.id ?? null;
					if (initializationRef.actionId !== currentActionId) {
						initializationRef.initialized = false;
						initializationRef.actionId = null;
					}
				}}
			/>
			<Dialog open={isOpen()} onOpenChange={handleOpenChange}>
				<DialogContent class="max-w-lg flex flex-col gap-0 p-0 max-h-[90vh] overflow-hidden">
					<DialogHeader class="shrink-0">
						<DialogTitle>
							{props.action ? "Edit Action" : "New Action"}
						</DialogTitle>
					</DialogHeader>

					<div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
						<TextFieldRoot>
							<TextFieldLabel for="action-name">Name</TextFieldLabel>
							<TextField
								id="action-name"
								value={name()}
								onInput={(e: InputEvent) =>
									setName((e.currentTarget as HTMLInputElement).value)
								}
								placeholder="e.g. Start Dev Server, Open VS Code"
								autofocus
							/>
						</TextFieldRoot>

						<div class="space-y-3">
							<div class="flex items-center gap-3">
								<span class="text-sm font-medium">Command</span>
								<ToggleGroup
									class="justify-start"
									value={toolMode()}
									onChange={(value) => {
										if (value === "saved" || value === "custom")
											setToolMode(value);
									}}
								>
									<ToggleGroupItem
										value="saved"
										disabled={allowedTools().length === 0}
										class="h-7 px-3 text-xs"
									>
										<div class="i-mdi-package-variant w-3.5 h-3.5 mr-1.5" />
										Saved Tool
									</ToggleGroupItem>
									<ToggleGroupItem value="custom" class="h-7 px-3 text-xs">
										<div class="i-mdi-console w-3.5 h-3.5 mr-1.5" />
										Custom
									</ToggleGroupItem>
								</ToggleGroup>
							</div>

							<Show when={toolMode() === "saved"}>
								<div class="space-y-3">
									<Show
										when={allowedTools().length > 0}
										fallback={
											<p class="text-sm text-muted-foreground">
												No saved tools found. Switch to Custom to enter a
												command directly.
											</p>
										}
									>
										<select
											class="flex h-9 w-full rounded-md bg-elevated-2 px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:(ring-1.5 ring-ring)"
											value={selectedToolId()?.toString() ?? ""}
											onChange={(e) => {
												const val = e.currentTarget.value;
												setSelectedToolId(val ? Number(val) : null);
												setPlaceholderValues({});
											}}
										>
											<option value="">Choose a tool...</option>
											<For each={allowedTools()}>
												{(tool) => (
													<option value={tool.id.toString()}>{tool.name}</option>
												)}
											</For>
										</select>
									</Show>

									<Show when={selectedTool()}>
										{(tool) => (
											<div class="space-y-2">
												<Show when={tool().description}>
													<p class="text-xs text-muted-foreground">
														{tool().description}
													</p>
												</Show>
												<div class="rounded-md bg-muted px-3 py-2">
													<code class="text-xs font-mono break-all">
														{tool().template}
													</code>
												</div>
											</div>
										)}
									</Show>

									<Show when={toolPlaceholders().length > 0}>
										<div class="space-y-3">
											<For each={toolPlaceholders()}>
												{(p: PlaceholderDefinition) => (
													<TextFieldRoot>
														<TextFieldLabel for={`ph-${p.name}`}>
															{p.name}
															{p.required && (
																<span class="text-destructive ml-1">*</span>
															)}
														</TextFieldLabel>
														<TextField
															id={`ph-${p.name}`}
															value={placeholderValues()[p.name] ?? ""}
															onInput={(e: InputEvent) => {
																const val = (
																	e.currentTarget as HTMLInputElement
																).value;
																setPlaceholderValues((cur) => ({
																	...cur,
																	[p.name]: val,
																}));
															}}
															placeholder={p.description}
														/>
													</TextFieldRoot>
												)}
											</For>
										</div>
									</Show>
								</div>
							</Show>

							<Show when={toolMode() === "custom"}>
								<div class="space-y-3">
									<div class="flex items-center gap-2">
										<span class="text-xs text-muted-foreground shrink-0">
											Type
										</span>
										<ToggleGroup
											class="justify-start"
											value={customToolType()}
											onChange={(value) => {
												if (value === "cli" || value === "binary")
													setCustomToolType(value);
											}}
										>
											<ToggleGroupItem value="cli" class="h-7 px-3 text-xs">
												CLI
											</ToggleGroupItem>
											<ToggleGroupItem value="binary" class="h-7 px-3 text-xs">
												Binary
											</ToggleGroupItem>
										</ToggleGroup>
									</div>

									<Show when={customToolType() === "cli"}>
										<TextFieldRoot>
											<TextFieldLabel for="cmd">Command</TextFieldLabel>
											<TextField
												id="cmd"
												value={customCommand()}
												onInput={(e: InputEvent) =>
													setCustomCommand(
														(e.currentTarget as HTMLInputElement).value,
													)
												}
												placeholder="e.g. bun, node, python"
												class="font-mono"
											/>
										</TextFieldRoot>

										<Show when={commandSuggestion()}>
											{(s) => (
												<div class="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
													<div class="flex items-center gap-2">
														<div class="i-mdi-alert w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
														<p class="text-xs font-medium text-amber-900 dark:text-amber-100">
															Compound command detected
														</p>
													</div>
													<div class="text-xs font-mono bg-white/50 dark:bg-black/20 rounded px-2 py-1.5 space-y-0.5">
														<div>
															<span class="text-muted-foreground">Dir: </span>
															{s().workingDirectory}
														</div>
														<div>
															<span class="text-muted-foreground">Cmd: </span>
															{s().command}
														</div>
														<Show when={s().args}>
															<div>
																<span class="text-muted-foreground">
																	Args:{" "}
																</span>
																{s().args}
															</div>
														</Show>
													</div>
													<Button
														size="sm"
														variant="outline"
														class="w-full h-7 text-xs"
														onClick={applyCommandSuggestion}
													>
														<div class="i-mdi-auto-fix w-3.5 h-3.5 mr-1.5" />
														Auto-fix
													</Button>
												</div>
											)}
										</Show>
									</Show>

									<Show when={customToolType() === "binary"}>
										<TextFieldRoot>
											<TextFieldLabel for="bin">Executable</TextFieldLabel>
											<div class="flex gap-2">
												<TextField
													id="bin"
													value={customBinaryPath()}
													onInput={(e: InputEvent) =>
														setCustomBinaryPath(
															(e.currentTarget as HTMLInputElement).value,
														)
													}
													placeholder="C:\Tools\app.exe"
													class="flex-1 font-mono"
												/>
												<Button
													type="button"
													variant="outline"
													size="icon"
													onClick={handlePickExecutable}
													title="Browse for executable"
												>
													<div class="i-mdi-folder-open w-4 h-4" />
												</Button>
											</div>
										</TextFieldRoot>
									</Show>

									<TextFieldRoot>
										<TextFieldLabel for="args">
											Arguments{" "}
											<span class="text-muted-foreground font-normal text-xs">
												(one per line)
											</span>
										</TextFieldLabel>
										<TextArea
											id="args"
											rows={3}
											value={customArgsText()}
											onInput={(e: InputEvent) =>
												setCustomArgsText(
													(e.currentTarget as HTMLTextAreaElement).value,
												)
											}
											placeholder={"--flag\n--path ${workspace_path}"}
											class="font-mono text-sm resize-none"
										/>
									</TextFieldRoot>

									<TextFieldRoot>
										<TextFieldLabel for="workdir">
											Working Directory
										</TextFieldLabel>
										<div class="flex gap-2">
											<TextField
												id="workdir"
												value={customWorkingDirectory()}
												onInput={(e: InputEvent) =>
													setCustomWorkingDirectory(
														(e.currentTarget as HTMLInputElement).value,
													)
												}
												placeholder="Leave blank for default"
												class="flex-1 font-mono"
											/>
											<Button
												type="button"
												variant="outline"
												size="icon"
												onClick={handlePickWorkingDirectory}
												title="Browse for directory"
											>
												<div class="i-mdi-folder-open w-4 h-4" />
											</Button>
										</div>
									</TextFieldRoot>

									<Show when={customCommandPreview()}>
										{(preview) => (
											<div class="rounded-md bg-muted px-3 py-2">
												<p class="text-xs text-muted-foreground mb-1">
													Preview
												</p>
												<code class="text-sm font-mono break-all">
													{preview()}
												</code>
												<Show when={customWorkingDirectory().trim()}>
													<p class="text-xs text-muted-foreground mt-1">
														in {customWorkingDirectory().trim()}
													</p>
												</Show>
											</div>
										)}
									</Show>

									<div class="flex justify-end">
										<Button
											variant="ghost"
											size="sm"
											class="text-muted-foreground h-7 text-xs"
											onClick={handleSaveCustomTool}
											disabled={!canSaveCustomTool() || savingCustomTool()}
										>
											<Show when={savingCustomTool()}>
												<div class="mr-1.5 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
											</Show>
											<div class="i-mdi-content-save-outline w-3.5 h-3.5 mr-1.5" />
											Save as Global Tool
										</Button>
									</div>
								</div>
							</Show>
						</div>

						<Collapsible open={showAdvanced()} onOpenChange={setShowAdvanced}>
							<CollapsibleTrigger
								as={Button}
								variant="ghost"
								class="w-full justify-between h-8 px-2 text-sm text-muted-foreground hover:text-foreground -mx-2"
								type="button"
							>
								<span class="flex items-center gap-2">
									<div class="i-mdi-tune w-4 h-4" />
									Advanced
								</span>
								<div
									class={cn(
										"i-mdi-chevron-down w-4 h-4 transition-transform",
										showAdvanced() && "rotate-180",
									)}
								/>
							</CollapsibleTrigger>
							<CollapsibleContent class="mt-3 space-y-4 rounded-lg bg-elevated-2 p-4">
								<div class="grid grid-cols-2 gap-x-6 gap-y-4">
									<div class="flex items-center justify-between">
										<div>
											<p class="text-sm font-medium">Detached</p>
											<p class="text-xs text-muted-foreground">
												Run in background
											</p>
										</div>
										<Switch checked={detached()} onChange={setDetached}>
											<SwitchControl>
												<SwitchThumb />
											</SwitchControl>
										</Switch>
									</div>

									<div class="flex items-center justify-between">
										<div>
											<p class="text-sm font-medium">Track Process</p>
											<p class="text-xs text-muted-foreground">
												Monitor lifecycle
											</p>
										</div>
										<Switch checked={trackProcess()} onChange={setTrackProcess}>
											<SwitchControl>
												<SwitchThumb />
											</SwitchControl>
										</Switch>
									</div>

									<div class="flex items-center justify-between">
										<div>
											<p class="text-sm font-medium">Auto-launch</p>
											<p class="text-xs text-muted-foreground">
												Start with app
											</p>
										</div>
										<Switch checked={autoLaunch()} onChange={setAutoLaunch}>
											<SwitchControl>
												<SwitchThumb />
											</SwitchControl>
										</Switch>
									</div>

									<div class="flex gap-3">
										<TextFieldRoot class="flex-1">
											<TextFieldLabel for="timeout">Timeout (s)</TextFieldLabel>
											<TextField
												id="timeout"
												type="number"
												value={
													timeoutSeconds() == null
														? ""
														: (timeoutSeconds()?.toString() ?? "")
												}
												onInput={(e: InputEvent) => {
													const raw = (
														e.currentTarget as HTMLInputElement
													).value.trim();
													setTimeoutSeconds(raw === "" ? null : Number(raw));
												}}
												placeholder="30"
											/>
										</TextFieldRoot>

										<TextFieldRoot class="flex-1">
											<TextFieldLabel for="order">Order</TextFieldLabel>
											<TextField
												id="order"
												type="number"
												value={orderIndex().toString()}
												onInput={(e: InputEvent) => {
													const raw = (e.currentTarget as HTMLInputElement)
														.value;
													setOrderIndex(raw === "" ? 0 : Number(raw));
												}}
												placeholder="0"
											/>
										</TextFieldRoot>
									</div>
								</div>
							</CollapsibleContent>
						</Collapsible>

						<Show when={missingVariables().length > 0}>
							<div class="rounded-md bg-accent/50 px-3 py-2.5 flex items-start gap-2">
								<div class="i-mdi-information-outline w-4 h-4 text-primary shrink-0 mt-0.5" />
								<p class="text-sm">
									<span class="font-medium">New variables will be created: </span>
									<span class="font-mono text-xs">
										{missingVariables().join(", ")}
									</span>
								</p>
							</div>
						</Show>
					</div>

					<DialogFooter class="shrink-0 flex justify-end gap-2">
						<Button
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={loading()}
						>
							Cancel
						</Button>
						<Button
							onClick={handleSubmit}
							disabled={!canSubmit() || loading()}
						>
							<Show when={loading()}>
								<div class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
							</Show>
							{props.action ? "Save Changes" : "Create Action"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};
