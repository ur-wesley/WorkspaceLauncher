import { createContext, type JSX, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { cleanupOldRuns, createRun, listRunsByWorkspace, stopProcess } from "@/libs/api";
import { showToast } from "@/libs/toast";
import { runningActionsService } from "@/services/runningActions";
import type { NewRun, Run, RunningAction } from "@/types/database";

interface RunStoreState {
	runs: Run[];
	runningActions: RunningAction[];
	loading: boolean;
	error: string | null;
}

interface RunStoreActions {
	loadRuns: (workspaceId: number) => Promise<void>;
	loadRunningActions: (workspaceId?: number) => void;
	stopAction: (action: RunningAction) => Promise<void>;
	clearRuns: () => void;
	refreshRunningActions: () => void;
}

type RunStore = [RunStoreState, RunStoreActions];

const RunStoreContext = createContext<RunStore>();

export function RunStoreProvider(props: { readonly children: JSX.Element }) {
	const [store, setStore] = createStore<RunStoreState>({
		runs: [],
		runningActions: [],
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

		async stopAction(action: RunningAction) {
			try {
				const result = await stopProcess(action.process_id);
				if (result.isOk()) {
					runningActionsService.remove(action.id);

					const newRun: NewRun = {
						workspace_id: action.workspace_id,
						action_id: action.action_id,
						status: "cancelled",
						started_at: action.started_at,
						completed_at: new Date().toISOString(),
					};
					const createResult = await createRun(newRun);

					if (createResult.isOk()) {
						await cleanupOldRuns(action.action_id, 20);
					}

					actions.loadRunningActions(action.workspace_id);

					showToast({
						title: "Action stopped",
						description: `${action.action_name} terminated successfully`,
						variant: "success",
					});
				} else {
					showToast({
						title: "Failed to stop action",
						description: result.error,
						variant: "destructive",
					});
				}
			} catch (error) {
				showToast({
					title: "Failed to stop action",
					description: `${error}`,
					variant: "destructive",
				});
			}
		},

		clearRuns() {
			setStore({ runs: [], error: null });
		},
	};

	return <RunStoreContext.Provider value={[store, actions]}>{props.children}</RunStoreContext.Provider>;
}

export function useRunStore(): RunStore {
	const context = useContext(RunStoreContext);
	if (!context) {
		throw new Error("useRunStore must be used within a RunStoreProvider");
	}
	return context;
}
