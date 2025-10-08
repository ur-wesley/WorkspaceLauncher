use serde::{Deserialize, Serialize};
use tauri_plugin_sql::{Migration, MigrationKind};

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewWorkspace {
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Action {
    pub id: i64,
    pub workspace_id: i64,
    pub name: String,
    pub action_type: String,
    pub config: String,
    pub dependencies: Option<String>,
    pub timeout_seconds: Option<i32>,
    pub detached: bool,
    pub track_process: bool,
    pub os_overrides: Option<String>,
    pub order_index: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewAction {
    pub workspace_id: i64,
    pub name: String,
    pub action_type: String,
    pub config: String,
    pub dependencies: Option<String>,
    pub timeout_seconds: Option<i32>,
    pub detached: bool,
    pub track_process: bool,
    pub os_overrides: Option<String>,
    pub order_index: i32,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Variable {
    pub id: i64,
    pub workspace_id: i64,
    pub key: String,
    pub value: String,
    pub is_secure: bool,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewVariable {
    pub workspace_id: i64,
    pub key: String,
    pub value: String,
    pub is_secure: bool,
    pub enabled: bool,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Run {
    pub id: i64,
    pub workspace_id: i64,
    pub status: String,
    pub started_at: Option<String>,
    pub ended_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewRun {
    pub workspace_id: i64,
    pub status: String,
    pub started_at: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Log {
    pub id: i64,
    pub run_id: i64,
    pub action_id: Option<i64>,
    pub level: String,
    pub message: String,
    pub timestamp: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewLog {
    pub run_id: i64,
    pub action_id: Option<i64>,
    pub level: String,
    pub message: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Setting {
    pub id: i64,
    pub key: String,
    pub value: String,
    pub created_at: String,
    pub updated_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewSetting {
    pub key: String,
    pub value: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub enabled: bool,
    pub tool_type: String,
    pub template: String,
    pub placeholders: String,
    pub category: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewTool {
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub enabled: bool,
    pub tool_type: String,
    pub template: String,
    pub placeholders: String,
    pub category: Option<String>,
}

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "Create initial tables",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "Add tools table for simplified action creation",
            sql: include_str!("../migrations/002_add_tools.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "Add runs table for tracking completed action executions",
            sql: include_str!("../migrations/003_add_runs.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "Add icon column to workspaces table",
            sql: include_str!("../migrations/004_add_workspace_icon.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "Add error_message column to runs table",
            sql: include_str!("../migrations/005_add_runs_error_message.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "Add track_process column to actions table",
            sql: include_str!("../migrations/006_add_track_process_to_actions.sql"),
            kind: MigrationKind::Up,
        },
    ]
}
