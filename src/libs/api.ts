import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import Database from "@tauri-apps/plugin-sql";
import { err, ok, type Result } from "neverthrow";
import type {
	Action,
	GlobalVariable,
	NewAction,
	NewGlobalVariable,
	NewRun,
	NewTool,
	NewVariable,
	NewWorkspace,
	Run,
	Setting,
	Tool,
	Variable,
	Workspace,
} from "@/types/database";

const sqliteBoolean = (value: number | boolean | string): boolean => {
	if (typeof value === "string") {
		return value === "true" || value === "1";
	}
	return Boolean(value);
};

export interface LaunchActionRequest {
	workspace_id: number;
	action_id: number;
	action_type: string;
	config: Record<string, unknown>;
	variables: Record<string, string>;
}

export interface LaunchWorkspaceRequest {
	workspace_id: number;
	actions: LaunchActionRequest[];
}

export interface LaunchResult {
	success: boolean;
	message: string;
	process_id?: number;
	run_id?: number;
}

export interface ActionStartedEvent {
	action_id: number;
	workspace_id: number;
	run_id: number;
	process_id?: number;
}

export interface ActionCompletedEvent {
	action_id: number;
	workspace_id: number;
	run_id: number;
	exit_code?: number;
	success: boolean;
}

export interface ActionLogEvent {
	action_id: number;
	workspace_id: number;
	run_id: number;
	level: string;
	message: string;
}

export type ApiError = {
	message: string;
	code?: string;
};

let db: Database | null = null;

export async function initializeDatabase(): Promise<Result<void, ApiError>> {
	try {
		const initError = await invoke<string | null>("get_db_init_error", {});
		if (initError) {
			return err({
				message: initError,
				code: "DB_MIGRATION_REPAIR_NEEDED",
			});
		}

		console.log("Attempting to load database...");
		const dbPath = await invoke<string>("get_db_path");
		console.log(`Loading database from: ${dbPath}`);
		db = await Database.load(`sqlite:${dbPath}`);
		console.log("Database loaded successfully");

		const testResult = await db.execute("SELECT 1");
		console.log("Database test query successful", testResult);

		return ok(undefined);
	} catch (error: unknown) {
		console.error("Database initialization error:", error);
		return err({
			message: `Failed to initialize database: ${error}`,
			code: "DB_INIT_ERROR",
		});
	}
}

export async function repairDatabase(): Promise<Result<void, ApiError>> {
	try {
		await invoke("repair_database");
		return ok(undefined);
	} catch (error) {
		return err({
			message: `Failed to repair database: ${error}`,
			code: "DB_REPAIR_ERROR",
		});
	}
}

export function getDatabase(): Database {
	if (!db) {
		throw new Error(
			"Database not initialized. Call initializeDatabase() first.",
		);
	}
	return db;
}

export async function checkDatabaseSchema(): Promise<Result<void, ApiError>> {
	try {
		const db = getDatabase();

		const tableInfo = await db.select<Array<{ name: string }>>(
			"PRAGMA table_info(variables)",
		);
		console.log("Variables table schema:", tableInfo);

		const hasWorkspaceId = tableInfo.some((col) => col.name === "workspace_id");
		const hasEnabled = tableInfo.some((col) => col.name === "enabled");

		if (!hasWorkspaceId) {
			return err({
				message:
					"Database schema is outdated. The 'variables' table is missing the 'workspace_id' column. Please restart the application to apply migrations.",
				code: "SCHEMA_OUTDATED",
			});
		}

		if (!hasEnabled) {
			console.warn(
				"Variables table missing 'enabled' column, but this is not critical",
			);
		}

		return ok(undefined);
	} catch (error) {
		return err({
			message: `Failed to check database schema: ${error}`,
			code: "SCHEMA_CHECK_ERROR",
		});
	}
}

export async function createWorkspace(
	workspace: NewWorkspace,
): Promise<Result<Workspace, ApiError>> {
	try {
		const db = getDatabase();
		const result = await db.execute(
			"INSERT INTO workspaces (name, description, icon) VALUES ($1, $2, $3)",
			[workspace.name, workspace.description || "", workspace.icon || null],
		);
		const rows = await db.select<Workspace[]>(
			"SELECT id, name, description, icon, created_at, updated_at FROM workspaces WHERE id = $1",
			[result.lastInsertId],
		);
		if (rows.length === 0) {
			throw new Error("Failed to retrieve created workspace");
		}
		return ok(rows[0]);
	} catch (error) {
		return err({ message: `Failed to create workspace: ${error}` });
	}
}

export async function getWorkspace(
	id: number,
): Promise<Result<Workspace, ApiError>> {
	try {
		const db = getDatabase();
		const rows = await db.select<Workspace[]>(
			"SELECT id, name, description, icon, created_at, updated_at FROM workspaces WHERE id = $1",
			[id],
		);
		if (rows.length === 0) {
			throw new Error("Workspace not found");
		}
		return ok(rows[0]);
	} catch (error) {
		return err({ message: `Failed to get workspace: ${error}` });
	}
}

export async function listWorkspaces(): Promise<Result<Workspace[], ApiError>> {
	try {
		const db = getDatabase();
		return ok(
			await db.select<Workspace[]>(
				"SELECT id, name, description, icon, created_at, updated_at FROM workspaces ORDER BY updated_at DESC",
			),
		);
	} catch (error) {
		return err({ message: `Failed to list workspaces: ${error}` });
	}
}

export async function updateWorkspace(
	id: number,
	workspace: NewWorkspace,
): Promise<Result<Workspace, ApiError>> {
	try {
		const db = getDatabase();
		await db.execute(
			"UPDATE workspaces SET name = $1, description = $2, icon = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4",
			[workspace.name, workspace.description || "", workspace.icon || null, id],
		);
		const rows = await db.select<Workspace[]>(
			"SELECT id, name, description, icon, created_at, updated_at FROM workspaces WHERE id = $1",
			[id],
		);
		if (rows.length === 0) {
			throw new Error("Workspace not found");
		}
		return ok(rows[0]);
	} catch (error) {
		return err({ message: `Failed to update workspace: ${error}` });
	}
}

export async function deleteWorkspace(
	id: number,
): Promise<Result<void, ApiError>> {
	try {
		const db = getDatabase();
		await db.execute("DELETE FROM workspaces WHERE id = $1", [id]);
		return ok(undefined);
	} catch (error) {
		return err({ message: `Failed to delete workspace: ${error}` });
	}
}

export async function createAction(
	newAction: NewAction,
): Promise<Result<Action, ApiError>> {
	try {
		const db = getDatabase();

		const result = await db.execute(
			"INSERT INTO actions (workspace_id, name, action_type, config, dependencies, timeout_seconds, detached, track_process, auto_launch, os_overrides, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
			[
				newAction.workspace_id,
				newAction.name,
				newAction.action_type,
				newAction.config,
				newAction.dependencies || null,
				newAction.timeout_seconds || null,
				newAction.detached ? 1 : 0,
				newAction.track_process ? 1 : 0,
				newAction.auto_launch ? 1 : 0,
				newAction.os_overrides || null,
				newAction.order_index,
			],
		);

		const rows = await db.select<RawActionRow[]>(
			"SELECT id, workspace_id, name, action_type, config, dependencies, timeout_seconds, detached, track_process, auto_launch, os_overrides, order_index, created_at, updated_at FROM actions WHERE id = $1",
			[result.lastInsertId],
		);
		if (rows.length === 0) {
			throw new Error("Failed to retrieve created action");
		}

		const action = convertDatabaseRowToAction(rows[0]);
		return ok(action);
	} catch (error) {
		return err({ message: `Failed to create action: ${error}` });
	}
}

export async function getAction(id: number): Promise<Result<Action, ApiError>> {
	try {
		const db = getDatabase();
		const rows = await db.select<RawActionRow[]>(
			"SELECT id, workspace_id, name, action_type, config, dependencies, timeout_seconds, detached, track_process, auto_launch, os_overrides, order_index, created_at, updated_at FROM actions WHERE id = $1",
			[id],
		);
		if (rows.length === 0) {
			throw new Error("Action not found");
		}

		const action = convertDatabaseRowToAction(rows[0]);
		return ok(action);
	} catch (error) {
		return err({ message: `Failed to get action: ${error}` });
	}
}

export async function listActionsByWorkspace(
	workspaceId: number,
): Promise<Result<Action[], ApiError>> {
	try {
		const db = getDatabase();
		const rows = await db.select<RawActionRow[]>(
			"SELECT id, workspace_id, name, action_type, config, dependencies, timeout_seconds, detached, track_process, auto_launch, os_overrides, order_index, created_at, updated_at FROM actions WHERE workspace_id = $1 ORDER BY order_index ASC",
			[workspaceId],
		);

		const actions: Action[] = rows.map((row) =>
			convertDatabaseRowToAction(row),
		);
		return ok(actions);
	} catch (error) {
		return err({ message: `Failed to list actions: ${error}` });
	}
}

export async function listAutoLaunchActions(): Promise<
	Result<Action[], ApiError>
> {
	try {
		const db = getDatabase();
		const rows = await db.select<RawActionRow[]>(
			"SELECT id, workspace_id, name, action_type, config, dependencies, timeout_seconds, detached, track_process, auto_launch, os_overrides, order_index, created_at, updated_at FROM actions WHERE auto_launch = 1 ORDER BY workspace_id, order_index ASC",
		);

		const actions: Action[] = rows.map((row) =>
			convertDatabaseRowToAction(row),
		);
		return ok(actions);
	} catch (error) {
		return err({ message: `Failed to list auto-launch actions: ${error}` });
	}
}

export async function updateAction(
	id: number,
	action: NewAction,
): Promise<Result<Action, ApiError>> {
	try {
		const db = getDatabase();
		await db.execute(
			"UPDATE actions SET workspace_id = $1, name = $2, action_type = $3, config = $4, dependencies = $5, timeout_seconds = $6, detached = $7, track_process = $8, auto_launch = $9, os_overrides = $10, order_index = $11, updated_at = CURRENT_TIMESTAMP WHERE id = $12",
			[
				action.workspace_id,
				action.name,
				action.action_type,
				action.config,
				action.dependencies || null,
				action.timeout_seconds || null,
				action.detached ? 1 : 0,
				action.track_process ? 1 : 0,
				action.auto_launch ? 1 : 0,
				action.os_overrides || null,
				action.order_index,
				id,
			],
		);
		const rows = await db.select<RawActionRow[]>(
			"SELECT id, workspace_id, name, action_type, config, dependencies, timeout_seconds, detached, track_process, auto_launch, os_overrides, order_index, created_at, updated_at FROM actions WHERE id = $1",
			[id],
		);
		if (rows.length === 0) {
			throw new Error("Action not found");
		}

		const updatedAction = convertDatabaseRowToAction(rows[0]);
		return ok(updatedAction);
	} catch (error) {
		return err({ message: `Failed to update action: ${error}` });
	}
}

export async function deleteAction(
	id: number,
): Promise<Result<void, ApiError>> {
	try {
		const db = getDatabase();
		await db.execute("DELETE FROM actions WHERE id = $1", [id]);
		return ok(undefined);
	} catch (error) {
		return err({ message: `Failed to delete action: ${error}` });
	}
}

interface RawVariableRow {
	id: number;
	workspace_id: number;
	key: string;
	value: string;
	is_secure: string | number | boolean;
	enabled: string | number | boolean;
	created_at: string;
	updated_at: string;
}

interface RawActionRow {
	id: number;
	workspace_id: number;
	name: string;
	action_type: string;
	config: string;
	dependencies: string | null;
	timeout_seconds: number | null;
	detached: number | boolean;
	track_process: number | boolean;
	auto_launch: number | boolean;
	os_overrides: string | null;
	order_index: number;
	created_at: string;
	updated_at: string;
}

function convertDatabaseRowToAction(row: RawActionRow): Action {
	return {
		...row,
		detached: sqliteBoolean(row.detached),
		track_process: sqliteBoolean(row.track_process),
		auto_launch: sqliteBoolean(row.auto_launch),
	};
}

function convertDatabaseRowToVariable(row: RawVariableRow): Variable {
	const converted = {
		...row,
		is_secure: sqliteBoolean(row.is_secure),
		enabled: sqliteBoolean(row.enabled),
	};

	console.log("API: Converting database row:", {
		original: { is_secure: row.is_secure, enabled: row.enabled },
		converted: { is_secure: converted.is_secure, enabled: converted.enabled },
		types: {
			original_secure_type: typeof row.is_secure,
			original_enabled_type: typeof row.enabled,
			converted_secure_type: typeof converted.is_secure,
			converted_enabled_type: typeof converted.enabled,
		},
	});

	return converted;
}

export async function createVariable(
	variable: NewVariable,
): Promise<Result<Variable, ApiError>> {
	try {
		console.log("createVariable called with:", variable);
		const db = getDatabase();

		const result = await db.execute(
			"INSERT INTO variables (workspace_id, key, value, is_secure, enabled) VALUES ($1, $2, $3, $4, $5)",
			[
				variable.workspace_id,
				variable.key,
				variable.value,
				variable.is_secure ? 1 : 0,
				(variable.enabled ?? true) ? 1 : 0,
			],
		);
		console.log("Variable inserted, ID:", result.lastInsertId);

		const rows = await db.select<RawVariableRow[]>(
			"SELECT id, workspace_id, key, value, is_secure, enabled, created_at, updated_at FROM variables WHERE id = $1",
			[result.lastInsertId],
		);
		if (rows.length === 0) {
			throw new Error("Failed to retrieve created variable");
		}
		const convertedVariable = convertDatabaseRowToVariable(rows[0]);
		console.log("Variable created successfully:", convertedVariable);
		return ok(convertedVariable);
	} catch (error) {
		console.error("createVariable error:", error);
		return err({ message: `Failed to create variable: ${error}` });
	}
}

export async function listVariablesByWorkspace(
	workspaceId: number,
): Promise<Result<Variable[], ApiError>> {
	try {
		const db = getDatabase();
		const rows = await db.select<RawVariableRow[]>(
			"SELECT id, workspace_id, key, value, is_secure, enabled, created_at, updated_at FROM variables WHERE workspace_id = $1 ORDER BY key ASC",
			[workspaceId],
		);
		const variables = rows.map((row) => convertDatabaseRowToVariable(row));
		return ok(variables);
	} catch (error) {
		return err({ message: `Failed to list variables: ${error}` });
	}
}

export async function updateVariable(
	id: number,
	variable: NewVariable,
): Promise<Result<Variable, ApiError>> {
	try {
		const db = getDatabase();
		await db.execute(
			"UPDATE variables SET workspace_id = $1, key = $2, value = $3, is_secure = $4, enabled = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6",
			[
				variable.workspace_id,
				variable.key,
				variable.value,
				variable.is_secure ? 1 : 0,
				(variable.enabled ?? true) ? 1 : 0,
				id,
			],
		);
		const rows = await db.select<RawVariableRow[]>(
			"SELECT id, workspace_id, key, value, is_secure, enabled, created_at, updated_at FROM variables WHERE id = $1",
			[id],
		);
		if (rows.length === 0) {
			throw new Error("Variable not found");
		}
		const convertedVariable = convertDatabaseRowToVariable(rows[0]);
		return ok(convertedVariable);
	} catch (error) {
		return err({ message: `Failed to update variable: ${error}` });
	}
}

export async function deleteVariable(
	id: number,
): Promise<Result<void, ApiError>> {
	try {
		const db = getDatabase();
		await db.execute("DELETE FROM variables WHERE id = $1", [id]);
		return ok(undefined);
	} catch (error) {
		return err({ message: `Failed to delete variable: ${error}` });
	}
}

export async function toggleVariableEnabled(
	id: number,
	enabled: boolean,
): Promise<Result<Variable, ApiError>> {
	try {
		const db = getDatabase();
		await db.execute(
			"UPDATE variables SET enabled = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
			[enabled ? 1 : 0, id],
		);
		const rows = await db.select<RawVariableRow[]>(
			"SELECT id, workspace_id, key, value, is_secure, enabled, created_at, updated_at FROM variables WHERE id = $1",
			[id],
		);
		if (rows.length === 0) {
			throw new Error("Variable not found");
		}
		const convertedVariable = convertDatabaseRowToVariable(rows[0]);
		return ok(convertedVariable);
	} catch (error) {
		return err({ message: `Failed to toggle variable: ${error}` });
	}
}

interface RawGlobalVariableRow {
	id: number;
	key: string;
	value: string;
	is_secure: string | number | boolean;
	enabled: string | number | boolean;
	created_at: string;
	updated_at: string;
}

function convertDatabaseRowToGlobalVariable(
	row: RawGlobalVariableRow,
): GlobalVariable {
	return {
		...row,
		is_secure: sqliteBoolean(row.is_secure),
		enabled: sqliteBoolean(row.enabled),
	};
}

export async function createGlobalVariable(
	variable: NewGlobalVariable,
): Promise<Result<GlobalVariable, ApiError>> {
	try {
		const db = getDatabase();
		const result = await db.execute(
			"INSERT INTO global_variables (key, value, is_secure, enabled) VALUES ($1, $2, $3, $4)",
			[
				variable.key,
				variable.value,
				variable.is_secure ? 1 : 0,
				(variable.enabled ?? true) ? 1 : 0,
			],
		);
		const rows = await db.select<RawGlobalVariableRow[]>(
			"SELECT id, key, value, is_secure, enabled, created_at, updated_at FROM global_variables WHERE id = $1",
			[result.lastInsertId],
		);
		if (rows.length === 0) {
			throw new Error("Failed to retrieve created global variable");
		}
		return ok(convertDatabaseRowToGlobalVariable(rows[0]));
	} catch (error) {
		return err({ message: `Failed to create global variable: ${error}` });
	}
}

export async function listGlobalVariables(): Promise<
	Result<GlobalVariable[], ApiError>
> {
	try {
		const db = getDatabase();
		const rows = await db.select<RawGlobalVariableRow[]>(
			"SELECT id, key, value, is_secure, enabled, created_at, updated_at FROM global_variables ORDER BY key ASC",
		);
		const variables = rows.map((row) =>
			convertDatabaseRowToGlobalVariable(row),
		);
		return ok(variables);
	} catch (error) {
		return err({ message: `Failed to list global variables: ${error}` });
	}
}

export async function updateGlobalVariable(
	id: number,
	variable: NewGlobalVariable,
): Promise<Result<GlobalVariable, ApiError>> {
	try {
		const db = getDatabase();
		await db.execute(
			"UPDATE global_variables SET key = $1, value = $2, is_secure = $3, enabled = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5",
			[
				variable.key,
				variable.value,
				variable.is_secure ? 1 : 0,
				(variable.enabled ?? true) ? 1 : 0,
				id,
			],
		);
		const rows = await db.select<RawGlobalVariableRow[]>(
			"SELECT id, key, value, is_secure, enabled, created_at, updated_at FROM global_variables WHERE id = $1",
			[id],
		);
		if (rows.length === 0) {
			throw new Error("Global variable not found");
		}
		return ok(convertDatabaseRowToGlobalVariable(rows[0]));
	} catch (error) {
		return err({ message: `Failed to update global variable: ${error}` });
	}
}

export async function deleteGlobalVariable(
	id: number,
): Promise<Result<void, ApiError>> {
	try {
		const db = getDatabase();
		await db.execute("DELETE FROM global_variables WHERE id = $1", [id]);
		return ok(undefined);
	} catch (error) {
		return err({ message: `Failed to delete global variable: ${error}` });
	}
}

export async function toggleGlobalVariableEnabled(
	id: number,
	enabled: boolean,
): Promise<Result<GlobalVariable, ApiError>> {
	try {
		const db = getDatabase();
		await db.execute(
			"UPDATE global_variables SET enabled = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
			[enabled ? 1 : 0, id],
		);
		const rows = await db.select<RawGlobalVariableRow[]>(
			"SELECT id, key, value, is_secure, enabled, created_at, updated_at FROM global_variables WHERE id = $1",
			[id],
		);
		if (rows.length === 0) {
			throw new Error("Global variable not found");
		}
		return ok(convertDatabaseRowToGlobalVariable(rows[0]));
	} catch (error) {
		return err({ message: `Failed to toggle global variable: ${error}` });
	}
}

export async function getSetting(
	key: string,
): Promise<Result<Setting | null, ApiError>> {
	try {
		const db = getDatabase();
		const rows = await db.select<Setting[]>(
			"SELECT id, key, value, created_at, updated_at FROM settings WHERE key = $1",
			[key],
		);
		return ok(rows.length > 0 ? rows[0] : null);
	} catch (error) {
		return err({ message: `Failed to get setting: ${error}` });
	}
}

export async function setSetting(
	key: string,
	value: string,
): Promise<Result<Setting, ApiError>> {
	try {
		const db = getDatabase();
		await db.execute(
			"INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)",
			[key, value],
		);
		const rows = await db.select<Setting[]>(
			"SELECT id, key, value, created_at, updated_at FROM settings WHERE key = $1",
			[key],
		);
		if (rows.length === 0) {
			throw new Error("Failed to retrieve setting");
		}
		return ok(rows[0]);
	} catch (error) {
		return err({ message: `Failed to set setting: ${error}` });
	}
}

export async function listSettings(): Promise<Result<Setting[], ApiError>> {
	try {
		const db = getDatabase();
		return ok(
			await db.select<Setting[]>(
				"SELECT id, key, value, created_at, updated_at FROM settings ORDER BY key",
			),
		);
	} catch (error) {
		return err({ message: `Failed to list settings: ${error}` });
	}
}

export async function launchAction(
	request: LaunchActionRequest,
): Promise<Result<LaunchResult, ApiError>> {
	try {
		console.log("Launching action:", request);
		const result = await invoke<LaunchResult>("launch_action", { request });
		return ok(result);
	} catch (error) {
		console.error("Failed to launch action:", error);
		return err({ message: `Failed to launch action: ${error}` });
	}
}

export async function launchWorkspace(
	request: LaunchWorkspaceRequest,
): Promise<Result<LaunchResult[], ApiError>> {
	try {
		console.log("Launching workspace:", request);
		const results = await invoke<LaunchResult[]>("launch_workspace", {
			request,
		});
		return ok(results);
	} catch (error) {
		console.error("Failed to launch workspace:", error);
		return err({ message: `Failed to launch workspace: ${error}` });
	}
}

export function listenToActionEvents() {
	listen<ActionStartedEvent>("action-started", (event) => {
		console.log("Action started:", event.payload);
		window.dispatchEvent(
			new CustomEvent("action-started", { detail: event.payload }),
		);
	});

	listen<ActionCompletedEvent>("action-completed", (event) => {
		console.log("Action completed:", event.payload);
		window.dispatchEvent(
			new CustomEvent("action-completed", { detail: event.payload }),
		);
	});

	listen<ActionLogEvent>("action-log", (event) => {
		console.log("Action log:", event.payload);
		window.dispatchEvent(
			new CustomEvent("action-log", { detail: event.payload }),
		);
	});
}

export async function prepareActionLaunchRequest(
	workspaceId: number,
	action: Action,
	variables: Variable[],
): Promise<LaunchActionRequest> {
	const variableMap: Record<string, string> = {};
	for (const variable of variables) {
		if (variable.enabled) {
			variableMap[variable.key] = variable.value;
		}
	}

	let config: Record<string, unknown>;
	try {
		config = JSON.parse(action.config);
	} catch {
		console.error("Failed to parse action config:", action.config);
		config = {};
	}

	return {
		workspace_id: workspaceId,
		action_id: action.id,
		action_type: action.action_type,
		config,
		variables: variableMap,
	};
}

export async function prepareWorkspaceLaunchRequest(
	workspaceId: number,
	actions: Action[],
	variables: Variable[],
): Promise<LaunchWorkspaceRequest> {
	const actionRequests: LaunchActionRequest[] = [];

	const sortedActions = [...actions].sort(
		(a, b) => a.order_index - b.order_index,
	);

	for (const action of sortedActions) {
		const actionRequest = await prepareActionLaunchRequest(
			workspaceId,
			action,
			variables,
		);
		actionRequests.push(actionRequest);
	}

	return {
		workspace_id: workspaceId,
		actions: actionRequests,
	};
}

// =============================================================================
// TOOL MANAGEMENT API
// =============================================================================

export async function listTools(): Promise<Result<Tool[], string>> {
	try {
		const db = getDatabase();
		const tools = await db.select<Tool[]>(
			"SELECT * FROM tools ORDER BY category, name",
		);
		return ok(tools);
	} catch (error) {
		console.error("Failed to list tools:", error);
		return err(`Failed to list tools: ${error}`);
	}
}

export async function getToolById(
	id: number,
): Promise<Result<Tool | null, string>> {
	try {
		const db = getDatabase();
		const tools = await db.select<Tool[]>("SELECT * FROM tools WHERE id = ?", [
			id,
		]);
		return ok(tools[0] || null);
	} catch (error) {
		console.error("Failed to get tool:", error);
		return err(`Failed to get tool: ${error}`);
	}
}

export async function createTool(
	tool: NewTool,
): Promise<Result<number, string>> {
	try {
		const db = getDatabase();
		const result = await db.execute(
			`INSERT INTO tools (name, description, icon, enabled, tool_type, template, placeholders, category, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
			[
				tool.name,
				tool.description || null,
				tool.icon || null,
				tool.enabled,
				tool.tool_type,
				tool.template,
				tool.placeholders,
				tool.category || null,
			],
		);
		return ok(result.lastInsertId as number);
	} catch (error) {
		console.error("Failed to create tool:", error);
		return err(`Failed to create tool: ${error}`);
	}
}

export async function updateTool(
	id: number,
	tool: Partial<NewTool>,
): Promise<Result<void, string>> {
	try {
		const db = getDatabase();

		const setParts: string[] = [];
		const values: (string | number | boolean | null)[] = [];

		if (tool.name !== undefined) {
			setParts.push("name = ?");
			values.push(tool.name);
		}
		if (tool.description !== undefined) {
			setParts.push("description = ?");
			values.push(tool.description);
		}
		if (tool.icon !== undefined) {
			setParts.push("icon = ?");
			values.push(tool.icon);
		}
		if (tool.enabled !== undefined) {
			setParts.push("enabled = ?");
			values.push(tool.enabled);
		}
		if (tool.tool_type !== undefined) {
			setParts.push("tool_type = ?");
			values.push(tool.tool_type);
		}
		if (tool.template !== undefined) {
			setParts.push("template = ?");
			values.push(tool.template);
		}
		if (tool.placeholders !== undefined) {
			setParts.push("placeholders = ?");
			values.push(tool.placeholders);
		}
		if (tool.category !== undefined) {
			setParts.push("category = ?");
			values.push(tool.category);
		}

		setParts.push("updated_at = CURRENT_TIMESTAMP");
		values.push(id);

		await db.execute(
			`UPDATE tools SET ${setParts.join(", ")} WHERE id = ?`,
			values,
		);

		return ok(undefined);
	} catch (error) {
		console.error("Failed to update tool:", error);
		return err(`Failed to update tool: ${error}`);
	}
}

export async function deleteTool(id: number): Promise<Result<void, string>> {
	try {
		const db = getDatabase();
		await db.execute("DELETE FROM tools WHERE id = ?", [id]);
		return ok(undefined);
	} catch (error) {
		console.error("Failed to delete tool:", error);
		return err(`Failed to delete tool: ${error}`);
	}
}

export async function toggleToolEnabled(
	id: number,
	enabled: boolean,
): Promise<Result<void, string>> {
	try {
		const db = getDatabase();
		await db.execute(
			"UPDATE tools SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
			[enabled ? 1 : 0, id],
		);
		return ok(undefined);
	} catch (error) {
		console.error("Failed to toggle tool:", error);
		return err(`Failed to toggle tool: ${error}`);
	}
}

// ============================================================================
// Run Management
// ============================================================================

export async function createRun(run: NewRun): Promise<Result<Run, string>> {
	try {
		const db = getDatabase();
		const result = await db.execute(
			"INSERT INTO runs (workspace_id, action_id, status, started_at, completed_at, exit_code, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)",
			[
				run.workspace_id,
				run.action_id,
				run.status,
				run.started_at,
				run.completed_at ?? null,
				run.exit_code ?? null,
				run.error_message ?? null,
			],
		);
		const created = await db.select<Run[]>("SELECT * FROM runs WHERE id = ?", [
			result.lastInsertId,
		]);
		return ok(created[0]);
	} catch (error) {
		console.error("Failed to create run:", error);
		return err(`Failed to create run: ${error}`);
	}
}

export async function updateRunStatus(
	id: number,
	status: "success" | "failed" | "cancelled",
	exitCode?: number,
	errorMessage?: string,
): Promise<Result<void, string>> {
	try {
		const db = getDatabase();
		const completedAt = new Date().toISOString();
		await db.execute(
			"UPDATE runs SET status = ?, completed_at = ?, exit_code = ?, error_message = ? WHERE id = ?",
			[status, completedAt, exitCode ?? null, errorMessage ?? null, id],
		);
		return ok(undefined);
	} catch (error) {
		console.error("Failed to update run status:", error);
		return err(`Failed to update run status: ${error}`);
	}
}

/**
 * Clean up old runs for a specific action, keeping only the latest N entries
 */
export async function cleanupOldRuns(
	actionId: number,
	keepCount = 20,
): Promise<Result<number, string>> {
	try {
		const db = getDatabase();
		const result = await db.execute(
			`DELETE FROM runs 
			 WHERE action_id = ? 
			 AND id NOT IN (
				 SELECT id FROM runs 
				 WHERE action_id = ? 
				 ORDER BY created_at DESC 
				 LIMIT ?
			 )`,
			[actionId, actionId, keepCount],
		);
		return ok(result.rowsAffected);
	} catch (error) {
		console.error("Failed to cleanup old runs:", error);
		return err(`Failed to cleanup old runs: ${error}`);
	}
}

/**
 * Get runs grouped by action for a workspace
 */
export async function listRunsByAction(
	workspaceId: number,
	actionId: number,
	limit = 20,
): Promise<Result<Run[], string>> {
	try {
		const db = getDatabase();
		const runs = await db.select<Run[]>(
			"SELECT * FROM runs WHERE workspace_id = ? AND action_id = ? ORDER BY created_at DESC LIMIT ?",
			[workspaceId, actionId, limit],
		);
		return ok(runs);
	} catch (error) {
		console.error("Failed to list runs by action:", error);
		return err(`Failed to list runs by action: ${error}`);
	}
}

export async function listRunsByWorkspace(
	workspaceId: number,
	limit = 50,
): Promise<Result<Run[], string>> {
	try {
		const db = getDatabase();
		const runs = await db.select<Run[]>(
			"SELECT * FROM runs WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?",
			[workspaceId, limit],
		);
		return ok(runs);
	} catch (error) {
		console.error("Failed to list runs:", error);
		return err(`Failed to list runs: ${error}`);
	}
}

export async function listRunningActions(
	workspaceId?: number,
): Promise<Result<Run[], string>> {
	try {
		const db = getDatabase();
		const query = workspaceId
			? "SELECT * FROM runs WHERE status = 'running' AND workspace_id = ? ORDER BY started_at DESC"
			: "SELECT * FROM runs WHERE status = 'running' ORDER BY started_at DESC";
		const params = workspaceId ? [workspaceId] : [];
		const runs = await db.select<Run[]>(query, params);
		return ok(runs);
	} catch (error) {
		console.error("Failed to list running actions:", error);
		return err(`Failed to list running actions: ${error}`);
	}
}

// =============================================================================
// Process / Executable Discovery
// =============================================================================

export interface KillProcessResponse {
	success: boolean;
	message: string;
	denied?: boolean;
}

export interface DiscoverExecutableResponse {
	found: boolean;
	resolved_path: string | null;
	candidates_tried: string[];
	message: string;
}

export async function discoverExecutable(
	command: string,
	options?: {
		workingDirectory?: string;
		extraPaths?: string[];
	},
): Promise<Result<DiscoverExecutableResponse, string>> {
	try {
		const result = await invoke<DiscoverExecutableResponse>(
			"discover_executable",
			{
				req: {
					command,
					working_directory: options?.workingDirectory ?? null,
					extra_paths: options?.extraPaths ?? null,
				},
			},
		);
		return ok(result);
	} catch (error) {
		return err(String(error));
	}
}

export async function stopProcess(
	processId: number,
): Promise<Result<KillProcessResponse, string>> {
	try {
		const result = await invoke<KillProcessResponse>("kill_process", {
			pid: processId,
		});
		if (result.success) {
			return ok(result);
		}
		return err(result.message);
	} catch (error) {
		console.error("Failed to stop process:", error);
		return err(`Failed to stop process: ${error}`);
	}
}

export async function resetDatabase(): Promise<Result<void, ApiError>> {
	try {
		const db = getDatabase();
		const tables = [
			"runs",
			"variables",
			"global_variables",
			"actions",
			"workspaces",
			"tools",
			"settings",
		];

		for (const table of tables) {
			await db.execute(`DELETE FROM ${table}`);
		}

		return ok(undefined);
	} catch (error) {
		console.error("Failed to reset database:", error);
		return err({
			message: `Failed to reset database: ${error}`,
			code: "DB_RESET_ERROR",
		});
	}
}

export async function backupAndResetDatabase(): Promise<
	Result<string, ApiError>
> {
	try {
		const db = getDatabase();

		let workspaces: Workspace[] = [];
		let actions: Action[] = [];
		let variables: Variable[] = [];
		let tools: Tool[] = [];
		let settings: Setting[] = [];

		try {
			workspaces = await db.select<Workspace[]>("SELECT * FROM workspaces");
			actions = await db.select<Action[]>("SELECT * FROM actions");
			variables = await db.select<Variable[]>("SELECT * FROM variables");
			tools = await db.select<Tool[]>("SELECT * FROM tools");
			settings = await db.select<Setting[]>("SELECT * FROM settings");
		} catch (_backupError) {
			console.log("Some tables don't exist, creating empty backup...");
		}

		const exportData = {
			workspaces,
			actions,
			variables,
			tools,
			settings,
		};

		const timestamp =
			new Date().toISOString().replace(/[:.]/g, "-").split("T")[0] +
			"_" +
			new Date()
				.toISOString()
				.replace(/[:.]/g, "-")
				.split("T")[1]
				.split(".")[0];
		const backupFilename = `workspace-launcher-backup-${timestamp}.json`;

		const { writeTextFile } = await import("@tauri-apps/plugin-fs");
		const { join } = await import("@tauri-apps/api/path");
		const { appDataDir } = await import("@tauri-apps/api/path");

		const appDataDirPath = await appDataDir();
		const backupPath = await join(appDataDirPath, backupFilename);

		await writeTextFile(backupPath, JSON.stringify(exportData, null, 2));

		const tables = [
			"runs",
			"variables",
			"global_variables",
			"actions",
			"workspaces",
			"tools",
			"settings",
		];
		for (const table of tables) {
			await db.execute(`DELETE FROM ${table}`);
		}

		if (
			workspaces.length > 0 ||
			actions.length > 0 ||
			variables.length > 0 ||
			tools.length > 0 ||
			settings.length > 0
		) {
			console.log("Restoring backed up data...");

			for (const workspace of workspaces) {
				await db.execute(
					`INSERT INTO workspaces (id, name, description, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
					[
						workspace.id,
						workspace.name,
						workspace.description,
						workspace.icon,
						workspace.created_at,
						workspace.updated_at,
					],
				);
			}

			for (const tool of tools) {
				await db.execute(
					`INSERT INTO tools (id, name, description, tool_type, template, placeholders, enabled, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						tool.id,
						tool.name,
						tool.description,
						tool.tool_type,
						tool.template,
						tool.placeholders,
						tool.enabled,
						tool.category,
						tool.created_at,
						tool.updated_at,
					],
				);
			}

			for (const setting of settings) {
				await db.execute(
					`INSERT INTO settings (id, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
					[
						setting.id,
						setting.key,
						setting.value,
						setting.created_at,
						setting.updated_at,
					],
				);
			}

			for (const action of actions) {
				await db.execute(
					`INSERT INTO actions (id, workspace_id, name, action_type, config, dependencies, timeout_seconds, detached, os_overrides, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						action.id,
						action.workspace_id,
						action.name,
						action.action_type,
						action.config,
						action.dependencies,
						action.timeout_seconds,
						action.detached ? 1 : 0,
						action.os_overrides,
						action.order_index,
						action.created_at,
						action.updated_at,
					],
				);
			}

			for (const variable of variables) {
				await db.execute(
					`INSERT INTO variables (id, workspace_id, key, value, is_secure, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						variable.id,
						variable.workspace_id,
						variable.key,
						variable.value,
						variable.is_secure ? 1 : 0,
						variable.enabled ? 1 : 0,
						variable.created_at,
						variable.updated_at,
					],
				);
			}

			console.log("Data restoration completed successfully");
		}

		return ok(backupPath);
	} catch (error) {
		console.error("Failed to backup and reset database:", error);
		return err({
			message: `Failed to backup and reset database: ${error}`,
			code: "DB_BACKUP_RESET_ERROR",
		});
	}
}
