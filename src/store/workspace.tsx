import { createContext, type ParentComponent, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import * as api from "@/libs/api";
import { fuzzySearch } from "@/libs/search";
import { showToast } from "@/libs/toast";
import type { NewWorkspace, Workspace } from "@/types/database";

interface WorkspaceStore {
	workspaces: Workspace[];
	loading: boolean;
	selectedWorkspace: Workspace | null;
	pinnedWorkspaceIds: Set<number>;
	searchQuery: string;
}

interface WorkspaceActions {
	loadWorkspaces: () => Promise<void>;
	createWorkspace: (workspace: NewWorkspace) => Promise<Workspace | null>;
	updateWorkspace: (id: number, workspace: NewWorkspace) => Promise<Workspace | null>;
	deleteWorkspace: (id: number) => Promise<boolean>;
	selectWorkspace: (workspace: Workspace | null) => void;
	getWorkspace: (id: number) => Workspace | undefined;
	togglePinWorkspace: (id: number) => void;
	setSearchQuery: (query: string) => void;
	getFilteredWorkspaces: () => Workspace[];
	getPinnedWorkspaces: () => Workspace[];
}

interface WorkspaceContextValue {
	store: WorkspaceStore;
	actions: WorkspaceActions;
}

const WorkspaceContext = createContext<WorkspaceContextValue>();

export const WorkspaceProvider: ParentComponent = (props) => {
	const [store, setStore] = createStore<WorkspaceStore>({
		workspaces: [],
		loading: false,
		selectedWorkspace: null,
		pinnedWorkspaceIds: new Set(),
		searchQuery: "",
	});

	const loadPinnedWorkspaces = () => {
		try {
			const stored = localStorage.getItem("workspace-launcher:pinned-workspaces");
			if (stored) {
				const pinned = JSON.parse(stored) as number[];
				setStore("pinnedWorkspaceIds", new Set(pinned));
			}
		} catch (error) {
			console.warn("Failed to load pinned workspaces from localStorage:", error);
		}
	};

	const savePinnedWorkspaces = (pinnedIds: Set<number>) => {
		try {
			localStorage.setItem("workspace-launcher:pinned-workspaces", JSON.stringify(Array.from(pinnedIds)));
		} catch (error) {
			console.warn("Failed to save pinned workspaces to localStorage:", error);
		}
	};

	loadPinnedWorkspaces();

	const actions: WorkspaceActions = {
		async loadWorkspaces() {
			setStore("loading", true);

			const result = await api.listWorkspaces();

			if (result.isOk()) {
				setStore("workspaces", result.value);
			} else {
				showToast({
					title: "Error",
					description: `Failed to load workspaces: ${result.error.message}`,
					variant: "destructive",
				});
			}

			setStore("loading", false);
		},

		async createWorkspace(workspace: NewWorkspace) {
			const result = await api.createWorkspace(workspace);

			if (result.isOk()) {
				setStore("workspaces", (prev) => [result.value, ...prev]);
				showToast({
					title: "Success",
					description: "Workspace created successfully",
				});
				return result.value;
			} else {
				showToast({
					title: "Error",
					description: `Failed to create workspace: ${result.error.message}`,
					variant: "destructive",
				});
				return null;
			}
		},

		async updateWorkspace(id: number, workspace: NewWorkspace) {
			const result = await api.updateWorkspace(id, workspace);

			if (result.isOk()) {
				setStore("workspaces", (w) => w.id === id, result.value);
				if (store.selectedWorkspace?.id === id) {
					setStore("selectedWorkspace", result.value);
				}
				showToast({
					title: "Success",
					description: "Workspace updated successfully",
				});
				return result.value;
			} else {
				showToast({
					title: "Error",
					description: `Failed to update workspace: ${result.error.message}`,
					variant: "destructive",
				});
				return null;
			}
		},

		async deleteWorkspace(id: number) {
			const result = await api.deleteWorkspace(id);

			if (result.isOk()) {
				setStore("workspaces", (prev) => prev.filter((w) => w.id !== id));
				if (store.selectedWorkspace?.id === id) {
					setStore("selectedWorkspace", null);
				}
				const newPinned = new Set(store.pinnedWorkspaceIds);
				newPinned.delete(id);
				setStore("pinnedWorkspaceIds", newPinned);
				savePinnedWorkspaces(newPinned);

				showToast({
					title: "Success",
					description: "Workspace deleted successfully",
				});
				return true;
			} else {
				showToast({
					title: "Error",
					description: `Failed to delete workspace: ${result.error.message}`,
					variant: "destructive",
				});
				return false;
			}
		},

		selectWorkspace(workspace: Workspace | null) {
			setStore("selectedWorkspace", workspace);
		},

		getWorkspace(id: number) {
			return store.workspaces.find((w) => w.id === id);
		},

		togglePinWorkspace(id: number) {
			const newPinned = new Set(store.pinnedWorkspaceIds);
			if (newPinned.has(id)) {
				newPinned.delete(id);
			} else {
				newPinned.add(id);
			}
			setStore("pinnedWorkspaceIds", newPinned);
			savePinnedWorkspaces(newPinned);
		},

		setSearchQuery(query: string) {
			setStore("searchQuery", query);
		},

		getFilteredWorkspaces() {
			if (!store.searchQuery.trim()) {
				return store.workspaces;
			}
			return fuzzySearch(store.workspaces, store.searchQuery);
		},

		getPinnedWorkspaces() {
			return store.workspaces.filter((w) => store.pinnedWorkspaceIds.has(w.id));
		},
	};

	const contextValue: WorkspaceContextValue = {
		store,
		actions,
	};

	return <WorkspaceContext.Provider value={contextValue}>{props.children}</WorkspaceContext.Provider>;
};

export function useWorkspaceStore() {
	const context = useContext(WorkspaceContext);
	if (!context) {
		throw new Error("useWorkspaceStore must be used within a WorkspaceProvider");
	}
	return context;
}
