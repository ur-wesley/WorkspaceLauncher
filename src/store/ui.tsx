import { createContext, type ParentComponent, useContext } from "solid-js";
import { createStore } from "solid-js/store";

type UIStore = {
	commanderOpen: boolean;
	workspaceCreateOpen: boolean;
	actionCreateOpen: boolean;
	variableCreateOpen: boolean;
	importOpen: boolean;
	shareOpen: boolean;
	activeActionsManagerOpen: boolean;
	currentWorkspaceId: number | null;
	focusSearch?: () => void;
	runAllRequested: boolean;
	sidebarCollapsed: boolean;
};

type UIActions = {
	setWorkspaceContext: (workspaceId: number | null) => void;
	setFocusSearch: (fn: (() => void) | undefined) => void;
	toggleCommander: () => void;
	openCommander: () => void;
	closeCommander: () => void;
	openWorkspaceCreate: () => void;
	closeWorkspaceCreate: () => void;
	openActionCreate: (workspaceId?: number) => void;
	closeActionCreate: () => void;
	openVariableCreate: (workspaceId?: number) => void;
	closeVariableCreate: () => void;
	openImport: (workspaceId?: number) => void;
	closeImport: () => void;
	openShare: (workspaceId?: number) => void;
	closeShare: () => void;
	openActiveActionsManager: () => void;
	closeActiveActionsManager: () => void;
	requestRunAll: () => void;
	clearRunAll: () => void;
	toggleSidebar: () => void;
};

type UIContextValue = { store: UIStore; actions: UIActions };

const UIContext = createContext<UIContextValue>();

export const UIProvider: ParentComponent = (props) => {
	const getInitialSidebarState = () => {
		try {
			const stored = localStorage.getItem("sidebar-collapsed");
			return stored ? JSON.parse(stored) : false;
		} catch {
			return false;
		}
	};

	const [store, setStore] = createStore<UIStore>({
		commanderOpen: false,
		workspaceCreateOpen: false,
		actionCreateOpen: false,
		variableCreateOpen: false,
		importOpen: false,
		shareOpen: false,
		activeActionsManagerOpen: false,
		currentWorkspaceId: null,
		focusSearch: undefined,
		runAllRequested: false,
		sidebarCollapsed: getInitialSidebarState(),
	});

	const actions: UIActions = {
		setWorkspaceContext(workspaceId) {
			setStore("currentWorkspaceId", workspaceId ?? null);
		},
		setFocusSearch(fn) {
			setStore("focusSearch", fn);
		},
		toggleCommander() {
			setStore("commanderOpen", (v) => !v);
		},
		openCommander() {
			setStore("commanderOpen", true);
		},
		closeCommander() {
			setStore("commanderOpen", false);
		},
		openWorkspaceCreate() {
			setStore("workspaceCreateOpen", true);
		},
		closeWorkspaceCreate() {
			setStore("workspaceCreateOpen", false);
		},
		openActionCreate(workspaceId) {
			if (typeof workspaceId === "number")
				setStore("currentWorkspaceId", workspaceId);
			setStore("actionCreateOpen", true);
		},
		closeActionCreate() {
			setStore("actionCreateOpen", false);
		},
		openVariableCreate(workspaceId) {
			if (typeof workspaceId === "number")
				setStore("currentWorkspaceId", workspaceId);
			setStore("variableCreateOpen", true);
		},
		closeVariableCreate() {
			setStore("variableCreateOpen", false);
		},
		openImport(workspaceId) {
			if (typeof workspaceId === "number")
				setStore("currentWorkspaceId", workspaceId);
			setStore("importOpen", true);
		},
		closeImport() {
			setStore("importOpen", false);
		},
		openShare(workspaceId) {
			if (typeof workspaceId === "number")
				setStore("currentWorkspaceId", workspaceId);
			setStore("shareOpen", true);
		},
		closeShare() {
			setStore("shareOpen", false);
		},
		openActiveActionsManager() {
			setStore("activeActionsManagerOpen", true);
		},
		closeActiveActionsManager() {
			setStore("activeActionsManagerOpen", false);
		},
		requestRunAll() {
			setStore("runAllRequested", true);
		},
		clearRunAll() {
			setStore("runAllRequested", false);
		},
		toggleSidebar() {
			setStore("sidebarCollapsed", (v) => {
				const newValue = !v;
				try {
					localStorage.setItem("sidebar-collapsed", JSON.stringify(newValue));
				} catch {}
				return newValue;
			});
		},
	};

	return (
		<UIContext.Provider value={{ store, actions }}>
			{props.children}
		</UIContext.Provider>
	);
};

export function useUI() {
	const ctx = useContext(UIContext);
	if (!ctx) throw new Error("useUI must be used within a UIProvider");
	return ctx;
}
