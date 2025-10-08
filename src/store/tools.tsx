import { createContext, type JSX, useContext } from "solid-js";
import { createStore } from "solid-js/store";

export interface Tool {
	id: string;
	name: string;
	icon: string;
	type: "vscode" | "eclipse" | "command" | "url";
	path?: string;
	command?: string;
	args?: string[];
	description?: string;
}

interface ToolsStoreState {
	tools: Tool[];
	loading: boolean;
	error: string | null;
}

interface ToolsStoreActions {
	loadTools: () => void;
	addTool: (tool: Omit<Tool, "id">) => void;
	updateTool: (id: string, tool: Partial<Tool>) => void;
	removeTool: (id: string) => void;
}

type ToolsStore = [ToolsStoreState, ToolsStoreActions];

const ToolsStoreContext = createContext<ToolsStore>();

const defaultTools: Tool[] = [
	{
		id: "vscode",
		name: "Visual Studio Code",
		icon: "i-mdi-microsoft-visual-studio-code",
		type: "vscode",
		path: "code",
		command: "code",
		args: ["{workspace_path}"],
		description: "Open workspace in VS Code",
	},
	{
		id: "eclipse",
		name: "Eclipse IDE",
		icon: "i-mdi-eclipse",
		type: "eclipse",
		path: "eclipse",
		command: "eclipse",
		args: ["-data", "{workspace_path}"],
		description: "Open workspace in Eclipse",
	},
	{
		id: "terminal",
		name: "Terminal",
		icon: "i-mdi-terminal",
		type: "command",
		command: "{shell}",
		args: [],
		description: "Open terminal in workspace directory",
	},
	{
		id: "browser",
		name: "Open URL",
		icon: "i-mdi-web",
		type: "url",
		description: "Open a URL in default browser",
	},
];

export function ToolsStoreProvider(props: { readonly children: JSX.Element }) {
	const [store, setStore] = createStore<ToolsStoreState>({
		tools: defaultTools,
		loading: false,
		error: null,
	});

	const actions: ToolsStoreActions = {
		loadTools() {
			setStore({ tools: defaultTools, loading: false });
		},

		addTool(tool: Omit<Tool, "id">) {
			const newTool: Tool = {
				...tool,
				id: `custom_${Date.now()}`,
			};
			setStore("tools", (prev) => [...prev, newTool]);
		},

		updateTool(id: string, updates: Partial<Tool>) {
			setStore("tools", (prev) => prev.map((tool) => (tool.id === id ? { ...tool, ...updates } : tool)));
		},

		removeTool(id: string) {
			setStore("tools", (prev) => prev.filter((tool) => tool.id !== id));
		},
	};

	return <ToolsStoreContext.Provider value={[store, actions]}>{props.children}</ToolsStoreContext.Provider>;
}

export function useToolsStore(): ToolsStore {
	const context = useContext(ToolsStoreContext);
	if (!context) {
		throw new Error("useToolsStore must be used within a ToolsStoreProvider");
	}
	return context;
}
