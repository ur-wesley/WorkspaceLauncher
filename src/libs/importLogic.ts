import type { Action, NewTheme, Theme, Tool, Workspace } from "@/types/database";
import type { ExportData } from "./share";

export interface ImportOptions {
	selectedWorkspaces: Set<number>;
	selectedActions: Set<number>;
	selectedTools: Set<number>;
	selectedThemes: Set<number>;
	renamedWorkspaces: Map<number, string>;
	renamedActions: Map<number, string>;
}

export interface ImportCallbacks {
	createWorkspace: (data: { name: string; description?: string; icon?: string }) => Promise<{ id: number } | null>;
	createTool: (data: {
		name: string;
		description?: string;
		icon?: string;
		enabled: boolean;
		tool_type: string;
		template: string;
		placeholders: string;
		category?: string;
	}) => Promise<{ id: number } | number | null>;
	createAction: (data: {
		name: string;
		workspace_id: number;
		action_type: string;
		config: string;
		dependencies: string | null;
		timeout_seconds: number | null;
		detached: boolean;
		track_process: boolean;
		os_overrides: string | null;
		order_index: number;
	}) => Promise<void>;
	createTheme: (data: NewTheme) => Promise<void>;
}

export interface ImportResult {
	success: boolean;
	importedCount: number;
	skippedActions?: number;
	error?: string;
}

/**
 * Imports workspaces and returns a mapping of old IDs to new IDs
 */
async function importWorkspaces(
	workspaces: Workspace[],
	selectedIds: Set<number>,
	renamedMap: Map<number, string>,
	createWorkspace: ImportCallbacks["createWorkspace"],
): Promise<{ idMap: Map<number, number>; count: number }> {
	const idMap = new Map<number, number>();
	let count = 0;

	for (const workspace of workspaces) {
		if (!selectedIds.has(workspace.id)) continue;

		const workspaceName = renamedMap.get(workspace.id) || workspace.name;
		const newWorkspace = await createWorkspace({
			name: workspaceName,
			description: workspace.description || undefined,
			icon: workspace.icon || undefined,
		});

		if (newWorkspace) {
			idMap.set(workspace.id, newWorkspace.id);
			count++;
		}
	}

	return { idMap, count };
}

/**
 * Imports tools
 */
async function importTools(
	tools: Tool[],
	selectedIds: Set<number>,
	createTool: ImportCallbacks["createTool"],
): Promise<number> {
	let count = 0;

	for (const tool of tools) {
		if (!selectedIds.has(tool.id)) continue;

		const newTool = await createTool({
			name: tool.name,
			description: tool.description || undefined,
			icon: tool.icon || undefined,
			enabled: tool.enabled,
			tool_type: tool.tool_type,
			template: tool.template,
			placeholders: tool.placeholders || "[]",
			category: tool.category || undefined,
		});

		if (newTool) {
			count++;
		}
	}

	return count;
}

async function importThemes(
	themes: Theme[],
	selectedIds: Set<number>,
	createTheme: ImportCallbacks["createTheme"],
): Promise<number> {
	let count = 0;

	for (const theme of themes) {
		if (!selectedIds.has(theme.id)) continue;

		await createTheme({
			name: theme.name,
			description: theme.description || undefined,
			light_colors: theme.light_colors,
			dark_colors: theme.dark_colors,
			is_predefined: theme.is_predefined,
		});

		count++;
	}

	return count;
}

/**
 * Imports actions
 */
async function importActions(
	actions: Action[],
	selectedIds: Set<number>,
	renamedMap: Map<number, string>,
	workspaceIdMap: Map<number, number>,
	createAction: ImportCallbacks["createAction"],
): Promise<number> {
	let count = 0;
	let skipped = 0;

	for (const action of actions) {
		if (!selectedIds.has(action.id)) continue;

		const mappedWorkspaceId = action.workspace_id ? workspaceIdMap.get(action.workspace_id) : undefined;

		if (!mappedWorkspaceId) {
			console.warn(
				`Skipping action "${action.name}" - workspace not imported (original workspace_id: ${action.workspace_id})`,
			);
			skipped++;
			continue;
		}

		const actionName = renamedMap.get(action.id) || action.name;

		const detached =
			typeof action.detached === "string"
				? action.detached === "true" || action.detached === "1"
				: Boolean(action.detached);

		const track_process =
			typeof action.track_process === "string"
				? action.track_process === "true" || action.track_process === "1"
				: Boolean(action.track_process);

		await createAction({
			name: actionName,
			workspace_id: mappedWorkspaceId,
			action_type: action.action_type,
			config: action.config,
			dependencies: action.dependencies,
			timeout_seconds: action.timeout_seconds,
			detached,
			track_process,
			os_overrides: action.os_overrides,
			order_index: action.order_index,
		});

		count++;
	}

	return count + skipped * 0;
}

/**
 * Imports selected data using provided callbacks
 */
export async function performImport(
	data: ExportData,
	options: ImportOptions,
	callbacks: ImportCallbacks,
): Promise<ImportResult> {
	try {
		let totalImported = 0;

		const { idMap: workspaceIdMap, count: workspaceCount } = await importWorkspaces(
			data.workspaces || [],
			options.selectedWorkspaces,
			options.renamedWorkspaces,
			callbacks.createWorkspace,
		);
		totalImported += workspaceCount;

		const toolCount = await importTools(data.tools || [], options.selectedTools, callbacks.createTool);
		totalImported += toolCount;

		const themeCount = await importThemes(data.themes || [], options.selectedThemes, callbacks.createTheme);
		totalImported += themeCount;

		const actionCount = await importActions(
			data.actions || [],
			options.selectedActions,
			options.renamedActions,
			workspaceIdMap,
			callbacks.createAction,
		);
		totalImported += actionCount;

		return {
			success: true,
			importedCount: totalImported,
		};
	} catch (err) {
		return {
			success: false,
			importedCount: 0,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}
