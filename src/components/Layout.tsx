import { useLocation, useNavigate } from "@solidjs/router";
import type { JSX, ParentComponent } from "solid-js";
import { createMemo } from "solid-js";
import { ActiveActionsManagerDialog } from "@/components/ActiveActionsManagerDialog";
import { ActionDialogStepper as ActionDialog } from "@/components/action/ActionDialogStepper";
import { Commander } from "@/components/Commander";
import { Sidebar } from "@/components/Sidebar";
import { VariableDialog } from "@/components/variable/VariableDialog";
import { WindowHeader } from "@/components/WindowHeader";
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
	const location = useLocation();

	const workspaceTitle = createMemo(() => {
		const match = location.pathname.match(/^\/w\/(\d+)/);
		if (!match) return null;
		const id = Number(match[1]);
		return (
			workspaceStore.store.workspaces.find((w) => w.id === id)?.name ?? null
		);
	});

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
		<div class="flex flex-col h-screen bg-background overflow-hidden">
			<WindowHeader
				sidebarCollapsed={ui.store.sidebarCollapsed}
				onToggleSidebar={ui.actions.toggleSidebar}
				centerTitle={workspaceTitle() ?? undefined}
			/>

			<div class="flex flex-1 min-h-0">
				<Sidebar collapsed={ui.store.sidebarCollapsed} />

				<div class="flex-1 flex flex-col overflow-hidden">
					<main class="flex-1 overflow-y-auto w-full xl:max-w-screen-xl mx-auto">
						{props.children}
					</main>
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
