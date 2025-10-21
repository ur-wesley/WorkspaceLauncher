import { type Component, createSignal, For, Show } from "solid-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
 Collapsible,
 CollapsibleContent,
 CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { TextField, TextFieldRoot } from "@/components/ui/textfield";
import type { ExportData } from "@/libs/share";
import { showToast } from "@/libs/toast";
import { useActionStore } from "@/store/action";
import { useThemeStore } from "@/store/theme";
import { useToolStore } from "@/store/tool";
import { useWorkspaceStore } from "@/store/workspace";

interface ImportDialogProps {
 trigger: Component<{ onClick?: () => void }>;
}

export const ImportDialog: Component<ImportDialogProps> = (props) => {
 const [open, setOpen] = createSignal(false);
 const workspaceStore = useWorkspaceStore();
 const [, actionActions] = useActionStore();
 const [, themeActions] = useThemeStore();
 const [, toolActions] = useToolStore();

 const [importData, setImportData] = createSignal<ExportData | null>(null);
 const [selectedWorkspaces, setSelectedWorkspaces] = createSignal<Set<number>>(
  new Set()
 );
 const [selectedActions, setSelectedActions] = createSignal<Set<number>>(
  new Set()
 );
 const [selectedTools, setSelectedTools] = createSignal<Set<number>>(new Set());
 const [selectedThemes, setSelectedThemes] = createSignal<Set<number>>(
  new Set()
 );
 const [workspaceNames, setWorkspaceNames] = createSignal<Map<number, string>>(
  new Map()
 );
 const [actionNames, setActionNames] = createSignal<Map<number, string>>(
  new Map()
 );
 const [expandedWorkspaces, setExpandedWorkspaces] = createSignal<Set<number>>(
  new Set()
 );

 const resetState = () => {
  setImportData(null);
  setSelectedWorkspaces(new Set<number>());
  setSelectedActions(new Set<number>());
  setSelectedTools(new Set<number>());
  setSelectedThemes(new Set<number>());
  setWorkspaceNames(new Map<number, string>());
  setActionNames(new Map<number, string>());
  setExpandedWorkspaces(new Set<number>());
 };

 const parseJSON = (jsonString: string): ExportData => {
  return JSON.parse(jsonString) as ExportData;
 };

 const handleFileInput = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
   const text = await file.text();
   const data = parseJSON(text);
   setSelectedWorkspaces(new Set<number>());
   setSelectedActions(new Set<number>());
   setSelectedTools(new Set<number>());
   setSelectedThemes(new Set<number>());
   setWorkspaceNames(new Map<number, string>());
   setActionNames(new Map<number, string>());
   setExpandedWorkspaces(new Set<number>());
   setImportData(data);
  } catch (err) {
   showToast({
    title: "Error",
    description: `Failed to parse JSON: ${err}`,
    variant: "destructive",
   });
  }
 };

 const handleClipboardInput = async () => {
  try {
   const text = await navigator.clipboard.readText();
   const data = parseJSON(text);
   setSelectedWorkspaces(new Set<number>());
   setSelectedActions(new Set<number>());
   setSelectedTools(new Set<number>());
   setSelectedThemes(new Set<number>());
   setWorkspaceNames(new Map<number, string>());
   setActionNames(new Map<number, string>());
   setExpandedWorkspaces(new Set<number>());
   setImportData(data);
  } catch (err) {
   showToast({
    title: "Error",
    description: `Failed to read clipboard: ${err}`,
    variant: "destructive",
   });
  }
 };

 const getWorkspaceActions = (workspaceId: number) => {
  return (importData()?.actions || []).filter((action) => {
   const wsId =
    typeof (action as { workspace_id?: number }).workspace_id === "number"
     ? (action as { workspace_id?: number }).workspace_id
     : (action as { workspaceId?: number }).workspaceId;

   return Number(wsId) === workspaceId;
  });
 };

 const getWorkspaceName = (workspaceId: number): string => {
  const customName = workspaceNames().get(workspaceId);
  if (customName) return customName;
  const workspace = (importData()?.workspaces || []).find(
   (w) => w.id === workspaceId
  );
  return workspace?.name || "";
 };

 const getActionName = (actionId: number): string => {
  const customName = actionNames().get(actionId);
  if (customName) return customName;
  const action = (importData()?.actions || []).find((a) => a.id === actionId);
  return action?.name || "";
 };

 const toggleWorkspace = (workspaceId: number) => {
  const newSelected = new Set(selectedWorkspaces());
  const actions = getWorkspaceActions(workspaceId);

  if (newSelected.has(workspaceId)) {
   newSelected.delete(workspaceId);
   const newSelectedActions = new Set(selectedActions());
   for (const action of actions) {
    newSelectedActions.delete(action.id);
   }
   setSelectedActions(newSelectedActions);
   const newExpanded = new Set(expandedWorkspaces());
   newExpanded.delete(workspaceId);
   setExpandedWorkspaces(newExpanded);
  } else {
   newSelected.add(workspaceId);
   const newSelectedActions = new Set(selectedActions());
   for (const action of actions) {
    newSelectedActions.add(action.id);
   }
   setSelectedActions(newSelectedActions);
   const newExpanded = new Set(expandedWorkspaces());
   newExpanded.add(workspaceId);
   setExpandedWorkspaces(newExpanded);
  }

  setSelectedWorkspaces(newSelected);
 };

 const toggleAction = (actionId: number) => {
  const newSelected = new Set(selectedActions());
  if (newSelected.has(actionId)) {
   newSelected.delete(actionId);
  } else {
   newSelected.add(actionId);
  }
  setSelectedActions(newSelected);
 };

 const toggleTool = (toolId: number) => {
  const newSelected = new Set(selectedTools());
  if (newSelected.has(toolId)) {
   newSelected.delete(toolId);
  } else {
   newSelected.add(toolId);
  }
  setSelectedTools(newSelected);
 };

 const toggleTheme = (themeId: number) => {
  const newSelected = new Set(selectedThemes());
  if (newSelected.has(themeId)) {
   newSelected.delete(themeId);
  } else {
   newSelected.add(themeId);
  }
  setSelectedThemes(newSelected);
 };

 const toggleExpanded = (workspaceId: number) => {
  const newExpanded = new Set(expandedWorkspaces());
  if (newExpanded.has(workspaceId)) {
   newExpanded.delete(workspaceId);
  } else {
   newExpanded.add(workspaceId);
  }
  setExpandedWorkspaces(newExpanded);
 };

 const selectAllWorkspaces = () => {
  const allWorkspaceIds = (importData()?.workspaces || []).map((w) => w.id);
  setSelectedWorkspaces(new Set(allWorkspaceIds));
  setExpandedWorkspaces(new Set(allWorkspaceIds));
  const allActionIds = (importData()?.actions || []).map((a) => a.id);
  setSelectedActions(new Set(allActionIds));
 };

 const deselectAllWorkspaces = () => {
  setSelectedWorkspaces(new Set<number>());
  setSelectedActions(new Set<number>());
  setExpandedWorkspaces(new Set<number>());
 };

 const selectAllTools = () => {
  const allToolIds = (importData()?.tools || []).map((t) => t.id);
  setSelectedTools(new Set(allToolIds));
 };

 const deselectAllTools = () => {
  setSelectedTools(new Set<number>());
 };

 const selectAllThemes = () => {
  const allThemeIds = (importData()?.themes || []).map((t) => t.id);
  setSelectedThemes(new Set(allThemeIds));
 };

 const deselectAllThemes = () => {
  setSelectedThemes(new Set<number>());
 };

 const updateWorkspaceName = (workspaceId: number, name: string) => {
  const newNames = new Map(workspaceNames());
  if (name.trim()) {
   newNames.set(workspaceId, name);
  } else {
   newNames.delete(workspaceId);
  }
  setWorkspaceNames(newNames);
 };

 const updateActionName = (actionId: number, name: string) => {
  const newNames = new Map(actionNames());
  if (name.trim()) {
   newNames.set(actionId, name);
  } else {
   newNames.delete(actionId);
  }
  setActionNames(newNames);
 };

 const getExistingWorkspaceNames = (): Set<string> => {
  return new Set(
   (workspaceStore.store.workspaces || []).map((w) => w.name.toLowerCase())
  );
 };

 const hasWorkspaceNameConflict = (): boolean => {
  const existingNames = getExistingWorkspaceNames();
  const selectedWorkspaceNames = new Map<string, number>();

  for (const wsId of selectedWorkspaces()) {
   const name = getWorkspaceName(wsId).toLowerCase();
   if (!name) continue;

   if (existingNames.has(name)) {
    return true;
   }

   const count = selectedWorkspaceNames.get(name) || 0;
   selectedWorkspaceNames.set(name, count + 1);
  }

  for (const count of selectedWorkspaceNames.values()) {
   if (count > 1) return true;
  }

  return false;
 };

 const isWorkspaceNameDuplicate = (workspaceId: number): boolean => {
  const name = getWorkspaceName(workspaceId).toLowerCase();
  if (!name) return false;

  const existingNames = getExistingWorkspaceNames();
  if (existingNames.has(name)) return true;

  let count = 0;
  for (const wsId of selectedWorkspaces()) {
   if (getWorkspaceName(wsId).toLowerCase() === name) {
    count++;
   }
  }

  return count > 1;
 };

 const handleImport = async () => {
  const data = importData();
  if (!data) return;

  try {
   let importedCount = 0;

   const workspaceIdMap = new Map<number, number>();
   for (const workspace of data.workspaces || []) {
    if (!selectedWorkspaces().has(workspace.id)) continue;

    const name = getWorkspaceName(workspace.id);
    const newWorkspace = await workspaceStore.actions.createWorkspace({
     name,
     description: workspace.description || undefined,
     icon: workspace.icon || undefined,
    });

    if (newWorkspace) {
     workspaceIdMap.set(workspace.id, newWorkspace.id);
     importedCount++;
    }
   }

   for (const tool of data.tools || []) {
    if (!selectedTools().has(tool.id)) continue;

    const result = await toolActions.createTool({
     name: tool.name,
     description: tool.description || undefined,
     icon: tool.icon || undefined,
     enabled: tool.enabled,
     tool_type: tool.tool_type,
     template: tool.template,
     placeholders: tool.placeholders || "[]",
     category: tool.category || undefined,
    });

    if (result) {
     importedCount++;
    }
   }

   for (const theme of data.themes || []) {
    if (!selectedThemes().has(theme.id)) continue;

    await themeActions.createTheme({
     name: theme.name,
     description: theme.description || undefined,
     light_colors: theme.light_colors,
     dark_colors: theme.dark_colors,
     is_predefined: theme.is_predefined,
    });

    importedCount++;
   }

   for (const action of data.actions || []) {
    if (!selectedActions().has(action.id)) continue;

    const oldWorkspaceId = action.workspace_id;
    const newWorkspaceId = oldWorkspaceId
     ? workspaceIdMap.get(oldWorkspaceId)
     : undefined;

    if (!newWorkspaceId) continue;

    const name = getActionName(action.id);
    await actionActions.addAction({
     name,
     workspace_id: newWorkspaceId,
     action_type: action.action_type,
     config: action.config,
     dependencies: action.dependencies,
     timeout_seconds: action.timeout_seconds,
     detached: action.detached,
     track_process: action.track_process,
     os_overrides: action.os_overrides,
     order_index: action.order_index,
    });

    importedCount++;
   }

   resetState();
   setOpen(false);

   showToast({
    title: "Success",
    description: `Imported ${importedCount} items`,
    variant: "success",
   });
  } catch (err) {
   showToast({
    title: "Error",
    description: `Failed to import: ${err}`,
    variant: "destructive",
   });
  }
 };

 return (
  <>
   {props.trigger({ onClick: () => setOpen(true) })}
   <Dialog open={open()} onOpenChange={setOpen}>
    <DialogContent class="max-w-4xl max-h-[80vh] overflow-y-auto">
     <DialogHeader>
      <DialogTitle>Import Data</DialogTitle>
      <DialogDescription>
       Import workspaces, actions, and tools from JSON
      </DialogDescription>
     </DialogHeader>

     <div class="space-y-4">
      <div class="flex gap-2">
       <Button
        variant="outline"
        onClick={() => document.getElementById("import-file-input")?.click()}
       >
        Load from File
       </Button>
       <Button variant="outline" onClick={handleClipboardInput}>
        Load from Clipboard
       </Button>
       <input
        id="import-file-input"
        type="file"
        accept=".json"
        class="hidden"
        onChange={handleFileInput}
       />
      </div>

      <Show when={importData()}>
       <div class="space-y-6">
        <Show when={(importData()?.workspaces?.length || 0) > 0}>
         <div class="space-y-2">
          <div class="flex items-center justify-between">
           <h3 class="text-lg font-semibold">
            Workspaces <Badge>{importData()?.workspaces?.length || 0}</Badge>
           </h3>
           <div class="flex gap-2">
            <Button size="sm" variant="outline" onClick={selectAllWorkspaces}>
             Select All
            </Button>
            <Button size="sm" variant="outline" onClick={deselectAllWorkspaces}>
             Deselect All
            </Button>
           </div>
          </div>

          <div class="space-y-2 border rounded-md p-4">
           <For each={importData()?.workspaces || []}>
            {(workspace) => {
             const isSelected = () => selectedWorkspaces().has(workspace.id);
             const isExpanded = () => expandedWorkspaces().has(workspace.id);
             const actions = () => getWorkspaceActions(workspace.id);
             const hasDuplicate = () => isWorkspaceNameDuplicate(workspace.id);

             return (
              <Collapsible
               open={isExpanded()}
               onOpenChange={() => toggleExpanded(workspace.id)}
              >
               <div
                class="flex items-center gap-2 p-2 rounded transition-colors"
                classList={{
                 "bg-accent/50 border border-accent": isSelected(),
                 "hover:bg-muted/50": !isSelected(),
                 "border-destructive border-2": hasDuplicate() && isSelected(),
                }}
               >
                <CollapsibleTrigger
                 class="i-mdi-chevron-down w-4 h-4 transition-transform flex-shrink-0"
                 classList={{
                  "rotate-0": isExpanded(),
                  "-rotate-90": !isExpanded(),
                 }}
                 onClick={(e: MouseEvent) => e.stopPropagation()}
                />
                <Checkbox
                 checked={isSelected()}
                 onChange={() => toggleWorkspace(workspace.id)}
                />
                <Show
                 when={isSelected()}
                 fallback={
                  <div class="flex-1 flex items-center justify-between gap-2">
                   <span>{workspace.name}</span>
                   <Badge variant="secondary">{actions().length}</Badge>
                  </div>
                 }
                >
                 <div class="flex-1 flex items-center gap-2">
                  <TextFieldRoot class="flex-1">
                   <TextField
                    value={getWorkspaceName(workspace.id)}
                    onInput={(e: InputEvent) =>
                     updateWorkspaceName(
                      workspace.id,
                      (e.currentTarget as HTMLInputElement).value
                     )
                    }
                    onClick={(e: MouseEvent) => e.stopPropagation()}
                   />
                  </TextFieldRoot>
                  <Badge variant="secondary">{actions().length}</Badge>
                 </div>
                </Show>
               </div>

               <CollapsibleContent>
                <Show when={actions().length > 0}>
                 <div class="ml-8 mt-1 space-y-1">
                  <For each={actions()}>
                   {(action) => {
                    const actionId = action.id;
                    const isActionSelected = () =>
                     selectedActions().has(actionId);

                    return (
                     <button
                      type="button"
                      class="flex items-center gap-2 p-2 rounded transition-colors"
                      classList={{
                       "bg-accent/30 border border-accent": isActionSelected(),
                       "hover:bg-muted/50": !isActionSelected(),
                      }}
                      onClick={() => toggleAction(actionId)}
                     >
                      <Checkbox
                       checked={isActionSelected()}
                       onChange={() => toggleAction(actionId)}
                      />
                      <Show
                       when={isActionSelected()}
                       fallback={
                        <span class="flex-1 text-sm">{action.name}</span>
                       }
                      >
                       <TextFieldRoot class="flex-1">
                        <TextField
                         value={getActionName(actionId)}
                         onInput={(e: InputEvent) =>
                          updateActionName(
                           actionId,
                           (e.currentTarget as HTMLInputElement).value
                          )
                         }
                         onClick={(e: MouseEvent) => e.stopPropagation()}
                        />
                       </TextFieldRoot>
                      </Show>
                     </button>
                    );
                   }}
                  </For>
                 </div>
                </Show>
               </CollapsibleContent>
              </Collapsible>
             );
            }}
           </For>
          </div>
         </div>
        </Show>

        <Show when={(importData()?.tools?.length || 0) > 0}>
         <div class="space-y-2">
          <div class="flex items-center justify-between">
           <h3 class="text-lg font-semibold">
            Tools <Badge>{importData()?.tools?.length || 0}</Badge>
           </h3>
           <div class="flex gap-2">
            <Button size="sm" variant="outline" onClick={selectAllTools}>
             Select All
            </Button>
            <Button size="sm" variant="outline" onClick={deselectAllTools}>
             Deselect All
            </Button>
           </div>
          </div>

          <div class="space-y-2 border rounded-md p-4">
           <For each={importData()?.tools || []}>
            {(tool) => {
             const isSelected = () => selectedTools().has(tool.id);

             return (
              <button
               type="button"
               class="flex items-center gap-2 p-2 rounded transition-colors"
               classList={{
                "bg-accent/50 border border-accent": isSelected(),
                "hover:bg-muted/50": !isSelected(),
               }}
               onClick={() => toggleTool(tool.id)}
              >
               <Checkbox
                checked={isSelected()}
                onChange={() => toggleTool(tool.id)}
               />
               <span class="flex-1">
                {tool.name} <Badge variant="secondary">{tool.tool_type}</Badge>
               </span>
               <span class="text-sm text-muted-foreground truncate max-w-xs">
                {tool.template}
               </span>
              </button>
             );
            }}
           </For>
          </div>
         </div>
        </Show>

        <Show when={(importData()?.themes?.length || 0) > 0}>
         <div class="space-y-2">
          <div class="flex items-center justify-between">
           <h3 class="text-lg font-semibold">
            Themes <Badge>{importData()?.themes?.length || 0}</Badge>
           </h3>
           <div class="flex gap-2">
            <Button size="sm" variant="outline" onClick={selectAllThemes}>
             Select All
            </Button>
            <Button size="sm" variant="outline" onClick={deselectAllThemes}>
             Deselect All
            </Button>
           </div>
          </div>

          <div class="space-y-2 border rounded-md p-4">
           <For each={importData()?.themes || []}>
            {(theme) => {
             const isSelected = () => selectedThemes().has(theme.id);

             return (
              <button
               type="button"
               class="flex items-center gap-2 p-2 rounded transition-colors"
               classList={{
                "bg-accent/50 border border-accent": isSelected(),
                "hover:bg-muted/50": !isSelected(),
               }}
               onClick={() => toggleTheme(theme.id)}
              >
               <Checkbox
                checked={isSelected()}
                onChange={() => toggleTheme(theme.id)}
               />
               <span class="flex-1">
                {theme.name}
                <Show when={theme.description}>
                 <p class="text-xs text-muted-foreground">
                  {theme.description}
                 </p>
                </Show>
               </span>
               <Show when={theme.is_predefined}>
                <span class="text-[10px] uppercase text-muted-foreground border rounded px-2 py-0.5">
                 Built-in
                </span>
               </Show>
              </button>
             );
            }}
           </For>
          </div>
         </div>
        </Show>
       </div>
      </Show>
     </div>

     <DialogFooter class="flex items-center justify-between">
      <div class="flex items-center gap-4 text-sm text-muted-foreground">
       <Show
        when={
         selectedWorkspaces().size > 0 ||
         selectedActions().size > 0 ||
         selectedTools().size > 0 ||
         selectedThemes().size > 0
        }
       >
        <span>
         Selected: {selectedWorkspaces().size} workspace
         {selectedWorkspaces().size !== 1 ? "s" : ""}, {selectedActions().size}{" "}
         action
         {selectedActions().size !== 1 ? "s" : ""}, {selectedTools().size} tool
         {selectedTools().size !== 1 ? "s" : ""}, {selectedThemes().size} theme
         {selectedThemes().size !== 1 ? "s" : ""}
        </span>
       </Show>
       <Show when={hasWorkspaceNameConflict()}>
        <span class="text-destructive">Resolve duplicate workspace names</span>
       </Show>
      </div>
      <div class="flex gap-2">
       <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
       </Button>
       <Button
        onClick={handleImport}
        disabled={
         !importData() ||
         (selectedWorkspaces().size === 0 &&
          selectedActions().size === 0 &&
          selectedTools().size === 0 &&
          selectedThemes().size === 0) ||
         hasWorkspaceNameConflict()
        }
       >
        Import Selected
       </Button>
      </div>
     </DialogFooter>
    </DialogContent>
   </Dialog>
  </>
 );
};
