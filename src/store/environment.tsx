import { createContext, type ParentComponent, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import * as api from "@/libs/api";
import { showToast } from "@/libs/toast";
import type { Environment, NewEnvironment } from "@/types/database";

interface EnvironmentStore {
	environments: Environment[];
	loading: boolean;
	selectedEnvironment: Environment | null;
}

interface EnvironmentActions {
	loadEnvironmentsByWorkspace: (workspaceId: number) => Promise<void>;
	createEnvironment: (environment: NewEnvironment) => Promise<Environment | null>;
	updateEnvironment: (id: number, environment: NewEnvironment) => Promise<Environment | null>;
	deleteEnvironment: (id: number) => Promise<boolean>;
	selectEnvironment: (environment: Environment | null) => void;
	getEnvironment: (id: number) => Environment | undefined;
}

interface EnvironmentContextValue {
	store: EnvironmentStore;
	actions: EnvironmentActions;
}

const EnvironmentContext = createContext<EnvironmentContextValue>();

export const EnvironmentProvider: ParentComponent = (props) => {
	const [store, setStore] = createStore<EnvironmentStore>({
		environments: [],
		loading: false,
		selectedEnvironment: null,
	});

	const actions: EnvironmentActions = {
		async loadEnvironmentsByWorkspace(workspaceId: number) {
			setStore("loading", true);

			const result = await api.listEnvironmentsByWorkspace(workspaceId);

			if (result.isOk()) {
				setStore("environments", result.value);
			} else {
				showToast({
					title: "Error",
					description: `Failed to load environments: ${result.error.message}`,
					variant: "destructive",
				});
			}

			setStore("loading", false);
		},

		async createEnvironment(environment: NewEnvironment) {
			const result = await api.createEnvironment(environment);

			if (result.isOk()) {
				setStore("environments", (prev) => [result.value, ...prev]);
				showToast({
					title: "Success",
					description: "Environment created successfully",
				});
				return result.value;
			} else {
				showToast({
					title: "Error",
					description: `Failed to create environment: ${result.error.message}`,
					variant: "destructive",
				});
				return null;
			}
		},

		async updateEnvironment(id: number, environment: NewEnvironment) {
			const result = await api.updateEnvironment(id, environment);

			if (result.isOk()) {
				setStore("environments", (e) => e.id === id, result.value);
				if (store.selectedEnvironment?.id === id) {
					setStore("selectedEnvironment", result.value);
				}
				showToast({
					title: "Success",
					description: "Environment updated successfully",
				});
				return result.value;
			} else {
				showToast({
					title: "Error",
					description: `Failed to update environment: ${result.error.message}`,
					variant: "destructive",
				});
				return null;
			}
		},

		async deleteEnvironment(id: number) {
			const result = await api.deleteEnvironment(id);

			if (result.isOk()) {
				setStore("environments", (prev) => prev.filter((e) => e.id !== id));
				if (store.selectedEnvironment?.id === id) {
					setStore("selectedEnvironment", null);
				}
				showToast({
					title: "Success",
					description: "Environment deleted successfully",
				});
				return true;
			} else {
				showToast({
					title: "Error",
					description: `Failed to delete environment: ${result.error.message}`,
					variant: "destructive",
				});
				return false;
			}
		},

		selectEnvironment(environment: Environment | null) {
			setStore("selectedEnvironment", environment);
		},

		getEnvironment(id: number) {
			return store.environments.find((e) => e.id === id);
		},
	};

	const contextValue: EnvironmentContextValue = {
		store,
		actions,
	};

	return <EnvironmentContext.Provider value={contextValue}>{props.children}</EnvironmentContext.Provider>;
};

export function useEnvironmentStore() {
	const context = useContext(EnvironmentContext);
	if (!context) {
		throw new Error("useEnvironmentStore must be used within EnvironmentProvider");
	}
	return context;
}
