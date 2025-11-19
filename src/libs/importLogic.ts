import { ActionAdapter, type ActionExport } from "@/models/action.model";
import type { ExportData } from "@/models/export.model";
import { ThemeAdapter, type ThemeExport } from "@/models/theme.model";
import { ToolAdapter, type ToolExport } from "@/models/tool.model";
import {
	WorkspaceAdapter,
	type WorkspaceExport,
} from "@/models/workspace.model";
import type { NewTheme } from "@/types/database";

export interface ImportOptions {
	selectedWorkspaces: Set<number>;
	selectedActions: Set<number>;
	selectedTools: Set<number>;
	selectedThemes: Set<number>;
	renamedWorkspaces: Map<number, string>;
	renamedActions: Map<number, string>;
}

export interface ImportCallbacks {
	createWorkspace: (data: {
		name: string;
		description?: string;
		icon?: string;
	}) => Promise<{ id: number } | null>;
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
	createTheme: (data: NewTheme) => Promise<boolean>;
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
	workspaces: WorkspaceExport[],
	selectedIds: Set<number>,
	renamedMap: Map<number, string>,
	createWorkspace: ImportCallbacks["createWorkspace"],
): Promise<{ idMap: Map<number, number>; count: number }> {
	const idMap = new Map<number, number>();
	let count = 0;

	for (const workspace of workspaces) {
		if (!selectedIds.has(workspace.id)) continue;

		const parsed = WorkspaceAdapter.fromExport(workspace);
		const workspaceName = renamedMap.get(workspace.id) || parsed.name;
		const newWorkspace = await createWorkspace({
			name: workspaceName,
			description: parsed.description ?? undefined,
			icon: parsed.icon ?? undefined,
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
	tools: ToolExport[],
	selectedIds: Set<number>,
	createTool: ImportCallbacks["createTool"],
): Promise<number> {
	let count = 0;

	for (const tool of tools) {
		if (!selectedIds.has(tool.id)) continue;

		const parsed = ToolAdapter.fromExport(tool);
		const newTool = await createTool({
			name: parsed.name,
			description: parsed.description ?? undefined,
			icon: parsed.icon ?? undefined,
			enabled: parsed.enabled,
			tool_type: parsed.tool_type,
			template: parsed.template,
			placeholders: parsed.placeholders || "[]",
			category: parsed.category ?? undefined,
		});

		if (newTool) {
			count++;
		}
	}

	return count;
}

async function importThemes(
	themes: ThemeExport[],
	selectedIds: Set<number>,
	createTheme: ImportCallbacks["createTheme"],
): Promise<number> {
	let count = 0;

	for (const theme of themes) {
		if (!selectedIds.has(theme.id)) continue;

		const parsed = ThemeAdapter.fromExport(theme);
		await createTheme({
			name: parsed.name,
			description: parsed.description ?? undefined,
			light_colors: parsed.light_colors,
			dark_colors: parsed.dark_colors,
			is_predefined: parsed.is_predefined ?? false,
		});

		count++;
	}

	return count;
}

/**
 * Imports actions
 */
async function importActions(
	actions: ActionExport[],
	selectedIds: Set<number>,
	renamedMap: Map<number, string>,
	workspaceIdMap: Map<number, number>,
	createAction: ImportCallbacks["createAction"],
): Promise<number> {
	let count = 0;
	let skipped = 0;

	for (const action of actions) {
		if (!selectedIds.has(action.id)) continue;

		const mappedWorkspaceId = action.workspace_id
			? workspaceIdMap.get(action.workspace_id)
			: undefined;

		if (!mappedWorkspaceId) {
			console.warn(
				`Skipping action "${action.name}" - workspace not imported (original workspace_id: ${action.workspace_id})`,
			);
			skipped++;
			continue;
		}

		const parsed = ActionAdapter.fromExport(action);
		await createAction({
			name: renamedMap.get(action.id) || parsed.name,
			workspace_id: mappedWorkspaceId,
			action_type: parsed.action_type,
			config: parsed.config,
			dependencies: parsed.dependencies ?? null,
			timeout_seconds: parsed.timeout_seconds ?? null,
			detached: parsed.detached,
			track_process: parsed.track_process,
			os_overrides: parsed.os_overrides ?? null,
			order_index: parsed.order_index,
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

		const { idMap: workspaceIdMap, count: workspaceCount } =
			await importWorkspaces(
				data.workspaces || [],
				options.selectedWorkspaces,
				options.renamedWorkspaces,
				callbacks.createWorkspace,
			);
		totalImported += workspaceCount;

		const toolCount = await importTools(
			data.tools || [],
			options.selectedTools,
			callbacks.createTool,
		);
		totalImported += toolCount;

		const themeCount = await importThemes(
			data.themes || [],
			options.selectedThemes,
			callbacks.createTheme,
		);
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
