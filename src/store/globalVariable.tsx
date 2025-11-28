import { createContext, type JSX, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import {
	createGlobalVariable,
	deleteGlobalVariable,
	listGlobalVariables,
	toggleGlobalVariableEnabled,
	updateGlobalVariable,
} from "@/libs/api";
import type { GlobalVariable, NewGlobalVariable } from "@/types/database";

interface GlobalVariableStoreState {
	variables: GlobalVariable[];
	loading: boolean;
	error: string | null;
}

interface GlobalVariableStoreActions {
	loadVariables: () => Promise<void>;
	addVariable: (variable: NewGlobalVariable) => Promise<void>;
	updateVariable: (id: number, variable: NewGlobalVariable) => Promise<void>;
	removeVariable: (id: number) => Promise<void>;
	toggleVariable: (id: number, enabled: boolean) => Promise<void>;
	clearVariables: () => void;
}

type GlobalVariableStore = [
	GlobalVariableStoreState,
	GlobalVariableStoreActions,
];

const GlobalVariableStoreContext = createContext<GlobalVariableStore>();

export function GlobalVariableStoreProvider(props: {
	readonly children: JSX.Element;
}) {
	const [store, setStore] = createStore<GlobalVariableStoreState>({
		variables: [],
		loading: false,
		error: null,
	});

	const actions: GlobalVariableStoreActions = {
		async loadVariables() {
			setStore({ loading: true, error: null });
			try {
				const result = await listGlobalVariables();
				if (result.isOk()) {
					setStore({
						variables: result.value,
						loading: false,
					});
				} else {
					setStore({ error: result.error.message, loading: false });
				}
			} catch (error) {
				setStore({
					error: `Failed to load global variables: ${error}`,
					loading: false,
				});
			}
		},

		async addVariable(variable: NewGlobalVariable) {
			setStore({ loading: true, error: null });
			try {
				const result = await createGlobalVariable(variable);
				if (result.isOk()) {
					setStore("variables", (prev) => [...prev, result.value]);
					setStore({ loading: false });
				} else {
					setStore({ error: result.error.message, loading: false });
				}
			} catch (error) {
				setStore({
					error: `Failed to create global variable: ${error}`,
					loading: false,
				});
			}
		},

		async updateVariable(id: number, variable: NewGlobalVariable) {
			setStore({ loading: true, error: null });
			try {
				const result = await updateGlobalVariable(id, variable);
				if (result.isOk()) {
					setStore("variables", (prev) =>
						prev.map((v) => (v.id === id ? result.value : v)),
					);
					setStore({ loading: false });
				} else {
					setStore({ error: result.error.message, loading: false });
				}
			} catch (error) {
				setStore({
					error: `Failed to update global variable: ${error}`,
					loading: false,
				});
			}
		},

		async removeVariable(id: number) {
			setStore({ loading: true, error: null });
			try {
				const result = await deleteGlobalVariable(id);
				if (result.isOk()) {
					setStore("variables", (prev) => prev.filter((v) => v.id !== id));
					setStore({ loading: false });
				} else {
					setStore({ error: result.error.message, loading: false });
				}
			} catch (error) {
				setStore({
					error: `Failed to delete global variable: ${error}`,
					loading: false,
				});
			}
		},

		async toggleVariable(id: number, enabled: boolean) {
			try {
				const result = await toggleGlobalVariableEnabled(id, enabled);

				if (result.isOk()) {
					setStore("variables", (prev) =>
						prev.map((v) => (v.id === id ? result.value : v)),
					);
				} else {
					setStore({ error: result.error.message });
				}
			} catch (error) {
				setStore({ error: `Failed to toggle global variable: ${error}` });
			}
		},

		clearVariables() {
			setStore({ variables: [], error: null });
		},
	};

	return (
		<GlobalVariableStoreContext.Provider value={[store, actions]}>
			{props.children}
		</GlobalVariableStoreContext.Provider>
	);
}

export function useGlobalVariableStore(): GlobalVariableStore {
	const context = useContext(GlobalVariableStoreContext);
	if (!context) {
		throw new Error(
			"useGlobalVariableStore must be used within a GlobalVariableStoreProvider",
		);
	}
	return context;
}
