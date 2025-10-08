import { type Component, createSignal, For, Show } from "solid-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToolStore } from "@/store/tool";
import { useWorkspaceStore } from "@/store/workspace";

interface ImportDialogProps {
 trigger: Component<{ onClick?: () => void }>;
}

export const ImportDialog: Component<ImportDialogProps> = (props) => {
 const [open, setOpen] = createSignal(false);
 const workspaceStore = useWorkspaceStore();
 const [, actionActions] = useActionStore();
 const [, toolActions] = useToolStore();
 const [importData, setImportData] = createSignal<ExportData | null>(null);
 const [selectedWorkspaces, setSelectedWorkspaces] = createSignal<Set<number>>(
  new Set<number>()
 );
 const [selectedActions, setSelectedActions] = createSignal<Set<number>>(
  new Set<number>()
 );
 const [selectedTools, setSelectedTools] = createSignal<Set<number>>(
  new Set<number>()
 );
 const [renamedWorkspaces, setRenamedWorkspaces] = createSignal<
  Map<number, string>
 >(new Map());
 const [renamedActions, setRenamedActions] = createSignal<Map<number, string>>(
  new Map()
 );

 const handleFileInput = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
   try {
    const data = JSON.parse(e.target?.result as string) as ExportData;
    setImportData(data);
    setSelectedWorkspaces(
     new Set<number>(data.workspaces?.map((w: { id: number }) => w.id) || [])
    );
    setSelectedActions(
     new Set<number>(data.actions?.map((a: { id: number }) => a.id) || [])
    );
    setSelectedTools(
     new Set<number>(data.tools?.map((t: { id: number }) => t.id) || [])
    );
   } catch (err) {
    showToast({
     title: "Error",
     description: `Failed to parse JSON: ${err}`,
     variant: "destructive",
    });
   }
  };
  reader.readAsText(file);
 };

 const handleClipboardInput = async () => {
  try {
   const text = await navigator.clipboard.readText();
   const data = JSON.parse(text) as ExportData;
   setImportData(data);
   setSelectedWorkspaces(
    new Set<number>(data.workspaces?.map((w: { id: number }) => w.id) || [])
   );
   setSelectedActions(
    new Set<number>(data.actions?.map((a: { id: number }) => a.id) || [])
   );
   setSelectedTools(
    new Set<number>(data.tools?.map((t: { id: number }) => t.id) || [])
   );
  } catch (err) {
   showToast({
    title: "Error",
    description: `Failed to read clipboard: ${err}`,
    variant: "destructive",
   });
  }
 };

 const toggleWorkspace = (id: number) => {
  const newSet = new Set<number>(selectedWorkspaces());
  if (newSet.has(id)) newSet.delete(id);
  else newSet.add(id);
  setSelectedWorkspaces(newSet);
 };

 const toggleAction = (id: number) => {
  const newSet = new Set<number>(selectedActions());
  if (newSet.has(id)) newSet.delete(id);
  else newSet.add(id);
  setSelectedActions(newSet);
 };

 const toggleTool = (id: number) => {
  const newSet = new Set<number>(selectedTools());
  if (newSet.has(id)) newSet.delete(id);
  else newSet.add(id);
  setSelectedTools(newSet);
 };

 const selectAllWorkspaces = () =>
  setSelectedWorkspaces(
   new Set<number>(
    importData()?.workspaces?.map((w: { id: number }) => w.id) || []
   )
  );
 const deselectAllWorkspaces = () => setSelectedWorkspaces(new Set<number>());
 const selectAllActions = () =>
  setSelectedActions(
   new Set<number>(
    importData()?.actions?.map((a: { id: number }) => a.id) || []
   )
  );
 const deselectAllActions = () => setSelectedActions(new Set<number>());
 const selectAllTools = () =>
  setSelectedTools(
   new Set<number>(importData()?.tools?.map((t: { id: number }) => t.id) || [])
  );
 const deselectAllTools = () => setSelectedTools(new Set<number>());

 const handleWorkspaceRename = (id: number, newName: string) => {
  const newMap = new Map(renamedWorkspaces());
  if (newName.trim()) newMap.set(id, newName);
  else newMap.delete(id);
  setRenamedWorkspaces(newMap);
 };

 const handleActionRename = (id: number, newName: string) => {
  const newMap = new Map(renamedActions());
  if (newName.trim()) newMap.set(id, newName);
  else newMap.delete(id);
  setRenamedActions(newMap);
 };

 const getWorkspaceName = (workspace: { id: number; name: string }) => {
  return renamedWorkspaces().get(workspace.id) || workspace.name;
 };

 const getActionName = (action: { id: number; name: string }) => {
  return renamedActions().get(action.id) || action.name;
 };

 const isDuplicateWorkspaceName = (id: number) => {
  const name = getWorkspaceName(
   importData()?.workspaces?.find((w: { id: number }) => w.id === id) || {
    id,
    name: "",
   }
  );
  const allNames = (importData()?.workspaces || [])
   .filter((w: { id: number }) => selectedWorkspaces().has(w.id))
   .map((w: { id: number; name: string }) => getWorkspaceName(w));
  return allNames.filter((n: string) => n === name).length > 1;
 };

 const isDuplicateActionName = (id: number) => {
  const name = getActionName(
   importData()?.actions?.find((a: { id: number }) => a.id === id) || {
    id,
    name: "",
   }
  );
  const allNames = (importData()?.actions || [])
   .filter((a: { id: number }) => selectedActions().has(a.id))
   .map((a: { id: number; name: string }) => getActionName(a));
  return allNames.filter((n: string) => n === name).length > 1;
 };

 const handleImport = async () => {
  const data = importData();
  if (!data) return;

  try {
   const workspaceIdMap = new Map<number, number>();
   let importedCount = 0;

   for (const workspace of data.workspaces || []) {
    if (!selectedWorkspaces().has(workspace.id)) continue;
    const workspaceName =
     renamedWorkspaces().get(workspace.id) || workspace.name;
    const newWorkspace = await workspaceStore.actions.createWorkspace({
     name: workspaceName,
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
    const newTool = await toolActions.createTool({
     name: tool.name,
     description: tool.description || undefined,
     icon: tool.icon || undefined,
     enabled: tool.enabled,
     tool_type: tool.tool_type,
     template: tool.template,
     placeholders: tool.placeholders || "[]",
     category: tool.category || undefined,
    });
    if (newTool) importedCount++;
   }

   for (const action of data.actions || []) {
    if (!selectedActions().has(action.id)) continue;
    const actionName = renamedActions().get(action.id) || action.name;
    await actionActions.addAction({
     name: actionName,
     workspace_id: action.workspace_id
      ? workspaceIdMap.get(action.workspace_id) || action.workspace_id
      : 0,
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

   setImportData(null);
   setSelectedWorkspaces(new Set<number>());
   setSelectedActions(new Set<number>());
   setSelectedTools(new Set<number>());
   setRenamedWorkspaces(new Map());
   setRenamedActions(new Map());
   setOpen(false);
   showToast({
    title: "Success",
    description: `Imported ${importedCount} items`,
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
            {(workspace) => (
             <div
              class="flex items-center gap-2 p-2 rounded transition-colors cursor-pointer"
              classList={{
               "bg-accent/50 border border-accent": selectedWorkspaces().has(
                workspace.id
               ),
               "hover:bg-muted/50": !selectedWorkspaces().has(workspace.id),
               "border-destructive border-2": isDuplicateWorkspaceName(
                workspace.id
               ),
              }}
              onClick={() => toggleWorkspace(workspace.id)}
             >
              <Checkbox
               checked={selectedWorkspaces().has(workspace.id)}
               onChange={() => toggleWorkspace(workspace.id)}
              />
              <Show
               when={selectedWorkspaces().has(workspace.id)}
               fallback={<span class="flex-1">{workspace.name}</span>}
              >
               <TextFieldRoot class="flex-1">
                <TextField
                 value={getWorkspaceName(workspace)}
                 onInput={(e: InputEvent) =>
                  handleWorkspaceRename(
                   workspace.id,
                   (e.currentTarget as HTMLInputElement).value
                  )
                 }
                 onClick={(e: MouseEvent) => e.stopPropagation()}
                />
               </TextFieldRoot>
              </Show>
             </div>
            )}
           </For>
          </div>
         </div>
        </Show>

        <Show when={(importData()?.actions?.length || 0) > 0}>
         <div class="space-y-2">
          <div class="flex items-center justify-between">
           <h3 class="text-lg font-semibold">
            Actions <Badge>{importData()?.actions?.length || 0}</Badge>
           </h3>
           <div class="flex gap-2">
            <Button size="sm" variant="outline" onClick={selectAllActions}>
             Select All
            </Button>
            <Button size="sm" variant="outline" onClick={deselectAllActions}>
             Deselect All
            </Button>
           </div>
          </div>
          <div class="space-y-2 border rounded-md p-4">
           <For each={importData()?.actions || []}>
            {(action) => (
             <div
              class="flex items-center gap-2 p-2 rounded transition-colors cursor-pointer"
              classList={{
               "bg-accent/50 border border-accent": selectedActions().has(
                action.id
               ),
               "hover:bg-muted/50": !selectedActions().has(action.id),
               "border-destructive border-2": isDuplicateActionName(action.id),
              }}
              onClick={() => toggleAction(action.id)}
             >
              <Checkbox
               checked={selectedActions().has(action.id)}
               onChange={() => toggleAction(action.id)}
              />
              <Show
               when={selectedActions().has(action.id)}
               fallback={
                <span class="flex-1">
                 {action.name}{" "}
                 <Badge variant="secondary">{action.action_type}</Badge>
                </span>
               }
              >
               <div class="flex items-center gap-2 flex-1">
                <TextFieldRoot class="flex-1">
                 <TextField
                  value={getActionName(action)}
                  onInput={(e: InputEvent) =>
                   handleActionRename(
                    action.id,
                    (e.currentTarget as HTMLInputElement).value
                   )
                  }
                  onClick={(e: MouseEvent) => e.stopPropagation()}
                 />
                </TextFieldRoot>
                <Badge variant="secondary">{action.action_type}</Badge>
               </div>
              </Show>
             </div>
            )}
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
            {(tool) => (
             <div
              class="flex items-center gap-2 p-2 rounded transition-colors cursor-pointer"
              classList={{
               "bg-accent/50 border border-accent": selectedTools().has(
                tool.id
               ),
               "hover:bg-muted/50": !selectedTools().has(tool.id),
              }}
              onClick={() => toggleTool(tool.id)}
             >
              <Checkbox
               checked={selectedTools().has(tool.id)}
               onChange={() => toggleTool(tool.id)}
              />
              <span class="flex-1">
               {tool.name} <Badge variant="secondary">{tool.tool_type}</Badge>
              </span>
              <span class="text-sm text-muted-foreground truncate max-w-xs">
               {tool.template}
              </span>
             </div>
            )}
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
         selectedTools().size > 0
        }
       >
        <span>
         Selected: {selectedWorkspaces().size} workspace
         {selectedWorkspaces().size !== 1 ? "s" : ""}, {selectedActions().size}{" "}
         action
         {selectedActions().size !== 1 ? "s" : ""}, {selectedTools().size} tool
         {selectedTools().size !== 1 ? "s" : ""}
        </span>
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
          selectedTools().size === 0)
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
