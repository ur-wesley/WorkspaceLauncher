export interface Workspace {
 id: number;
 name: string;
 description: string | null;
 icon: string | null;
 created_at: string;
 updated_at: string;
}

export interface NewWorkspace {
 name: string;
 description?: string;
 icon?: string;
}

export interface Action {
 id: number;
 workspace_id: number;
 name: string;
 action_type: string;
 config: string;
 dependencies: string | null;
 timeout_seconds: number | null;
 detached: boolean;
 track_process: boolean;
 os_overrides: string | null;
 order_index: number;
 created_at: string;
 updated_at: string;
}

export interface NewAction {
 workspace_id: number;
 name: string;
 action_type: string;
 config: string;
 dependencies: string | null;
 timeout_seconds: number | null;
 detached: boolean;
 track_process: boolean;
 os_overrides: string | null;
 order_index: number;
}

export interface ActionConfigBase {
 type: string;
}

export interface VSCodeActionConfig extends ActionConfigBase {
 type: "vscode";
 workspace_path: string;
 new_window?: boolean;
}

export interface EclipseActionConfig extends ActionConfigBase {
 type: "eclipse";
 workspace_path: string;
 binary_path?: string;
}

export interface CommandActionConfig extends ActionConfigBase {
 type: "command";
 command: string;
 args?: string[];
 working_directory?: string;
 environment_variables?: Record<string, string>;
}

export interface URLActionConfig extends ActionConfigBase {
 type: "url";
 url: string;
}

export interface DelayActionConfig extends ActionConfigBase {
 type: "delay";
 duration_ms: number;
}

export type ActionConfig =
 | VSCodeActionConfig
 | EclipseActionConfig
 | CommandActionConfig
 | URLActionConfig
 | DelayActionConfig
 | ToolActionConfig;

export interface Variable {
 id: number;
 workspace_id: number;
 key: string;
 value: string;
 is_secure: boolean;
 enabled: boolean;
 created_at: string;
 updated_at: string;
}

export interface NewVariable {
 workspace_id: number;
 key: string;
 value: string;
 is_secure: boolean;
 enabled?: boolean;
}

export interface Run {
 id: number;
 workspace_id: number;
 action_id: number;
 status: "success" | "failed" | "cancelled";
 started_at: string;
 completed_at: string | null;
 exit_code: number | null;
 error_message: string | null;
 created_at: string;
}

export interface NewRun {
 workspace_id: number;
 action_id: number;
 status: "success" | "failed" | "cancelled";
 started_at: string;
 completed_at?: string;
 exit_code?: number;
 error_message?: string;
}

export interface RunningAction {
 id: string;
 workspace_id: number;
 action_id: number;
 action_name: string;
 process_id: number;
 started_at: string;
}

export interface Log {
 id: number;
 run_id: number;
 workspace_id: number;
 action_id: number | null;
 level: "info" | "warn" | "error" | "debug";
 message: string;
 timestamp: string;
}

export interface NewLog {
 run_id: number;
 workspace_id: number;
 action_id?: number;
 level: "info" | "warn" | "error" | "debug";
 message: string;
}

export interface Setting {
 id: number;
 key: string;
 value: string;
 created_at: string;
 updated_at: string;
}

export interface NewSetting {
 key: string;
 value: string;
}

export interface Tool {
 id: number;
 name: string;
 description: string | null;
 icon: string | null;
 enabled: boolean;
 tool_type: "binary" | "cli";
 template: string;
 placeholders: string;
 category: string | null;
 created_at: string;
 updated_at: string;
}

export interface NewTool {
 name: string;
 description?: string;
 icon?: string;
 enabled: boolean;
 tool_type: "binary" | "cli";
 template: string;
 placeholders: string;
 category?: string;
}

export interface PlaceholderDefinition {
 name: string;
 description: string;
 required: boolean;
 type: "text" | "path" | "url" | "number";
 default?: string;
}

export interface SavedToolActionConfig extends ActionConfigBase {
 type: "tool";
 source: "saved";
 tool_id: number;
 tool_name: string;
 tool_type: "binary" | "cli";
 template: string;
 placeholder_values: Record<string, string>;
}

export interface CustomToolActionConfig extends ActionConfigBase {
 type: "tool";
 source: "custom";
 tool_name: string;
 tool_type: "binary" | "cli";
 command?: string;
 binary_path?: string;
 args?: string[];
 working_directory?: string | null;
 detached?: boolean;
}

export type ToolActionConfig = SavedToolActionConfig | CustomToolActionConfig;

export interface OSOverrides {
 windows?: Partial<ActionConfig>;
 macos?: Partial<ActionConfig>;
 linux?: Partial<ActionConfig>;
}

export const SETTING_KEYS = {
 ECLIPSE_BINARY_PATH: "eclipse_binary_path",
 DEFAULT_SHELL_WINDOWS: "default_shell_windows",
 DEFAULT_SHELL_MACOS: "default_shell_macos",
 DEFAULT_SHELL_LINUX: "default_shell_linux",
 LOG_RETENTION_DAYS: "log_retention_days",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];
