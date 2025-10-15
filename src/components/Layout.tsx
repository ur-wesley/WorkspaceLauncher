import type { JSX, ParentComponent } from "solid-js";
import { createSignal } from "solid-js";
import { Sidebar } from "@/components/Sidebar";
import { UIProvider, useUI } from "@/store/ui";
import { Commander } from "@/components/Commander";
import { useHotkeys } from "@/libs/hotkeys";
import { WorkspaceCreateDialog } from "@/components/WorkspaceCreateDialog";
import { useWorkspaceStore } from "@/store/workspace";
import { ActionDialog } from "@/components/ActionDialog";
import { VariableDialog } from "@/components/VariableDialog";
import { ActiveActionsManagerDialog } from "@/components/ActiveActionsManagerDialog";
import { useNavigate } from "@solidjs/router";

interface LayoutProps {
 children?: JSX.Element;
}

const LayoutContent: ParentComponent<LayoutProps> = (props) => {
 const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);
 const ui = useUI();
 const workspaceStore = useWorkspaceStore();

 const toggleSidebar = () => {
  setSidebarCollapsed(!sidebarCollapsed());
 };

 const navigate = useNavigate();
 useHotkeys("global", {
  openCommander: () => ui.actions.toggleCommander(),
  createWorkspace: () => ui.actions.openWorkspaceCreate(),
  navigateDashboard: () => navigate("/"),
  navigateSettings: () => navigate("/settings"),
  openActiveActionsManager: () => ui.actions.openActiveActionsManager(),
 });

 return (
  <div class="flex h-screen bg-background overflow-hidden">
   {/* Sidebar */}
   <Sidebar collapsed={sidebarCollapsed()} onToggle={toggleSidebar} />

   {/* Main Content */}
   <div class="flex-1 flex flex-col overflow-hidden">
    {/* Main Content Area */}
    <main class="flex-1 overflow-y-auto">{props.children}</main>
    <Commander />
    <WorkspaceCreateDialog
     open={ui.store.workspaceCreateOpen}
     onClose={ui.actions.closeWorkspaceCreate}
     onSubmit={async (newWorkspace) => {
      await workspaceStore.actions.createWorkspace(newWorkspace);
      ui.actions.closeWorkspaceCreate();
      workspaceStore.actions.loadWorkspaces();
     }}
    />
    <ActionDialog
     workspaceId={(ui.store.currentWorkspaceId ?? 0).toString()}
     trigger={() => null}
     forceOpen={ui.store.actionCreateOpen}
     onClose={ui.actions.closeActionCreate}
    />
    <VariableDialog
     workspaceId={(ui.store.currentWorkspaceId ?? 0).toString()}
     trigger={() => null}
     forceOpen={ui.store.variableCreateOpen}
     onClose={ui.actions.closeVariableCreate}
    />
    <ActiveActionsManagerDialog
     open={ui.store.activeActionsManagerOpen}
     onClose={ui.actions.closeActiveActionsManager}
    />
   </div>
  </div>
 );
};

export const Layout: ParentComponent<LayoutProps> = (props) => {
 return (
  <UIProvider>
   <LayoutContent>{props.children}</LayoutContent>
  </UIProvider>
 );
};
