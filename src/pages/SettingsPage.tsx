import type { Component } from "solid-js";
import { createSignal, onMount, Show } from "solid-js";
import { DeleteToolDialog } from "@/components/DeleteToolDialog";
import { ImportDialog } from "@/components/ImportDialog";
import { ShareDialog } from "@/components/ShareDialog";
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
import { autostartHandler } from "@/libs/autostart";
import { cn } from "@/libs/cn";
import { showToast } from "@/libs/toast";
import { checkForUpdates } from "@/libs/updater";
import { useToolStore } from "@/store/tool";
import type { Tool } from "@/types/database";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { version } from "../../package.json" with { type: "json" };

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
  class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
  onClick={props.onClick}
 >
  <div class="flex items-center gap-2">
   <div class="i-mdi-delete w-4 h-4" />
   Delete
  </div>
 </button>
);

export const SettingsPage: Component = () => {
 const [toolStore, toolActions] = useToolStore();
 const [darkMode, setDarkMode] = createSignal(false);
 const [autoLaunch, setAutoLaunch] = createSignal(false);

 onMount(() => {
  toolActions.loadTools();
  const isDark =
   document.documentElement.getAttribute("data-kb-theme") === "dark";
  setDarkMode(isDark);

  autostartHandler.isEnabled().then((enabled) => {
   setAutoLaunch(enabled);
  });
 });

 const handleToggleTool = async (toolId: number, enabled: boolean) => {
  await toolActions.toggleTool(toolId, enabled);
 };

 const toggleDarkMode = () => {
  const newMode = !darkMode();
  setDarkMode(newMode);
  document.documentElement.setAttribute(
   "data-kb-theme",
   newMode ? "dark" : "light"
  );
 };

 const toggleAutoLaunch = async (enabled: boolean) => {
  try {
   await autostartHandler.toggle(enabled);
   setAutoLaunch(enabled);
   showToast({
    title: enabled ? "Autostart enabled" : "Autostart disabled",
    description: enabled
     ? "Application will start automatically when you log in"
     : "Application will not start automatically",
   });
  } catch (error) {
   showToast({
    title: "Failed to update autostart",
    description:
     error instanceof Error ? error.message : "Unknown error occurred",
    variant: "destructive",
   });
   setAutoLaunch(!enabled);
  }
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
   const category = tool.category || "Other";
   if (!groups[category]) {
    groups[category] = [];
   }
   groups[category].push(tool);
  }
  return groups;
 };

 return (
  <div class="h-full w-full flex flex-col">
   <div class="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 space-y-4">
    {/* Header */}
    <div class="flex items-center justify-between">
     <div>
      <h1 class="text-3xl font-bold">Settings</h1>
      <p class="text-muted-foreground">
       Configure tools and application preferences
      </p>
     </div>
     <a href="/settings/hotkeys" class="text-sm text-primary hover:underline">
      Hotkeys
     </a>
    </div>

    <Separator />

    {/* General Settings */}
    <Card>
     <CardHeader>
      <CardTitle class="flex items-center gap-2">
       <div class="i-mdi-cog w-5 h-5" />
       General
      </CardTitle>
      <CardDescription>Application preferences and behavior</CardDescription>
     </CardHeader>
     <CardContent class="space-y-4">
      <div class="flex items-center justify-between">
       <div class="space-y-1">
        <p class="text-sm font-medium">Dark Mode</p>
        <p class="text-sm text-muted-foreground">Use dark theme</p>
       </div>
       <Switch checked={darkMode()} onChange={toggleDarkMode}>
        <SwitchControl>
         <SwitchThumb />
        </SwitchControl>
       </Switch>
      </div>

      <div class="flex items-center justify-between">
       <div class="space-y-1">
        <p class="text-sm font-medium">Auto-launch on startup</p>
        <p class="text-sm text-muted-foreground">Start with the system</p>
       </div>
       <Switch checked={autoLaunch()} onChange={toggleAutoLaunch}>
        <SwitchControl>
         <SwitchThumb />
        </SwitchControl>
       </Switch>
      </div>
     </CardContent>
    </Card>

    {/* Updates */}
    <Card>
     <CardHeader>
      <CardTitle class="flex items-center gap-2">
       <div class="i-mdi-update w-5 h-5" />
       Updates
      </CardTitle>
      <CardDescription>Check for application updates</CardDescription>
     </CardHeader>
     <CardContent class="space-y-4">
      <div class="flex items-center justify-between">
       <div>
        <p class="text-sm font-medium">Application Updates</p>
        <p class="text-sm text-muted-foreground">
         Automatically check for updates on startup
        </p>
       </div>
       <Button onClick={() => checkForUpdates(false)}>Check for Updates</Button>
      </div>

      <div class="flex items-center justify-between">
       <div>
        <p class="text-sm font-medium">Version</p>
        <p class="text-sm text-muted-foreground">Current: {version || "dev"}</p>
       </div>
       <div class="flex gap-2">
        <a
         href="https://github.com/ur-wesley/WorkspaceLauncher"
         target="_blank"
         rel="noreferrer"
        >
         <Button variant="outline">
          <span
           class="iconify w-4 h-4 mr-2"
           data-icon="mdi:source-repository"
          />{" "}
          Repository
         </Button>
        </a>
        <a
         href="https://github.com/ur-wesley/WorkspaceLauncher/issues/new/choose"
         target="_blank"
         rel="noreferrer"
        >
         <Button variant="outline">
          <span class="iconify w-4 h-4 mr-2" data-icon="mdi:github" /> New Issue
         </Button>
        </a>
       </div>
      </div>
     </CardContent>
    </Card>

   {/* Tool Management */}
   <Card>
    <Collapsible>
     <CardHeader>
      <div class="flex justify-between items-center">
       <div class="flex items-center gap-2">
        <CollapsibleTrigger class="i-mdi-chevron-down w-5 h-5 transition-transform" aria-label="Toggle tools" />
        <div>
         <CardTitle class="flex items-center gap-2">
          <div class="i-mdi-tools w-5 h-5" />
          Tool Management
         </CardTitle>
         <CardDescription>
          Manage tools that can be used to create actions
         </CardDescription>
        </div>
       </div>
       <ToolDialog trigger={AddToolTrigger} />
      </div>
     </CardHeader>
     <CollapsibleContent>
      <CardContent>
       <Show
       when={!toolStore.isLoading && toolStore.tools.length > 0}
       fallback={
        <div class="text-center py-8 text-muted-foreground">
         <Show when={toolStore.isLoading}>
          <div class="i-mdi-loading animate-spin text-4xl mb-2" />
          <p>Loading tools...</p>
         </Show>
         <Show when={!toolStore.isLoading}>
          <div class="i-mdi-tools text-4xl mb-2" />
          <p>No tools configured</p>
          <p class="text-sm">Add tools to simplify action creation</p>
         </Show>
        </div>
       }
      >
       <div class="space-y-4">
        {Object.entries(groupedTools())
         .filter(([_category, tools]) => tools.length > 0)
         .map(([category, tools]) => (
          <div class="space-y-2">
           {/* Only show category header if it's not "Other" or if there are tools */}
           <Show
            when={
             category !== "Other" || Object.keys(groupedTools()).length === 1
            }
           >
            <h3 class="text-lg font-medium capitalize">{category}</h3>
           </Show>
           <div class="grid gap-2">
            {tools.map((tool) => (
             <div class="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 shadow-sm transition-all">
              <div class="flex items-center gap-3">
               {/* Only show icon container if icon exists */}
               <Show when={tool.icon}>
                <div class="flex items-center justify-center w-10 h-10 rounded bg-primary text-primary-foreground">
                 <span
                  class="iconify w-5 h-5"
                  data-icon={`mdi:${tool.icon?.replace(/^i-mdi-/, "")}`}
                 />
                </div>
               </Show>
               <div class="flex-1">
                <div class="flex items-center gap-2">
                 <span class="font-medium">{tool.name}</span>
                 <Badge
                  variant="secondary"
                  class={cn(
                   "text-white text-xs",
                   getToolTypeColor(tool.tool_type)
                  )}
                 >
                  {tool.tool_type}
                 </Badge>
                 <Show when={!tool.enabled}>
                  <Badge variant="secondary" class="text-xs">
                   disabled
                  </Badge>
                 </Show>
                </div>
                <div class="text-sm text-muted-foreground">
                 {tool.description}
                </div>
                <div class="text-xs text-muted-foreground font-mono mt-1">
                 {tool.template}
                </div>
               </div>
              </div>
              <div class="flex items-center gap-3">
               <div class="flex items-center gap-2">
                <span class="text-sm text-muted-foreground">Enabled</span>
                <Switch
                 checked={tool.enabled}
                 onChange={(checked) => handleToggleTool(tool.id, checked)}
                >
                 <SwitchControl>
                  <SwitchThumb />
                 </SwitchControl>
                </Switch>
               </div>

               {/* Dropdown menu for edit/delete */}
               <DropdownMenu>
                <Tooltip>
                 <TooltipTrigger>
                  <DropdownMenuTrigger
                   as={Button}
                   variant="ghost"
                   size="sm"
                   class="h-8 w-8 p-0 opacity-60 hover:opacity-100"
                  >
                   <div class="i-mdi-dots-vertical w-4 h-4" />
                  </DropdownMenuTrigger>
                 </TooltipTrigger>
                 <TooltipContent>
                  <p>Tool Options</p>
                 </TooltipContent>
                </Tooltip>
                <DropdownMenuContent class="w-48">
                 <ToolDialog tool={tool} trigger={EditToolTrigger} />
                 <DropdownMenuSeparator />
                 <DeleteToolDialog tool={tool} trigger={DeleteToolTrigger} />
                </DropdownMenuContent>
               </DropdownMenu>
              </div>
             </div>
            ))}
           </div>
          </div>
         ))}
       </div>
       </Show>
      </CardContent>
     </CollapsibleContent>
    </Collapsible>
   </Card>

    {/* Share & Import */}
    <Card>
     <CardHeader>
      <CardTitle class="flex items-center gap-2">
       <span class="iconify w-5 h-5" data-icon="mdi:share-variant" /> Share &
       Import
      </CardTitle>
      <CardDescription>
       Export your data to share with others or backup, and import data from
       other sources
      </CardDescription>
     </CardHeader>
     <CardContent class="space-y-3">
      <div class="flex items-start gap-3">
       <div class="flex-1 space-y-1">
        <p class="text-sm font-medium">Export Data</p>
        <p class="text-sm text-muted-foreground">
         Select and export workspaces and tools to a file or clipboard
        </p>
       </div>
       <ShareDialog
        trigger={(props) => (
         <Button onClick={props.onClick}>
          <span class="iconify w-4 h-4 mr-2" data-icon="mdi:export" /> Export
         </Button>
        )}
       />
      </div>

      <Separator />

      <div class="flex items-start gap-3">
       <div class="flex-1 space-y-1">
        <p class="text-sm font-medium">Import Data</p>
        <p class="text-sm text-muted-foreground">
         Import workspaces and tools from a file or clipboard
        </p>
       </div>
       <ImportDialog
        trigger={(props: { onClick?: () => void }) => (
         <Button variant="outline" onClick={props.onClick}>
          <span class="iconify w-4 h-4 mr-2" data-icon="mdi:import" /> Import
         </Button>
        )}
       />
      </div>
     </CardContent>
    </Card>
   </div>
  </div>
 );
};
