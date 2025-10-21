import { useNavigate } from "@solidjs/router";
import type { JSX, ParentComponent } from "solid-js";
import { ActionDialog } from "@/components/ActionDialog";
import { ActiveActionsManagerDialog } from "@/components/ActiveActionsManagerDialog";
import { Commander } from "@/components/Commander";
import { Sidebar } from "@/components/Sidebar";
import { VariableDialog } from "@/components/VariableDialog";
import { WorkspaceCreateDialog } from "@/components/WorkspaceCreateDialog";
import { useHotkeys } from "@/libs/hotkeys";
import { UIProvider, useUI } from "@/store/ui";
import { useWorkspaceStore } from "@/store/workspace";

interface LayoutProps {
	children?: JSX.Element;
}

const LayoutContent: ParentComponent<LayoutProps> = (props) => {
	const ui = useUI();
	const workspaceStore = useWorkspaceStore();

	const navigate = useNavigate();
	useHotkeys("global", {
		openCommander: () => ui.actions.toggleCommander(),
		createWorkspace: () => ui.actions.openWorkspaceCreate(),
		navigateDashboard: () => navigate("/"),
		navigateSettings: () => navigate("/settings"),
		openActiveActionsManager: () => ui.actions.openActiveActionsManager(),
		toggleSidebar: () => ui.actions.toggleSidebar(),
	});

	return (
		<div class="flex h-screen bg-background overflow-hidden">
			<Sidebar collapsed={ui.store.sidebarCollapsed} onToggle={ui.actions.toggleSidebar} />

			<div class="flex-1 flex flex-col overflow-hidden">
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
