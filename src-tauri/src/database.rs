use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Workspace {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NewWorkspace {
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
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
    pub auto_launch: bool,
    pub os_overrides: Option<String>,
    pub order_index: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NewAction {
    pub workspace_id: i64,
    pub name: String,
    pub action_type: String,
    pub config: String,
    pub dependencies: Option<String>,
    pub timeout_seconds: Option<i32>,
    pub detached: bool,
    pub track_process: bool,
    pub auto_launch: bool,
    pub os_overrides: Option<String>,
    pub order_index: i32,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
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
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NewVariable {
    pub workspace_id: i64,
    pub key: String,
    pub value: String,
    pub is_secure: bool,
    pub enabled: bool,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Run {
    pub id: i64,
    pub workspace_id: i64,
    pub action_id: i64,
    pub status: String,
    pub started_at: String,
    pub completed_at: String,
    pub exit_code: Option<i32>,
    pub error_message: Option<String>,
    pub created_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NewRun {
    pub workspace_id: i64,
    pub action_id: i64,
    pub status: String,
    pub started_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Log {
    pub id: i64,
    pub run_id: i64,
    pub action_id: Option<i64>,
    pub level: String,
    pub message: String,
    pub timestamp: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NewLog {
    pub run_id: i64,
    pub action_id: Option<i64>,
    pub level: String,
    pub message: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Setting {
    pub id: i64,
    pub key: String,
    pub value: String,
    pub created_at: String,
    pub updated_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NewSetting {
    pub key: String,
    pub value: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
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
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
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

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Theme {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub is_predefined: bool,
    pub is_active: bool,
    pub light_colors: String,
    pub dark_colors: String,
    pub created_at: String,
    pub updated_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NewTheme {
    pub name: String,
    pub description: Option<String>,
    pub is_predefined: Option<bool>,
    pub light_colors: String,
    pub dark_colors: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GlobalVariable {
    pub id: i64,
    pub key: String,
    pub value: String,
    pub is_secure: bool,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NewGlobalVariable {
    pub key: String,
    pub value: String,
    pub is_secure: bool,
    pub enabled: bool,
}

include!(concat!(env!("OUT_DIR"), "/migrations.rs"));

use futures_core::future::BoxFuture;
use sqlx::error::BoxDynError;
use sqlx::migrate::{
    MigrateDatabase, Migration as SqlxMigration, MigrationSource, MigrationType, Migrator,
};
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::Sqlite;
use std::path::Path;
use tauri_plugin_sql::{Migration, MigrationKind};

#[derive(Debug)]
struct EmbeddedMigrations(Vec<Migration>);

impl MigrationSource<'static> for EmbeddedMigrations {
    fn resolve(self) -> BoxFuture<'static, std::result::Result<Vec<SqlxMigration>, BoxDynError>> {
        Box::pin(async move {
            let mut migrations = Vec::new();
            for migration in self.0 {
                if matches!(migration.kind, MigrationKind::Up) {
                    migrations.push(SqlxMigration::new(
                        migration.version,
                        migration.description.into(),
                        MigrationType::ReversibleUp,
                        migration.sql.into(),
                        false,
                    ));
                }
            }
            Ok(migrations)
        })
    }
}

pub async fn run_migrations(db_path: &Path) -> Result<(), String> {
    let conn_str = format!("sqlite://{}", db_path.to_string_lossy());

    if !Sqlite::database_exists(&conn_str).await.unwrap_or(false) {
        Sqlite::create_database(&conn_str)
            .await
            .map_err(|e| format!("Failed to create database: {}", e))?;
    }

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&conn_str)
        .await
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    let migrations = get_migrations();
    let migrator = Migrator::new(EmbeddedMigrations(migrations))
        .await
        .map_err(|e| format!("Failed to create migrator: {}", e))?;

    migrator
        .run(&pool)
        .await
        .map_err(|e| format!("{e}"))?;

    pool.close().await;
    Ok(())
}

pub async fn has_user_data(db_path: &Path) -> Result<bool, String> {
    if !db_path.exists() {
        return Ok(false);
    }

    let conn_str = format!("sqlite://{}", db_path.to_string_lossy());
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&conn_str)
        .await
        .map_err(|e| format!("{e}"))?;

    let count: Result<(i64,), _> = sqlx::query_as("SELECT COUNT(*) FROM workspaces")
        .fetch_one(&pool)
        .await;

    pool.close().await;

    match count {
        Ok((n,)) => Ok(n > 0),
        Err(_) => Ok(false),
    }
}

pub fn is_migration_checksum_error(err: &str) -> bool {
    err.contains("migration") && err.contains("has been modified")
}
