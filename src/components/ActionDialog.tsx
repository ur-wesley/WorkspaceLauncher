import {
 type Component,
 createEffect,
 createMemo,
 createSignal,
 For,
 Show,
} from "solid-js";
import { Button } from "@/components/ui/button";
import {
 Dialog,
 DialogContent,
 DialogDescription,
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

type ToolMode = "saved" | "custom";
type CustomToolType = "cli" | "binary";

const VARIABLE_PATTERN = /\$\{([^}]+)\}/g;

function parsePlaceholderDefinitions(value: string): PlaceholderDefinition[] {
 if (!value) {
  return [];
 }

 try {
  const parsed = JSON.parse(value) as unknown;
  if (Array.isArray(parsed)) {
   return parsed
    .filter((item): item is PlaceholderDefinition => {
     return (
      item !== null &&
      typeof item === "object" &&
      typeof (item as { name?: unknown }).name === "string" &&
      typeof (item as { type?: unknown }).type === "string" &&
      typeof (item as { required?: unknown }).required === "boolean"
     );
    })
    .map((item) => ({
     name: item.name,
     description: typeof item.description === "string" ? item.description : "",
     required: item.required,
     type: item.type,
     default: typeof item.default === "string" ? item.default : undefined,
    }));
  }
 } catch (error) {
  console.warn("ActionDialog: failed to parse placeholder metadata", error);
 }

 return [];
}

function parseToolActionConfig(config: string): ToolActionConfig | null {
 if (!config) {
  return null;
 }

 try {
  const parsed = JSON.parse(config) as unknown;
  if (
   parsed &&
   typeof parsed === "object" &&
   (parsed as { type?: unknown }).type === "tool"
  ) {
   if ((parsed as { source?: unknown }).source === "saved") {
    return parsed as SavedToolActionConfig;
   }

   if ((parsed as { source?: unknown }).source === "custom") {
    return parsed as CustomToolActionConfig;
   }
  }
 } catch (error) {
  console.warn("ActionDialog: failed to parse action config", error);
 }

 return null;
}

function extractVariablesFromText(value: string | undefined | null): string[] {
 if (!value) {
  return [];
 }

 const matches = value.match(VARIABLE_PATTERN) ?? [];
 return matches
  .map((match) => match.slice(2, -1))
  .filter((variable) => variable.length > 0);
}

function normalizePlaceholderValues(
 placeholders: PlaceholderDefinition[],
 values: Record<string, string>
): Record<string, string> {
 const result: Record<string, string> = {};

 for (const placeholder of placeholders) {
  const hasExistingValue = placeholder.name in values;
  if (hasExistingValue) {
   result[placeholder.name] = values[placeholder.name];
   continue;
  }

  if (typeof placeholder.default === "string") {
   result[placeholder.name] = placeholder.default;
  } else {
   result[placeholder.name] = "";
  }
 }

 return result;
}

function parseArgsText(value: string): string[] {
 return value
  .split(/\r?\n/)
  .map((arg) => arg.trim())
  .filter((arg) => arg.length > 0);
}

type ActionDialogProps = {
 workspaceId: string;
 action?: Action;
 trigger: Component<{ onClick?: () => void }>;
 onClose?: () => void;
};

export const ActionDialog: Component<ActionDialogProps> = (props) => {
 const [actionStore, actionActions] = useActionStore();
 const [toolStore, toolActions] = useToolStore();
 const [variableStore] = useVariableStore();

 const [open, setOpen] = createSignal(false);
 const [loading, setLoading] = createSignal(false);
 const [savingCustomTool, setSavingCustomTool] = createSignal(false);

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
  initialTimeout
 );
 const [orderIndex, setOrderIndex] = createSignal<number>(
  props.action?.order_index ?? actionStore.actions.length
 );
 const [detached, setDetached] = createSignal<boolean>(
  props.action?.detached ?? false
 );
 const [trackProcess, setTrackProcess] = createSignal<boolean>(
  props.action?.track_process ?? true
 );

 const [customToolName, setCustomToolName] = createSignal("");
 const [customToolType, setCustomToolType] =
  createSignal<CustomToolType>("cli");
 const [customCommand, setCustomCommand] = createSignal("");
 const [customBinaryPath, setCustomBinaryPath] = createSignal("");
 const [customArgsText, setCustomArgsText] = createSignal("");
 const [customWorkingDirectory, setCustomWorkingDirectory] = createSignal("");

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

 const allowedTools = createMemo(() =>
  toolStore.tools.filter((tool) => tool.enabled)
 );
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
  variableStore.variables
   .filter((variable) => variable.enabled)
   .map((variable) => variable.key)
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

  return customToolType() === "cli"
   ? customCommand().trim().length > 0
   : customBinaryPath().trim().length > 0;
 };

 const canSubmit = createMemo(() => {
  if (!name().trim() || missingVariables().length > 0) {
   return false;
  }

  if (toolMode() === "saved") {
   return isSavedModeValid();
  }

  if (toolMode() === "custom") {
   return isCustomModeValid();
  }

  return false;
 });

 createEffect(() => {
  if (!open()) {
   return;
  }

  if (toolStore.tools.length === 0 && !toolStore.isLoading) {
   void toolActions.loadTools();
  }
 });

 const applySavedConfig = (config: SavedToolActionConfig) => {
  setToolMode("saved");
  setSelectedToolId(config.tool_id);
  setPlaceholderValues(config.placeholder_values ?? {});
 };

 const applyCustomConfig = (
  config: CustomToolActionConfig,
  fallbackName: string
 ) => {
  setToolMode("custom");
  setCustomToolName(config.tool_name ?? fallbackName);
  setCustomToolType(config.tool_type ?? "cli");
  setCustomCommand(config.command ?? "");
  setCustomBinaryPath(config.binary_path ?? "");
  setCustomArgsText((config.args ?? []).join("\n"));
  setCustomWorkingDirectory(config.working_directory ?? "");
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
  setName(action.name);
  setOrderIndex(action.order_index);
  setTimeoutSeconds(action.timeout_seconds ?? null);
  setDetached(action.detached ?? false);
  setTrackProcess(action.track_process ?? true);

  const parsedConfig = parseToolActionConfig(action.config);
  if (parsedConfig?.source === "saved") {
   applySavedConfig(parsedConfig);
   return;
  }

  if (parsedConfig?.source === "custom") {
   applyCustomConfig(parsedConfig, action.name);
   return;
  }

  chooseDefaultTool();
 };

 const configureForNewAction = () => {
  setName("");
  setOrderIndex(actionStore.actions.length);
  setTimeoutSeconds(30);
  setDetached(false);
  setTrackProcess(true);
  setPlaceholderValues({});
  resetCustomFields();
  chooseDefaultTool();
 };

 createEffect(() => {
  if (!open()) {
   return;
  }

  if (props.action) {
   configureForAction(props.action);
  } else {
   configureForNewAction();
  }
 });

 createEffect(() => {
  if (!open()) {
   return;
  }

  if (toolMode() === "saved") {
   setPlaceholderValues((current) =>
    normalizePlaceholderValues(toolPlaceholders(), current)
   );
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

 const gatherMissingVariables = (sources: string[], available: Set<string>) => {
  const missing = new Set<string>();
  for (const source of sources) {
   for (const variable of extractVariablesFromText(source)) {
    if (!available.has(variable)) {
     missing.add(variable);
    }
   }
  }
  return missing;
 };

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
  setMissingVariables(Array.from(gatherMissingVariables(sources, available)));
 });

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
   placeholder_values: normalizePlaceholderValues(
    placeholders,
    placeholderValues()
   ),
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
  return toolMode() === "saved"
   ? buildSavedActionConfig()
   : buildCustomActionConfig();
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
  if (!canSubmit() || loading()) {
   return;
  }

  setLoading(true);

  try {
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
   console.error("ActionDialog: failed to submit action", error);
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
  const templateBase =
   customToolType() === "cli" ? trimmedCommand : trimmedBinaryPath;
  const template =
   args.length > 0 ? `${templateBase} ${args.join(" ")}` : templateBase;

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
     variant: "default",
    });
   } else {
    showToast({
     title: "Failed to Save Tool",
     description: "Could not create the global tool. Please try again.",
     variant: "destructive",
    });
   }
  } catch (error) {
   console.error("ActionDialog: failed to save custom tool", error);
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
  if (props.action) {
   return;
  }

  setName("");
  setToolMode(allowedTools().length > 0 ? "saved" : "custom");
  setSelectedToolId(allowedTools()[0]?.id ?? null);
  setPlaceholderValues({});
  setMissingVariables([]);
  setTimeoutSeconds(30);
  setOrderIndex(actionStore.actions.length);
  setCustomToolName("");
  setCustomToolType("cli");
  setCustomCommand("");
  setCustomBinaryPath("");
  setCustomArgsText("");
  setCustomWorkingDirectory("");
 };

 const handleOpenChange = (isOpen: boolean) => {
  setOpen(isOpen);
  if (!isOpen) {
   resetForm();
   props.onClose?.();
  }
 };

 return (
  <>
   <props.trigger onClick={() => setOpen(true)} />
   <Dialog open={open()} onOpenChange={handleOpenChange}>
    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
     <DialogHeader>
      <DialogTitle>
       {props.action ? "Edit Action" : "Create New Action"}
      </DialogTitle>
      <DialogDescription>
       {props.action
        ? "Modify the action configuration."
        : "Create a new action for this workspace."}
      </DialogDescription>
     </DialogHeader>

     <div class="space-y-4">
      <TextFieldRoot>
       <TextFieldLabel for="action-name">Action Name *</TextFieldLabel>
       <TextField
        id="action-name"
        value={name()}
        onInput={(event: InputEvent) =>
         setName((event.currentTarget as HTMLInputElement).value)
        }
        placeholder="e.g., Launch VS Code"
        required
       />
      </TextFieldRoot>

      <div class="space-y-2">
       <div class="text-sm font-medium">Action uses</div>
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
         Saved Tool
        </ToggleGroupItem>
        <ToggleGroupItem value="custom">Custom Command</ToggleGroupItem>
       </ToggleGroup>
       <Show when={allowedTools().length === 0}>
        <p class="text-xs text-muted-foreground">
         No saved tools found. Create a custom command or save one globally to
         reuse later.
        </p>
       </Show>
      </div>

      <Show when={toolMode() === "saved"}>
       <div class="space-y-4">
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
           <p class="text-xs text-muted-foreground mt-1">
            {tool().description}
           </p>
          )}
         </Show>
        </div>

        <Show when={selectedTool()}>
         {(tool) => (
          <div class="p-3 bg-muted rounded-md">
           <p class="text-sm font-medium mb-1">Command Template</p>
           <code class="text-sm font-mono break-all">{tool().template}</code>
          </div>
         )}
        </Show>

        <Show when={toolPlaceholders().length > 0}>
         <div class="space-y-4">
          <h3 class="text-sm font-medium">Configure Arguments</h3>
          <For each={toolPlaceholders()}>
           {(placeholder) => (
            <TextFieldRoot>
             <TextFieldLabel for={`placeholder-${placeholder.name}`}>
              {placeholder.name}
              {placeholder.required && (
               <span class="text-destructive ml-1">*</span>
              )}
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
              <p class="text-xs text-muted-foreground mt-1">
               {placeholder.description}
              </p>
             </Show>
            </TextFieldRoot>
           )}
          </For>
         </div>
        </Show>
       </div>
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
         <TextFieldRoot>
          <TextFieldLabel for="custom-command">Command *</TextFieldLabel>
          <TextField
           id="custom-command"
           value={customCommand()}
           onInput={(event: InputEvent) =>
            setCustomCommand((event.currentTarget as HTMLInputElement).value)
           }
           placeholder="e.g., bun run start"
           required
          />
          <p class="text-xs text-muted-foreground mt-1">
           Use ${"{VAR}"} to reference workspace variables.
          </p>
         </TextFieldRoot>
        </Show>

        <Show when={customToolType() === "binary"}>
         <TextFieldRoot>
          <TextFieldLabel for="custom-binary">Executable Path *</TextFieldLabel>
          <div class="flex gap-2">
           <TextField
            id="custom-binary"
            value={customBinaryPath()}
            onInput={(event: InputEvent) =>
             setCustomBinaryPath(
              (event.currentTarget as HTMLInputElement).value
             )
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
         <TextFieldLabel for="custom-args">
          Arguments (one per line)
         </TextFieldLabel>
         <TextArea
          id="custom-args"
          rows={4}
          value={customArgsText()}
          onInput={(event: InputEvent) =>
           setCustomArgsText((event.currentTarget as HTMLTextAreaElement).value)
          }
          placeholder="--flag\n--path ${workspace_path}"
          class="font-mono text-sm"
         />
         <p class="text-xs text-muted-foreground mt-1">
          Each line becomes a separate argument when executed.
         </p>
        </TextFieldRoot>

        <TextFieldRoot>
         <TextFieldLabel for="custom-working-dir">
          Working Directory
         </TextFieldLabel>
         <div class="flex gap-2">
          <TextField
           id="custom-working-dir"
           value={customWorkingDirectory()}
           onInput={(event: InputEvent) =>
            setCustomWorkingDirectory(
             (event.currentTarget as HTMLInputElement).value
            )
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

      <Show when={missingVariables().length > 0}>
       <div class="p-3 bg-destructive/10 rounded-md shadow-sm">
        <div class="flex items-start gap-2">
         <div class="i-mdi-alert-circle w-4 h-4 text-destructive mt-0.5" />
         <div>
          <p class="text-sm font-medium text-destructive">
           Missing Environment Variables
          </p>
          <p class="text-sm text-muted-foreground mt-1">
           The following variables are referenced but not defined:{" "}
           <span class="font-mono">{missingVariables().join(", ")}</span>
          </p>
         </div>
        </div>
       </div>
      </Show>

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
        <p class="text-xs text-muted-foreground mt-1">
         Lower numbers run first.
        </p>
       </TextFieldRoot>

       <TextFieldRoot>
        <TextFieldLabel for="timeout-seconds">Timeout (seconds)</TextFieldLabel>
        <TextField
         id="timeout-seconds"
         type="number"
         value={
          timeoutSeconds() == null ? "" : timeoutSeconds()?.toString() ?? ""
         }
         onInput={(event: InputEvent) => {
          const raw = (event.currentTarget as HTMLInputElement).value.trim();
          setTimeoutSeconds(raw === "" ? null : Number(raw));
         }}
         placeholder="30"
        />
        <p class="text-xs text-muted-foreground mt-1">
         Leave blank for no timeout.
        </p>
       </TextFieldRoot>

       <div class="flex items-center justify-between space-x-2">
        <div class="space-y-0.5">
         <div class="text-sm font-medium">Run Detached</div>
         <p class="text-xs text-muted-foreground">
          Launch without waiting for completion (recommended for GUI apps like
          Eclipse)
         </p>
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
         <p class="text-xs text-muted-foreground">
          Monitor process lifecycle (uncheck for fire-and-forget actions like
          opening URLs or new browser tabs)
         </p>
        </div>
        <Switch checked={trackProcess()} onChange={setTrackProcess}>
         <SwitchControl>
          <SwitchThumb />
         </SwitchControl>
        </Switch>
       </div>
      </div>
     </div>

     <DialogFooter>
      <Button
       variant="outline"
       onClick={() => setOpen(false)}
       disabled={loading()}
      >
       Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={loading() || !canSubmit()}>
       <Show when={loading()}>
        <div class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
       </Show>
       {props.action ? "Update" : "Create"} Action
      </Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>
  </>
 );
};
