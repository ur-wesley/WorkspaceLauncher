import { defineStepper } from "@stepperize/solid";
import { type Component, createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import * as v from "valibot";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { StepperContent, StepperIndicator, StepperNavigation } from "@/components/ui/stepper";
import { Switch, SwitchControl, SwitchThumb } from "@/components/ui/switch";
import { TextArea } from "@/components/ui/textarea";
import { TextField, TextFieldLabel, TextFieldRoot } from "@/components/ui/textfield";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/libs/cn";
import { pickDirectory, pickExecutable } from "@/libs/filePicker";
import { showToast } from "@/libs/toast";
import { useActionStore } from "@/store/action";
import { useToolStore } from "@/store/tool";
import { useVariableStore } from "@/store/variable";
import type {
	Action,
	CustomToolActionConfig,
	NewAction,
	NewTool,
	PlaceholderDefinition,
	SavedToolActionConfig,
	Tool,
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

const { useStepper } = defineStepper(
	{ id: "basic", title: "Basic Info", description: "Name your action" },
	{ id: "tool", title: "Tool Selection", description: "Choose how to run" },
	{ id: "config", title: "Configuration", description: "Set parameters" },
	{
		id: "advanced",
		title: "Review",
		description: "Finalize settings",
		optional: true,
	},
);

type ActionDialogStepperProps = {
	workspaceId: string;
	action?: Action;
	trigger: Component<{ onClick?: () => void }>;
	onClose?: () => void;
	forceOpen?: boolean;
};

export const ActionDialogStepper: Component<ActionDialogStepperProps> = (props) => {
	const [actionStore, actionActions] = useActionStore();
	const [toolStore, toolActions] = useToolStore();
	const [variableStore, variableActions] = useVariableStore();

	const stepper = useStepper({ initialStep: "basic" });

	const [open, setOpen] = createSignal(false);
	const isOpen = () => (props.forceOpen !== undefined ? props.forceOpen : open());
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
	const [placeholderValues, setPlaceholderValues] = createSignal<Record<string, string>>({});
	const [missingVariables, setMissingVariables] = createSignal<string[]>([]);

	const initialTimeout =
		props.action && typeof props.action.timeout_seconds === "number" ? props.action.timeout_seconds : 30;
	const [timeoutSeconds, setTimeoutSeconds] = createSignal<number | null>(initialTimeout);
	const [orderIndex, setOrderIndex] = createSignal<number>(props.action?.order_index ?? actionStore.actions.length);
	const [detached, setDetached] = createSignal<boolean>(props.action?.detached ?? false);
	const [trackProcess, setTrackProcess] = createSignal<boolean>(props.action?.track_process ?? true);

	const [customToolName, setCustomToolName] = createSignal("");
	const [customToolType, setCustomToolType] = createSignal<CustomToolType>("cli");
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
				type: "cd-compound",
				workingDirectory: cleanDir,
				command: parts[0],
				args: parts.slice(1).join(" "),
				original: cmd,
			};
		}

		const cdDPattern = /^cd\s+\/d\s+([^&]+)\s*&&\s*(.+)$/i;
		const cdDMatch = cmd.match(cdDPattern);
		if (cdDMatch) {
			const [, dir, actualCmd] = cdDMatch;
			const cleanDir = dir.trim().replace(/^["']|["']$/g, "");
			const parts = actualCmd.trim().split(/\s+/);
			return {
				type: "cd-compound",
				workingDirectory: cleanDir,
				command: parts[0],
				args: parts.slice(1).join(" "),
				original: cmd,
			};
		}

		return null;
	});

	const allowedTools = createMemo(() => toolStore.tools.filter((tool) => tool.enabled));
	const selectedTool = createMemo<Tool | null>(() => {
		const id = selectedToolId();
		if (id == null) {
			return null;
		}
		return toolStore.tools.find((tool) => tool.id === id) ?? null;
	});

	const toolPlaceholders = createMemo(() => {
		if (toolMode() !== "saved") {
			return [] as PlaceholderDefinition[];
		}

		const tool = selectedTool();
		if (!tool) {
			return [] as PlaceholderDefinition[];
		}

		return parsePlaceholderDefinitions(tool.placeholders);
	});

	const availableVariables = createMemo(() =>
		variableStore.variables.filter((variable) => variable.enabled).map((variable) => variable.key),
	);

	const customCommandPreview = createMemo(() => {
		if (toolMode() !== "custom") {
			return "";
		}

		const args = parseArgsText(customArgsText());
		if (customToolType() === "cli") {
			const base = customCommand().trim();
			return [base, ...args]
				.filter((segment) => segment.length > 0)
				.join(" ")
				.trim();
		}

		const base = customBinaryPath().trim();
		return [base, ...args]
			.filter((segment) => segment.length > 0)
			.join(" ")
			.trim();
	});

	const canSaveCustomTool = createMemo(() => {
		if (toolMode() !== "custom") {
			return false;
		}
		const nameValue = (customToolName().trim() || name().trim()).length > 0;
		if (!nameValue) {
			return false;
		}

		if (customToolType() === "cli") {
			return customCommand().trim().length > 0;
		}

		return customBinaryPath().trim().length > 0;
	});

	const isBasicInfoValid = () => {
		const result = v.safeParse(basicInfoSchema, { name: name() });
		return result.success;
	};

	const isToolSelectionValid = () => {
		if (toolMode() === "saved") {
			return selectedToolId() !== null;
		}
		return true;
	};

	const isSavedModeValid = () => {
		const tool = selectedTool();
		if (!tool) {
			return false;
		}

		return toolPlaceholders().every((placeholder) => {
			if (!placeholder.required) {
				return true;
			}
			const value = placeholderValues()[placeholder.name];
			return Boolean(value && value.trim().length > 0);
		});
	};

	const isCustomModeValid = () => {
		const trimmedName = customToolName().trim();
		if (trimmedName.length === 0) {
			return false;
		}

		return customToolType() === "cli" ? customCommand().trim().length > 0 : customBinaryPath().trim().length > 0;
	};

	const isConfigValid = () => {
		if (toolMode() === "saved") {
			return isSavedModeValid();
		}

		if (toolMode() === "custom") {
			return isCustomModeValid();
		}

		return false;
	};

	const canGoNext = createMemo(() => {
		const current = stepper.current.id;
		if (current === "basic") {
			return isBasicInfoValid();
		}
		if (current === "tool") {
			return isToolSelectionValid();
		}
		if (current === "config") {
			return isConfigValid();
		}
		return true;
	});

	const canSubmit = createMemo(() => {
		return isBasicInfoValid() && isToolSelectionValid() && isConfigValid();
	});

	const applyCommandSuggestion = () => {
		const suggestion = commandSuggestion();
		if (!suggestion) return;

		setCustomWorkingDirectory(suggestion.workingDirectory);
		setCustomCommand(suggestion.command);
		setCustomArgsText(suggestion.args);

		showToast({
			title: "Command fixed!",
			description: "Separated directory, command, and arguments into proper fields.",
			variant: "success",
		});
	};

	const handlePickExecutable = async () => {
		const path = await pickExecutable({ title: "Select Executable" });
		if (path) {
			setCustomBinaryPath(path);
		}
	};

	const handlePickWorkingDirectory = async () => {
		const path = await pickDirectory({ title: "Select Working Directory" });
		if (path) {
			setCustomWorkingDirectory(path);
		}
	};

	const applySavedConfig = (config: SavedToolActionConfig) => {
		setToolMode("saved");
		setSelectedToolId(config.tool_id);
		setPlaceholderValues(config.placeholder_values ?? {});
		resetCustomFields();
	};

	const applyCustomConfig = (config: CustomToolActionConfig, fallbackName: string) => {
		setToolMode("custom");
		setCustomToolName(config.tool_name ?? fallbackName);
		setCustomToolType(config.tool_type ?? "cli");
		setCustomCommand(config.command ?? "");
		setCustomBinaryPath(config.binary_path ?? "");
		setCustomArgsText((config.args ?? []).join("\n"));
		setCustomWorkingDirectory(config.working_directory ?? "");
		setSelectedToolId(null);
		setPlaceholderValues({});
	};

	const resetCustomFields = () => {
		setCustomToolName("");
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
		// Reset all fields first to ensure clean state
		resetCustomFields();
		setPlaceholderValues({});
		setMissingVariables([]);
		setShowAdvanced(false);

		// Set basic action properties
		setName(action.name);
		setOrderIndex(action.order_index);
		setTimeoutSeconds(action.timeout_seconds ?? null);
		setDetached(action.detached ?? false);
		setTrackProcess(action.track_process ?? true);

		// Parse and apply configuration
		const parsedConfig = parseToolActionConfig(action.config);
		if (parsedConfig?.source === "saved") {
			applySavedConfig(parsedConfig);
			return;
		}

		if (parsedConfig?.source === "custom") {
			applyCustomConfig(parsedConfig, action.name);
			return;
		}

		// Fallback to default tool selection
		chooseDefaultTool();
	};

	const configureForNewAction = () => {
		// Reset all fields first to ensure clean state
		resetCustomFields();
		setPlaceholderValues({});
		setMissingVariables([]);
		setShowAdvanced(false);

		// Set default values for new action
		setName("");
		setOrderIndex(actionStore.actions.length);
		setTimeoutSeconds(30);
		setDetached(false);
		setTrackProcess(true);

		// Choose appropriate default tool
		chooseDefaultTool();
	};

	const buildSavedActionConfig = (): SavedToolActionConfig | null => {
		const tool = selectedTool();
		if (!tool) {
			showToast({
				title: "Missing Tool",
				description: "Please choose a saved tool before saving the action.",
				variant: "destructive",
			});
			return null;
		}

		const placeholders = toolPlaceholders();
		return {
			type: "tool",
			source: "saved",
			tool_id: tool.id,
			tool_name: tool.name,
			tool_type: tool.tool_type,
			template: tool.template,
			placeholder_values: normalizePlaceholderValues(placeholders, placeholderValues()),
		};
	};

	const buildCustomActionConfig = (): CustomToolActionConfig => {
		const trimmedName = customToolName().trim();
		const trimmedCommand = customCommand().trim();
		const trimmedBinaryPath = customBinaryPath().trim();
		const args = parseArgsText(customArgsText());
		const workingDir = customWorkingDirectory().trim();

		return {
			type: "tool",
			source: "custom",
			tool_name: trimmedName,
			tool_type: customToolType(),
			command: customToolType() === "cli" ? trimmedCommand : undefined,
			binary_path: customToolType() === "binary" ? trimmedBinaryPath : undefined,
			args: args.length > 0 ? args : undefined,
			working_directory: workingDir.length > 0 ? workingDir : null,
		};
	};

	const buildActionConfig = (): ToolActionConfig | null => {
		return toolMode() === "saved" ? buildSavedActionConfig() : buildCustomActionConfig();
	};

	const buildActionPayload = (config: ToolActionConfig): NewAction => ({
		workspace_id: Number(props.workspaceId),
		name: name().trim(),
		action_type: "tool",
		config: JSON.stringify(config),
		dependencies: props.action?.dependencies ?? null,
		timeout_seconds: timeoutSeconds(),
		detached: detached(),
		track_process: trackProcess(),
		os_overrides: props.action?.os_overrides ?? null,
		order_index: orderIndex(),
	});

	const handleSubmit = async () => {
		if (loading()) {
			return;
		}

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
					? `Action "${name().trim()}" has been updated successfully.`
					: `Action "${name().trim()}" has been created successfully.`,
				variant: "default",
			});

			setOpen(false);
			props.onClose?.();
		} catch (error) {
			console.error("ActionDialogStepper: failed to submit action", error);
			showToast({
				title: "Failed to Save Action",
				description: error instanceof Error ? error.message : String(error),
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleSaveCustomTool = async () => {
		if (!canSaveCustomTool() || savingCustomTool()) {
			return;
		}

		setSavingCustomTool(true);

		const trimmedName = customToolName().trim() || name().trim();
		const trimmedCommand = customCommand().trim();
		const trimmedBinaryPath = customBinaryPath().trim();
		const args = parseArgsText(customArgsText());
		const templateBase = customToolType() === "cli" ? trimmedCommand : trimmedBinaryPath;
		const template = args.length > 0 ? `${templateBase} ${args.join(" ")}` : templateBase;

		const newTool: NewTool = {
			name: trimmedName,
			description: `Saved from action ${name().trim() || trimmedName}`,
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
					description: `"${trimmedName}" is now available as a saved tool.`,
					variant: "success",
				});
			} else {
				showToast({
					title: "Failed to Save Tool",
					description: "Could not create the global tool. Please try again.",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("ActionDialogStepper: failed to save custom tool", error);
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
		stepper.reset();
		setName("");
		setToolMode(allowedTools().length > 0 ? "saved" : "custom");
		setSelectedToolId(allowedTools()[0]?.id ?? null);
		setPlaceholderValues({});
		setMissingVariables([]);
		setTimeoutSeconds(30);
		setOrderIndex(actionStore.actions.length);
		setDetached(false);
		setTrackProcess(true);
		setCustomToolName("");
		setCustomToolType("cli");
		setCustomCommand("");
		setCustomBinaryPath("");
		setCustomArgsText("");
		setCustomWorkingDirectory("");
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
		if (!isOpen()) {
			return;
		}

		if (toolStore.tools.length === 0 && !toolStore.isLoading) {
			void toolActions.loadTools();
		}
	});

	createEffect(() => {
		if (!isOpen()) {
			return;
		}

		const currentActionId = props.action?.id ?? null;
		const isSameAction = initializationRef.initialized && initializationRef.actionId === currentActionId;

		if (isSameAction) {
			return;
		}

		if (props.action) {
			configureForAction(props.action);
		} else {
			configureForNewAction();
		}
		initializationRef.initialized = true;
		initializationRef.actionId = currentActionId;
	});

	createEffect(() => {
		if (!open()) {
			return;
		}

		if (toolMode() === "saved") {
			setPlaceholderValues((current) => normalizePlaceholderValues(toolPlaceholders(), current));
		}
	});

	createEffect(() => {
		if (toolMode() !== "saved" && !props.action) {
			const actionName = name().trim();
			if (actionName.length > 0 && customToolName().trim().length === 0) {
				setCustomToolName(actionName);
			}
		}
	});

	createEffect(() => {
		const available = new Set(availableVariables());
		const sources =
			toolMode() === "saved"
				? Object.values(placeholderValues())
				: [customCommand(), customBinaryPath(), customArgsText(), customWorkingDirectory()];
		setMissingVariables(Array.from(gatherMissingVariables(sources, available)) as string[]);
	});

	createEffect(() => {
		if (!isOpen()) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				if (stepper.isLast && canSubmit()) {
					void handleSubmit();
				} else if (canGoNext()) {
					stepper.next();
				}
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
				<DialogContent class="max-w-3xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{props.action ? "Edit Action" : "Create New Action"}</DialogTitle>
						<DialogDescription>
							{props.action ? "Modify the action configuration." : "Create a new action step by step."}
						</DialogDescription>
					</DialogHeader>

					<StepperIndicator
						steps={stepper.all}
						currentStepId={stepper.current.id}
						onStepChange={(id: string) => stepper.goTo(id as "basic" | "tool" | "config" | "advanced")}
						class="my-6"
					/>

					<div class="min-h-[300px]">
						{stepper.switch({
							basic: () => (
								<StepperContent title="What should this action be called?">
									<TextFieldRoot>
										<TextFieldLabel for="action-name">Action Name *</TextFieldLabel>
										<TextField
											id="action-name"
											value={name()}
											onInput={(event: InputEvent) => setName((event.currentTarget as HTMLInputElement).value)}
											placeholder="e.g., Launch VS Code, Start Database, Open Browser"
											required
											autofocus
										/>
										<p class="text-xs text-muted-foreground mt-1">
											Choose a descriptive name that clearly identifies what this action does.
										</p>
									</TextFieldRoot>
								</StepperContent>
							),

							tool: () => (
								<StepperContent title="How should this action run?">
									<div class="space-y-4">
										<div>
											<div class="text-sm font-medium mb-2">Action uses</div>
											<ToggleGroup
												class="justify-start"
												value={toolMode()}
												onChange={(value) => {
													if (value === "saved" || value === "custom") {
														setToolMode(value);
													}
												}}
											>
												<ToggleGroupItem value="saved" disabled={allowedTools().length === 0}>
													<div class="i-mdi-package-variant w-4 h-4 mr-2" />
													Saved Tool
												</ToggleGroupItem>
												<ToggleGroupItem value="custom">
													<div class="i-mdi-console w-4 h-4 mr-2" />
													Custom Command
												</ToggleGroupItem>
											</ToggleGroup>
											<Show when={allowedTools().length === 0}>
												<p class="text-xs text-muted-foreground mt-2">
													No saved tools found. Create a custom command or save one globally to reuse later.
												</p>
											</Show>
										</div>

										<Show when={toolMode() === "saved"}>
											<div>
												<div class="text-sm font-medium mb-2">Select Tool *</div>
												<select
													id="tool-select"
													class="flex h-9 w-full items-center justify-between rounded-md bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus-visible:(ring-1.5 ring-ring) disabled:(cursor-not-allowed opacity-50) transition-shadow"
													value={selectedToolId()?.toString() ?? ""}
													onChange={(event) => {
														const value = event.currentTarget.value;
														setSelectedToolId(value ? Number(value) : null);
														setPlaceholderValues({});
													}}
													required
												>
													<option value="">Choose a tool...</option>
													<For each={allowedTools()}>
														{(tool) => <option value={tool.id.toString()}>{tool.name}</option>}
													</For>
												</select>
												<Show when={selectedTool()}>
													{(tool) => (
														<div class="mt-3">
															<p class="text-xs text-muted-foreground mb-2">{tool().description}</p>
															<div class="p-3 bg-muted rounded-md">
																<p class="text-xs font-medium mb-1">Command Template</p>
																<code class="text-xs font-mono break-all">{tool().template}</code>
															</div>
														</div>
													)}
												</Show>
											</div>
										</Show>
									</div>
								</StepperContent>
							),

							config: () => (
								<StepperContent
									title={toolMode() === "saved" ? "Configure the tool parameters" : "Set up your custom command"}
								>
									<div class="space-y-4">
										<Show when={toolMode() === "saved"}>
											<Show when={toolPlaceholders().length > 0}>
												<div class="space-y-4">
													<For each={toolPlaceholders()}>
														{(placeholder: PlaceholderDefinition) => (
															<TextFieldRoot>
																<TextFieldLabel for={`placeholder-${placeholder.name}`}>
																	{placeholder.name}
																	{placeholder.required && <span class="text-destructive ml-1">*</span>}
																</TextFieldLabel>
																<TextField
																	id={`placeholder-${placeholder.name}`}
																	value={placeholderValues()[placeholder.name] ?? ""}
																	onInput={(event: InputEvent) => {
																		const value = (event.currentTarget as HTMLInputElement).value;
																		setPlaceholderValues((current) => ({
																			...current,
																			[placeholder.name]: value,
																		}));
																	}}
																	placeholder={placeholder.description}
																	required={placeholder.required}
																/>
																<Show when={placeholder.description}>
																	<p class="text-xs text-muted-foreground mt-1">{placeholder.description}</p>
																</Show>
															</TextFieldRoot>
														)}
													</For>
												</div>
											</Show>

											<Show when={toolPlaceholders().length === 0}>
												<div class="p-4 bg-muted rounded-md text-center">
													<div class="i-mdi-check-circle w-12 h-12 mx-auto text-primary mb-2" />
													<p class="text-sm font-medium">This tool is ready to use!</p>
													<p class="text-xs text-muted-foreground mt-1">No additional configuration needed.</p>
												</div>
											</Show>
										</Show>

										<Show when={toolMode() === "custom"}>
											<div class="space-y-4">
												<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
													<TextFieldRoot>
														<TextFieldLabel for="custom-tool-name">Tool Name *</TextFieldLabel>
														<TextField
															id="custom-tool-name"
															value={customToolName()}
															onInput={(event: InputEvent) =>
																setCustomToolName((event.currentTarget as HTMLInputElement).value)
															}
															placeholder="e.g., Run Custom Script"
															required
														/>
													</TextFieldRoot>

													<div>
														<div class="text-sm font-medium mb-1">Tool Type *</div>
														<ToggleGroup
															class="justify-start"
															value={customToolType()}
															onChange={(value) => {
																if (value === "cli" || value === "binary") {
																	setCustomToolType(value);
																}
															}}
														>
															<ToggleGroupItem value="cli">CLI</ToggleGroupItem>
															<ToggleGroupItem value="binary">Binary</ToggleGroupItem>
														</ToggleGroup>
													</div>
												</div>

												<Show when={customToolType() === "cli"}>
													<div class="space-y-2">
														<TextFieldRoot>
															<TextFieldLabel for="custom-command">Command *</TextFieldLabel>
															<TextField
																id="custom-command"
																value={customCommand()}
																onInput={(event: InputEvent) =>
																	setCustomCommand((event.currentTarget as HTMLInputElement).value)
																}
																placeholder="e.g., bun, node, python"
																required
															/>
															<p class="text-xs text-muted-foreground mt-1">
																Use ${"{VAR}"} to reference workspace variables.
															</p>
														</TextFieldRoot>

														<Show when={commandSuggestion()}>
															{(suggestion) => (
																<div class="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 space-y-2">
																	<div class="flex items-start gap-2">
																		<div class="i-mdi-alert w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
																		<div class="flex-1 space-y-1">
																			<p class="text-sm font-medium text-amber-900 dark:text-amber-100">
																				Compound command detected
																			</p>
																			<p class="text-xs text-amber-800 dark:text-amber-200">
																				This command contains a directory change. It's better to use separate fields:
																			</p>
																			<div class="bg-white/50 dark:bg-black/20 rounded px-2 py-1.5 text-xs font-mono space-y-0.5">
																				<div>
																					<span class="text-muted-foreground">Working Directory:</span>{" "}
																					{suggestion().workingDirectory}
																				</div>
																				<div>
																					<span class="text-muted-foreground">Command:</span> {suggestion().command}
																				</div>
																				<Show when={suggestion().args}>
																					<div>
																						<span class="text-muted-foreground">Arguments:</span> {suggestion().args}
																					</div>
																				</Show>
																			</div>
																		</div>
																	</div>
																	<Button
																		size="sm"
																		variant="default"
																		class="w-full bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700"
																		onClick={applyCommandSuggestion}
																	>
																		<div class="i-mdi-auto-fix w-4 h-4 mr-2" />
																		Auto-fix: Separate into proper fields
																	</Button>
																</div>
															)}
														</Show>
													</div>
												</Show>

												<Show when={customToolType() === "binary"}>
													<TextFieldRoot>
														<TextFieldLabel for="custom-binary">Executable Path *</TextFieldLabel>
														<div class="flex gap-2">
															<TextField
																id="custom-binary"
																value={customBinaryPath()}
																onInput={(event: InputEvent) =>
																	setCustomBinaryPath((event.currentTarget as HTMLInputElement).value)
																}
																placeholder="C:\\Tools\\my-app.exe"
																required
																class="flex-1"
															/>
															<Button
																type="button"
																variant="outline"
																onClick={handlePickExecutable}
																title="Browse for executable"
															>
																<span class="iconify w-4 h-4" data-icon="mdi:folder-open" />
															</Button>
														</div>
														<p class="text-xs text-muted-foreground mt-1">
															Provide the full path or rely on PATH resolution.
														</p>
													</TextFieldRoot>
												</Show>

												<TextFieldRoot>
													<TextFieldLabel for="custom-args">Arguments (one per line)</TextFieldLabel>
													<TextArea
														id="custom-args"
														rows={4}
														value={customArgsText()}
														onInput={(event: InputEvent) =>
															setCustomArgsText((event.currentTarget as HTMLTextAreaElement).value)
														}
														placeholder="--flag&#10;--path ${workspace_path}"
														class="font-mono text-sm"
													/>
													<p class="text-xs text-muted-foreground mt-1">
														Each line becomes a separate argument when executed.
													</p>
												</TextFieldRoot>

												<TextFieldRoot>
													<TextFieldLabel for="custom-working-dir">Working Directory</TextFieldLabel>
													<div class="flex gap-2">
														<TextField
															id="custom-working-dir"
															value={customWorkingDirectory()}
															onInput={(event: InputEvent) =>
																setCustomWorkingDirectory((event.currentTarget as HTMLInputElement).value)
															}
															placeholder="Optional path to run command from"
															class="flex-1"
														/>
														<Button
															type="button"
															variant="outline"
															onClick={handlePickWorkingDirectory}
															title="Browse for directory"
														>
															<span class="iconify w-4 h-4" data-icon="mdi:folder-open" />
														</Button>
													</div>
													<p class="text-xs text-muted-foreground mt-1">
														Leave blank to use the default working directory.
													</p>
												</TextFieldRoot>

												<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
													<Show when={customCommandPreview()}>
														{(preview) => (
															<div class="p-3 bg-muted rounded-md flex-1">
																<p class="text-sm font-medium mb-1">Command Preview</p>
																<code class="text-sm font-mono break-all">{preview()}</code>
																<Show when={customWorkingDirectory().trim().length > 0}>
																	<p class="text-xs text-muted-foreground mt-1">
																		Working directory: {customWorkingDirectory().trim()}
																	</p>
																</Show>
															</div>
														)}
													</Show>
													<Button
														variant="outline"
														onClick={handleSaveCustomTool}
														disabled={!canSaveCustomTool() || savingCustomTool()}
													>
														<Show when={savingCustomTool()}>
															<div class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
														</Show>
														Save as Global Tool
													</Button>
												</div>
											</div>
										</Show>
									</div>
								</StepperContent>
							),

							advanced: () => (
								<StepperContent title="Review and finalize">
									<div class="space-y-4">
										<div class="p-4 bg-muted/50 rounded-lg space-y-3">
											<div>
												<p class="text-xs text-muted-foreground">Action Name</p>
												<p class="text-sm font-medium">{name()}</p>
											</div>
											<div>
												<p class="text-xs text-muted-foreground">Tool Mode</p>
												<p class="text-sm font-medium">{toolMode() === "saved" ? "Saved Tool" : "Custom Command"}</p>
											</div>
											<Show when={toolMode() === "saved" && selectedTool()}>
												{(tool) => (
													<div>
														<p class="text-xs text-muted-foreground">Tool</p>
														<p class="text-sm font-medium">{tool().name}</p>
													</div>
												)}
											</Show>
											<Show when={toolMode() === "custom" && customCommandPreview()}>
												<div>
													<p class="text-xs text-muted-foreground">Command</p>
													<code class="text-xs font-mono break-all">{customCommandPreview()}</code>
												</div>
											</Show>
										</div>

										<Show when={missingVariables().length > 0}>
											<div class="p-3 bg-accent/50 rounded-md shadow-sm">
												<div class="flex items-start gap-2">
													<div class="i-mdi-information w-4 h-4 text-primary mt-0.5" />
													<div>
														<p class="text-sm font-medium">New Environment Variables</p>
														<p class="text-sm text-muted-foreground mt-1">
															The following variables will be created with empty values:{" "}
															<span class="font-mono">{missingVariables().join(", ")}</span>
														</p>
													</div>
												</div>
											</div>
										</Show>

										<Collapsible open={showAdvanced()} onOpenChange={setShowAdvanced}>
											<CollapsibleTrigger as={Button} variant="outline" class="w-full justify-between" type="button">
												<span class="flex items-center gap-2">
													<div class="i-mdi-tune w-4 h-4" />
													Advanced Settings
												</span>
												<div
													class={cn("i-mdi-chevron-down w-4 h-4 transition-transform", showAdvanced() && "rotate-180")}
												/>
											</CollapsibleTrigger>
											<CollapsibleContent class="mt-4 space-y-4">
												<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
													<TextFieldRoot>
														<TextFieldLabel for="execution-order">Execution Order</TextFieldLabel>
														<TextField
															id="execution-order"
															type="number"
															value={orderIndex().toString()}
															onInput={(event: InputEvent) => {
																const raw = (event.currentTarget as HTMLInputElement).value;
																setOrderIndex(raw === "" ? 0 : Number(raw));
															}}
															placeholder="0"
														/>
														<p class="text-xs text-muted-foreground mt-1">Lower numbers run first.</p>
													</TextFieldRoot>

													<TextFieldRoot>
														<TextFieldLabel for="timeout-seconds">Timeout (seconds)</TextFieldLabel>
														<TextField
															id="timeout-seconds"
															type="number"
															value={timeoutSeconds() == null ? "" : (timeoutSeconds()?.toString() ?? "")}
															onInput={(event: InputEvent) => {
																const raw = (event.currentTarget as HTMLInputElement).value.trim();
																setTimeoutSeconds(raw === "" ? null : Number(raw));
															}}
															placeholder="30"
														/>
														<p class="text-xs text-muted-foreground mt-1">Leave blank for no timeout.</p>
													</TextFieldRoot>

													<div class="flex items-center justify-between space-x-2">
														<div class="space-y-0.5">
															<div class="text-sm font-medium">Run Detached</div>
															<p class="text-xs text-muted-foreground">Launch without waiting for completion</p>
														</div>
														<Switch checked={detached()} onChange={setDetached}>
															<SwitchControl>
																<SwitchThumb />
															</SwitchControl>
														</Switch>
													</div>

													<div class="flex items-center justify-between space-x-2">
														<div class="space-y-0.5">
															<div class="text-sm font-medium">Track Process</div>
															<p class="text-xs text-muted-foreground">Monitor process lifecycle</p>
														</div>
														<Switch checked={trackProcess()} onChange={setTrackProcess}>
															<SwitchControl>
																<SwitchThumb />
															</SwitchControl>
														</Switch>
													</div>
												</div>
											</CollapsibleContent>
										</Collapsible>
									</div>
								</StepperContent>
							),
						})}
					</div>

					<DialogFooter>
						<StepperNavigation
							currentStep={stepper.current}
							isFirst={stepper.isFirst}
							isLast={stepper.isLast}
							onPrevious={() => stepper.prev()}
							onNext={() => stepper.next()}
							onSubmit={handleSubmit}
							canGoNext={canGoNext()}
							canSubmit={canSubmit()}
							isLoading={loading()}
							submitLabel={props.action ? "Update Action" : "Create Action"}
							class="w-full"
						/>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};
