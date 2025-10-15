import { A } from "@solidjs/router";
import type { Component } from "solid-js";
import {
 createEffect,
 createMemo,
 createSignal,
 For,
 onMount,
 Show,
 onCleanup,
} from "solid-js";
import { useUI } from "@/store/ui";
import { useHotkeys } from "@/libs/hotkeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceCreateDialog } from "@/components/WorkspaceCreateDialog";
import { listActionsByWorkspace, listVariablesByWorkspace } from "@/libs/api";
import { cn } from "@/libs/cn";
import { useWorkspaceStore } from "@/store/workspace";
import type { NewWorkspace, Workspace } from "@/types/database";

interface WorkspaceStats {
 actions: number;
 variables: number;
}

export const WorkspacesListPage: Component = () => {
 const ui = useUI();
 const { store, actions } = useWorkspaceStore();
 const [createDialogOpen, setCreateDialogOpen] = createSignal(false);
 const [searchQuery, setSearchQuery] = createSignal("");
 let searchInputRef: HTMLInputElement | undefined;
 const [viewMode, setViewMode] = createSignal<"grid" | "list">("grid");
 const [workspaceStats, setWorkspaceStats] = createSignal<
  Map<number, WorkspaceStats>
 >(new Map());

 const loadWorkspaceStats = async (workspaceId: number) => {
  const [actionsResult, variablesResult] = await Promise.all([
   listActionsByWorkspace(workspaceId),
   listVariablesByWorkspace(workspaceId),
  ]);

  const stats: WorkspaceStats = {
   actions: actionsResult.isOk() ? actionsResult.value.length : 0,
   variables: variablesResult.isOk() ? variablesResult.value.length : 0,
  };

  setWorkspaceStats((prev) => new Map(prev).set(workspaceId, stats));
 };

 onMount(() => {
  actions.loadWorkspaces();
  ui.actions.setWorkspaceContext(null);
  ui.actions.setFocusSearch(() => searchInputRef?.focus());
 });
 onCleanup(() => ui.actions.setFocusSearch(undefined));

 useHotkeys("workspacesList", {
  focusSearch: () => searchInputRef?.focus(),
  createWorkspace: () => setCreateDialogOpen(true),
 });

 createEffect(() => {
  for (const workspace of store.workspaces) {
   if (!workspaceStats().has(workspace.id)) {
    loadWorkspaceStats(workspace.id);
   }
  }
 });

 const handleCreateWorkspace = async (newWorkspace: NewWorkspace) => {
  await actions.createWorkspace(newWorkspace);
  setCreateDialogOpen(false);
  actions.loadWorkspaces();
 };

 const fuzzyMatch = (text: string, query: string): boolean => {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let queryIndex = 0;

  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
   if (lowerText[i] === lowerQuery[queryIndex]) {
    queryIndex++;
   }
  }

  return queryIndex === lowerQuery.length;
 };

 const filteredWorkspaces = createMemo(() => {
  const query = searchQuery().trim();
  if (!query) {
   return store.workspaces;
  }

  return store.workspaces.filter(
   (workspace) =>
    fuzzyMatch(workspace.name, query) ||
    (workspace.description && fuzzyMatch(workspace.description, query))
  );
 });

 const pinnedWorkspaces = createMemo(() =>
  filteredWorkspaces().filter((w) => store.pinnedWorkspaceIds.has(w.id))
 );
 const unpinnedWorkspaces = createMemo(() =>
  filteredWorkspaces().filter((w) => !store.pinnedWorkspaceIds.has(w.id))
 );

 const WorkspaceCard: Component<{ workspace: Workspace; isPinned: boolean }> = (
  props
 ) => {
  const stats = createMemo(() => {
   return (
    workspaceStats().get(props.workspace.id) || { actions: 0, variables: 0 }
   );
  });
  const [showFullDescription, setShowFullDescription] = createSignal(false);

  const isDescriptionLong = createMemo(() => {
   return (
    props.workspace.description && props.workspace.description.length > 100
   );
  });

  return (
   <Card
    class={cn(
     "group hover:shadow-lg transition-all duration-200 cursor-pointer",
     props.isPinned && "border-primary/50 bg-primary/5"
    )}
   >
    <CardHeader class="flex flex-row items-start justify-between space-y-0 pb-3">
     <A href={`/w/${props.workspace.id}`} class="flex-1 min-w-0 pr-2">
      <CardTitle class="truncate text-base sm:text-lg">
       {props.workspace.name}
      </CardTitle>
      <Show when={props.workspace.description}>
       <p
        class={cn(
         "text-xs sm:text-sm text-muted-foreground whitespace-pre-line mt-1.5",
         !showFullDescription() && "line-clamp-2"
        )}
       >
        {props.workspace.description}
       </p>
      </Show>
     </A>
     <div class="flex flex-col gap-1 flex-shrink-0">
      <Button
       size="icon"
       variant="ghost"
       class="h-7 w-7 opacity-60 hover:opacity-100"
       onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.togglePinWorkspace(props.workspace.id);
       }}
       title={props.isPinned ? "Unpin workspace" : "Pin workspace"}
      >
       <div
        class={cn(
         "w-4 h-4",
         props.isPinned ? "i-mdi-pin text-primary" : "i-mdi-pin-outline"
        )}
       />
      </Button>
     </div>
    </CardHeader>
    <Show when={props.workspace.description && isDescriptionLong()}>
     <div class="px-6 -mt-2 pb-3">
      <button
       type="button"
       onClick={(e) => {
        e.stopPropagation();
        setShowFullDescription(!showFullDescription());
       }}
       class="text-xs text-primary hover:underline inline-block"
      >
       {showFullDescription() ? "Show less" : "Show more"}
      </button>
     </div>
    </Show>
    <A href={`/w/${props.workspace.id}`} class="block">
     <CardContent class="pt-0">
      <div class="flex items-center gap-4 text-sm text-muted-foreground">
       <div class="flex items-center gap-1">
        <div class="i-mdi-play-circle w-4 h-4" />
        <span>
         {stats().actions} action{stats().actions !== 1 ? "s" : ""}
        </span>
       </div>
       <div class="flex items-center gap-1">
        <div class="i-mdi-variable w-4 h-4" />
        <span>
         {stats().variables} var{stats().variables !== 1 ? "s" : ""}
        </span>
       </div>
      </div>
     </CardContent>
    </A>
   </Card>
  );
 };

 return (
  <div class="h-full w-full flex flex-col">
   <div class="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 space-y-6">
    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
     <div class="flex-1 min-w-0">
      <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">Workspaces</h1>
      <p class="text-muted-foreground text-sm sm:text-base mt-1">
       Manage and launch your development environments
      </p>
     </div>
     <Button
      onclick={() => setCreateDialogOpen(true)}
      class="whitespace-nowrap"
     >
      <div class="i-mdi-plus w-4 h-4 mr-2" />
      <span class="hidden sm:inline">New Workspace</span>
      <span class="sm:hidden">New</span>
     </Button>
    </div>

    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
     <div class="relative flex-1">
      <div class="absolute left-3 top-1/2 transform -translate-y-1/2 i-mdi-magnify w-5 h-5 text-muted-foreground pointer-events-none" />
      <input
       type="text"
       placeholder="search workspaces..."
       value={searchQuery()}
       ref={(el) => (searchInputRef = el)}
       onInput={(e) => setSearchQuery(e.currentTarget.value)}
       class="flex h-11 w-full rounded-lg border border-input bg-card px-4 py-2 pl-10 pr-10 text-sm shadow-md placeholder:text-muted-foreground focus-visible:(outline-none ring-2 ring-ring border-ring) disabled:(cursor-not-allowed opacity-50) transition-all"
      />
      <Show when={searchQuery()}>
       <button
        type="button"
        onClick={() => setSearchQuery("")}
        class="absolute right-3 top-1/2 transform -translate-y-1/2 i-mdi-close w-5 h-5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        title="Clear search"
       />
      </Show>
     </div>

     <div class="flex gap-2 justify-between sm:justify-start">
      <div class="flex gap-1 bg-muted/30 rounded-md p-1">
       <Button
        size="sm"
        variant={viewMode() === "grid" ? "default" : "ghost"}
        class="h-8 w-8 p-0"
        onclick={() => setViewMode("grid")}
        title="Grid view"
       >
        <div class="i-mdi-view-grid w-4 h-4" />
       </Button>
       <Button
        size="sm"
        variant={viewMode() === "list" ? "default" : "ghost"}
        class="h-8 w-8 p-0"
        onclick={() => setViewMode("list")}
        title="List view"
       >
        <div class="i-mdi-view-list w-4 h-4" />
       </Button>
      </div>
     </div>
    </div>

    <Show when={store.loading}>
     <div
      class={
       viewMode() === "grid"
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        : "space-y-2"
      }
     >
      <For each={Array(6).fill(0)}>
       {() => (
        <Card>
         <CardHeader>
          <Skeleton class="h-5 w-3/4" />
          <Skeleton class="h-4 w-full" />
         </CardHeader>
         <CardContent>
          <div class="flex gap-4">
           <Skeleton class="h-4 w-16" />
           <Skeleton class="h-4 w-20" />
          </div>
         </CardContent>
        </Card>
       )}
      </For>
     </div>
    </Show>

    <Show when={!store.loading && filteredWorkspaces().length === 0}>
     <div class="text-center py-12">
      <div class="i-mdi-folder-outline w-16 h-16 mx-auto text-muted-foreground mb-4" />
      <h3 class="text-lg font-medium mb-2">
       {searchQuery() ? "No workspaces found" : "No workspaces yet"}
      </h3>
      <p class="text-muted-foreground mb-4">
       {searchQuery()
        ? "Try adjusting your search terms or create a new workspace"
        : "Get started by creating your first workspace"}
      </p>
      <Show when={!searchQuery()}>
       <Button onclick={() => setCreateDialogOpen(true)}>
        <div class="i-mdi-plus w-4 h-4 mr-2" />
        Create Workspace
       </Button>
      </Show>
     </div>
    </Show>

    <Show when={!store.loading && pinnedWorkspaces().length > 0}>
     <div class="space-y-4">
      <div class="flex items-center gap-2">
       <div class="i-mdi-pin w-5 h-5 text-primary" />
       <h2 class="text-lg sm:text-xl font-semibold">Pinned Workspaces</h2>
       <Badge variant="secondary">{pinnedWorkspaces().length}</Badge>
      </div>
      <div
       class={
        viewMode() === "grid"
         ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
         : "space-y-2"
       }
      >
       <For each={pinnedWorkspaces()}>
        {(workspace) => <WorkspaceCard workspace={workspace} isPinned={true} />}
       </For>
      </div>
     </div>
    </Show>

    <Show when={!store.loading && unpinnedWorkspaces().length > 0}>
     <div class="space-y-4">
      <div class="flex items-center gap-2">
       <h2 class="text-lg sm:text-xl font-semibold">
        {(() => {
         if (searchQuery() && pinnedWorkspaces().length === 0) {
          return "Search Results";
         }
         if (pinnedWorkspaces().length > 0) {
          return "Other Workspaces";
         }
         return "All Workspaces";
        })()}
       </h2>
       <Badge variant="secondary">{unpinnedWorkspaces().length}</Badge>
      </div>
      <div
       class={
        viewMode() === "grid"
         ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
         : "space-y-2"
       }
      >
       <For each={unpinnedWorkspaces()}>
        {(workspace) => (
         <WorkspaceCard workspace={workspace} isPinned={false} />
        )}
       </For>
      </div>
     </div>
    </Show>

    <WorkspaceCreateDialog
     open={createDialogOpen()}
     onClose={() => setCreateDialogOpen(false)}
     onSubmit={handleCreateWorkspace}
    />
   </div>
  </div>
 );
};
