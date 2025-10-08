import { createContext, type JSX, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import {
	createVariable,
	deleteVariable,
	listVariablesByWorkspace,
	toggleVariableEnabled,
	updateVariable,
} from "@/libs/api";
import type { NewVariable, Variable } from "@/types/database";

interface VariableStoreState {
	variables: Variable[];
	loading: boolean;
	error: string | null;
}

interface VariableStoreActions {
	loadVariables: (workspaceId: number) => Promise<void>;
	addVariable: (variable: NewVariable) => Promise<void>;
	updateVariable: (id: number, variable: NewVariable) => Promise<void>;
	removeVariable: (id: number) => Promise<void>;
	toggleVariable: (id: number, enabled: boolean) => Promise<void>;
	clearVariables: () => void;
}

type VariableStore = [VariableStoreState, VariableStoreActions];

const VariableStoreContext = createContext<VariableStore>();

export function VariableStoreProvider(props: { readonly children: JSX.Element }) {
	const [store, setStore] = createStore<VariableStoreState>({
		variables: [],
		loading: false,
		error: null,
	});

	const actions: VariableStoreActions = {
		async loadVariables(workspaceId: number) {
			setStore({ loading: true, error: null });
			try {
				const result = await listVariablesByWorkspace(workspaceId);
				if (result.isOk()) {
					setStore({ variables: result.value, loading: false });
				} else {
					setStore({ error: result.error.message, loading: false });
				}
			} catch (error) {
				setStore({ error: `Failed to load variables: ${error}`, loading: false });
			}
		},

		async addVariable(variable: NewVariable) {
			setStore({ loading: true, error: null });
			try {
				const result = await createVariable(variable);
				if (result.isOk()) {
					setStore("variables", (prev) => [...prev, result.value]);
					setStore({ loading: false });
				} else {
					setStore({ error: result.error.message, loading: false });
				}
			} catch (error) {
				setStore({ error: `Failed to create variable: ${error}`, loading: false });
			}
		},

		async updateVariable(id: number, variable: NewVariable) {
			setStore({ loading: true, error: null });
			try {
				const result = await updateVariable(id, variable);
				if (result.isOk()) {
					setStore("variables", (prev) => prev.map((v) => (v.id === id ? result.value : v)));
					setStore({ loading: false });
				} else {
					setStore({ error: result.error.message, loading: false });
				}
			} catch (error) {
				setStore({ error: `Failed to update variable: ${error}`, loading: false });
			}
		},

		async removeVariable(id: number) {
			setStore({ loading: true, error: null });
			try {
				const result = await deleteVariable(id);
				if (result.isOk()) {
					setStore("variables", (prev) => prev.filter((v) => v.id !== id));
					setStore({ loading: false });
				} else {
					setStore({ error: result.error.message, loading: false });
				}
			} catch (error) {
				setStore({ error: `Failed to delete variable: ${error}`, loading: false });
			}
		},

		async toggleVariable(id: number, enabled: boolean) {
			try {
				console.log("Store: toggleVariable called with:", { id, enabled });
				const result = await toggleVariableEnabled(id, enabled);
				console.log(
					"Store: API result:",
					result.isOk() ? "success" : "error",
					result.isOk() ? result.value : result.error,
				);

				if (result.isOk()) {
					setStore("variables", (prev) => prev.map((v) => (v.id === id ? result.value : v)));
					console.log("Store: Variable updated successfully");
				} else {
					console.error("Store: API error:", result.error.message);
					setStore({ error: result.error.message });
				}
			} catch (error) {
				console.error("Store: Exception in toggleVariable:", error);
				setStore({ error: `Failed to toggle variable: ${error}` });
			}
		},

		clearVariables() {
			setStore({ variables: [], error: null });
		},
	};

	return <VariableStoreContext.Provider value={[store, actions]}>{props.children}</VariableStoreContext.Provider>;
}

export function useVariableStore(): VariableStore {
	const context = useContext(VariableStoreContext);
	if (!context) {
		throw new Error("useVariableStore must be used within a VariableStoreProvider");
	}
	return context;
}
