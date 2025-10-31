import { createContext, type ParentComponent, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import * as api from "@/libs/api";
import { showToast } from "@/libs/toast";
import type { NewTool, Tool } from "@/types/database";

interface ToolStoreState {
	tools: Tool[];
	isLoading: boolean;
	error: string | null;
}

interface ToolStoreActions {
	loadTools: () => Promise<void>;
	createTool: (tool: NewTool) => Promise<number | null>;
	updateTool: (id: number, tool: Partial<NewTool>) => Promise<void>;
	deleteTool: (id: number) => Promise<void>;
	toggleTool: (id: number, enabled: boolean) => Promise<void>;
	getToolsGroupedByCategory: () => Record<string, Tool[]>;
}

const ToolStoreContext = createContext<[ToolStoreState, ToolStoreActions]>();

export const ToolStoreProvider: ParentComponent = (props) => {
	const [store, setStore] = createStore<ToolStoreState>({
		tools: [],
		isLoading: false,
		error: null,
	});

	const actions: ToolStoreActions = {
		loadTools: async () => {
			setStore("isLoading", true);
			setStore("error", null);

			try {
				const result = await api.listTools();
				if (result.isOk()) {
					setStore("tools", result.value);
				} else {
					setStore("error", result.error);
					showToast({
						title: "Error",
						description: `Failed to load tools: ${result.error}`,
						variant: "destructive",
					});
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error";
				setStore("error", errorMessage);
				showToast({
					title: "Error",
					description: `Failed to load tools: ${errorMessage}`,
					variant: "destructive",
				});
			} finally {
				setStore("isLoading", false);
			}
		},

		createTool: async (tool: NewTool) => {
			try {
				const result = await api.createTool(tool);
				if (result.isOk()) {
					await actions.loadTools();
					showToast({
						title: "Success",
						description: "Tool created successfully",
						variant: "default",
					});
					return result.value;
				} else {
					showToast({
						title: "Error",
						description: `Failed to create tool: ${result.error}`,
						variant: "destructive",
					});
					return null;
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error";
				showToast({
					title: "Error",
					description: `Failed to create tool: ${errorMessage}`,
					variant: "destructive",
				});
				return null;
			}
		},

		updateTool: async (id: number, tool: Partial<NewTool>) => {
			try {
				const result = await api.updateTool(id, tool);
				if (result.isOk()) {
					await actions.loadTools();
					showToast({
						title: "Success",
						description: "Tool updated successfully",
						variant: "default",
					});
				} else {
					showToast({
						title: "Error",
						description: `Failed to update tool: ${result.error}`,
						variant: "destructive",
					});
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error";
				showToast({
					title: "Error",
					description: `Failed to update tool: ${errorMessage}`,
					variant: "destructive",
				});
			}
		},

		deleteTool: async (id: number) => {
			try {
				const result = await api.deleteTool(id);
				if (result.isOk()) {
					await actions.loadTools();
					showToast({
						title: "Success",
						description: "Tool deleted successfully",
						variant: "default",
					});
				} else {
					showToast({
						title: "Error",
						description: `Failed to delete tool: ${result.error}`,
						variant: "destructive",
					});
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error";
				showToast({
					title: "Error",
					description: `Failed to delete tool: ${errorMessage}`,
					variant: "destructive",
				});
			}
		},

		toggleTool: async (id: number, enabled: boolean) => {
			try {
				const result = await api.toggleToolEnabled(id, enabled);
				if (result.isOk()) {
					setStore("tools", (tools) => tools.map((tool) => (tool.id === id ? { ...tool, enabled } : tool)));
					showToast({
						title: "Success",
						description: `Tool ${enabled ? "enabled" : "disabled"} successfully`,
						variant: "default",
					});
				} else {
					showToast({
						title: "Error",
						description: `Failed to toggle tool: ${result.error}`,
						variant: "destructive",
					});
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error";
				showToast({
					title: "Error",
					description: `Failed to toggle tool: ${errorMessage}`,
					variant: "destructive",
				});
			}
		},

		getToolsGroupedByCategory() {
			const groups: Record<string, Tool[]> = {};
			for (const tool of store.tools) {
				const category = tool.category || "Uncategorized";
				if (!groups[category]) groups[category] = [];
				groups[category].push(tool);
			}
			return groups;
		},
	};

	return <ToolStoreContext.Provider value={[store, actions]}>{props.children}</ToolStoreContext.Provider>;
};

export const useToolStore = () => {
	const context = useContext(ToolStoreContext);
	if (!context) {
		throw new Error("useToolStore must be used within a ToolStoreProvider");
	}
	return context;
};
