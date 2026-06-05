import { createContext, type JSX, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { listRunsByWorkspace } from "@/libs/api";
import { showToast } from "@/libs/toast";
import {
	dismissRunningAction,
	reconcileRunningActions,
	stopRunningAction,
} from "@/services/processTracking";
import { runningActionsService } from "@/services/runningActions";
import type { Run, RunningAction } from "@/types/database";

interface RunStoreState {
	runs: Run[];
	runningActions: RunningAction[];
	logs: Record<string, string[]>;
	loading: boolean;
	error: string | null;
}

interface RunStoreActions {
	loadRuns: (workspaceId: number) => Promise<void>;
	loadRunningActions: (workspaceId?: number) => void;
	stopAction: (action: RunningAction) => Promise<void>;
	clearRuns: () => void;
	refreshRunningActions: () => void;
	reconcileAndRefresh: (workspaceId?: number) => Promise<void>;
	dismissAction: (action: RunningAction) => Promise<void>;
	appendLog: (runId: number, message: string) => void;
}

type RunStore = [RunStoreState, RunStoreActions];

const RunStoreContext = createContext<RunStore>();

export function RunStoreProvider(props: { readonly children: JSX.Element }) {
	const [store, setStore] = createStore<RunStoreState>({
		runs: [],
		runningActions: [],
		logs: {},
		loading: false,
		error: null,
	});

	const actions: RunStoreActions = {
		async loadRuns(workspaceId: number) {
			setStore({ loading: true, error: null });
			try {
				const result = await listRunsByWorkspace(workspaceId);
				if (result.isOk()) {
					setStore({ runs: result.value, loading: false });
				} else {
					setStore({ error: result.error, loading: false });
				}
			} catch (error) {
				setStore({ error: `Failed to load runs: ${error}`, loading: false });
			}
		},

		loadRunningActions(workspaceId?: number) {
			try {
				const runningActions = workspaceId
					? runningActionsService.getByWorkspace(workspaceId)
					: runningActionsService.getAll();
				setStore({ runningActions });
			} catch (error) {
				console.error("Failed to load running actions:", error);
			}
		},

		refreshRunningActions() {
			const currentWorkspaceId = store.runningActions[0]?.workspace_id;
			actions.loadRunningActions(currentWorkspaceId);
		},

		async reconcileAndRefresh(workspaceId?: number) {
			await reconcileRunningActions();
			actions.loadRunningActions(workspaceId);
		},

		async stopAction(action: RunningAction) {
			const result = await stopRunningAction(action);
			actions.loadRunningActions(action.workspace_id);

			if (result.ok) {
				showToast({
					title: "Action stopped",
					description: `${action.action_name}: ${result.message}`,
					variant: "success",
				});
				return;
			}

			showToast({
				title: result.denied ? "Cannot stop process" : "Failed to stop action",
				description: result.message,
				variant: "destructive",
			});
		},

		async dismissAction(action: RunningAction) {
			await dismissRunningAction(action.id);
			actions.loadRunningActions(action.workspace_id);
			showToast({
				title: "Removed from tracking",
				description: `${action.action_name} is no longer listed as running`,
				variant: "default",
			});
		},

		clearRuns() {
			setStore({ runs: [], error: null });
		},

		appendLog(runId: number, message: string) {
			const key = runId.toString();
			setStore("logs", key, (prev) => [...(prev || []), message]);
		},
	};

	if (typeof window !== "undefined") {
		window.addEventListener("action-log", ((event: CustomEvent) => {
			const { run_id, message } = event.detail;
			actions.appendLog(run_id, message);
		}) as EventListener);

		window.addEventListener("running-actions-changed", () => {
			actions.refreshRunningActions();
		});
	}

	return (
		<RunStoreContext.Provider value={[store, actions]}>
			{props.children}
		</RunStoreContext.Provider>
	);
}

export function useRunStore(): RunStore {
	const context = useContext(RunStoreContext);
	if (!context) {
		throw new Error("useRunStore must be used within a RunStoreProvider");
	}
	return context;
}
