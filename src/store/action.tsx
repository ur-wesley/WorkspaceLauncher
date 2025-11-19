import { createContext, type JSX, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import {
	createAction,
	deleteAction,
	listActionsByWorkspace,
	updateAction,
} from "@/libs/api";
import type { Action } from "@/models/action.model";
import { ActionAdapter } from "@/models/action.model";
import type { NewAction } from "@/types/database";

interface ActionStoreState {
	actions: Action[];
	loading: boolean;
	error: string | null;
}

interface ActionStoreActions {
	loadActions: (workspaceId: number) => Promise<void>;
	addAction: (action: NewAction) => Promise<void>;
	updateAction: (id: number, action: NewAction) => Promise<void>;
	removeAction: (id: number) => Promise<void>;
	clearActions: () => void;
}

type ActionStore = [ActionStoreState, ActionStoreActions];

const ActionStoreContext = createContext<ActionStore>();

export function ActionStoreProvider(props: { readonly children: JSX.Element }) {
	const [store, setStore] = createStore<ActionStoreState>({
		actions: [],
		loading: false,
		error: null,
	});

	const actions: ActionStoreActions = {
		async loadActions(workspaceId: number) {
			setStore({ loading: true, error: null });
			try {
				const result = await listActionsByWorkspace(workspaceId);
				if (result.isOk()) {
					setStore({
						actions: result.value.map((a) => ActionAdapter.fromDb(a)),
						loading: false,
					});
				} else {
					setStore({ error: result.error.message, loading: false });
				}
			} catch (error) {
				setStore({ error: `Failed to load actions: ${error}`, loading: false });
			}
		},

		async addAction(action: NewAction) {
			setStore({ loading: true, error: null });
			try {
				const result = await createAction(action);
				if (result.isOk()) {
					const model = ActionAdapter.fromDb(result.value);
					setStore("actions", (prev) => [...prev, model]);
					setStore({ loading: false });
				} else {
					setStore({ error: result.error.message, loading: false });
				}
			} catch (error) {
				setStore({
					error: `Failed to create action: ${error}`,
					loading: false,
				});
			}
		},

		async updateAction(id: number, action: NewAction) {
			setStore({ loading: true, error: null });
			try {
				const result = await updateAction(id, action);
				if (result.isOk()) {
					const model = ActionAdapter.fromDb(result.value);
					setStore("actions", (prev) =>
						prev.map((a) => (a.id === id ? model : a)),
					);
					setStore({ loading: false });
				} else {
					setStore({ error: result.error.message, loading: false });
				}
			} catch (error) {
				setStore({
					error: `Failed to update action: ${error}`,
					loading: false,
				});
			}
		},

		async removeAction(id: number) {
			setStore({ loading: true, error: null });
			try {
				const result = await deleteAction(id);
				if (result.isOk()) {
					setStore("actions", (prev) => prev.filter((a) => a.id !== id));
					setStore({ loading: false });
				} else {
					setStore({ error: result.error.message, loading: false });
				}
			} catch (error) {
				setStore({
					error: `Failed to delete action: ${error}`,
					loading: false,
				});
			}
		},

		clearActions() {
			setStore({ actions: [], error: null });
		},
	};

	return (
		<ActionStoreContext.Provider value={[store, actions]}>
			{props.children}
		</ActionStoreContext.Provider>
	);
}

export function useActionStore(): ActionStore {
	const context = useContext(ActionStoreContext);
	if (!context) {
		throw new Error(
			"useActionStore must be used within an ActionStoreProvider",
		);
	}
	return context;
}
