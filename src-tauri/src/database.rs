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
use std::collections::HashMap;
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

pub async fn repair_migration_checksums(db_path: &Path) -> Result<(), String> {
    let conn_str = format!("sqlite://{}", db_path.to_string_lossy());
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&conn_str)
        .await
        .map_err(|e| format!("Failed to connect for checksum repair: {e}"))?;

    let applied: Vec<(i64, Vec<u8>)> = sqlx::query_as(
        "SELECT version, checksum FROM _sqlx_migrations WHERE success = 1 ORDER BY version",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to read applied migrations: {e}"))?;

    let applied_map: HashMap<i64, Vec<u8>> = applied.into_iter().collect();

    let migrations = get_migrations();
    let migrator = Migrator::new(EmbeddedMigrations(migrations))
        .await
        .map_err(|e| format!("Failed to create migrator for checksum repair: {e}"))?;

    for migration in migrator.iter() {
        let Some(stored_checksum) = applied_map.get(&migration.version) else {
            continue;
        };

        if migration.checksum.as_ref() == stored_checksum.as_slice() {
            continue;
        }

        println!(
            "Updating stored checksum for migration {} ({})",
            migration.version, migration.description
        );

        sqlx::query(
            "UPDATE _sqlx_migrations SET checksum = ?, description = ? WHERE version = ?",
        )
        .bind(migration.checksum.as_ref() as &[u8])
        .bind(migration.description.as_ref())
        .bind(migration.version)
        .execute(&pool)
        .await
        .map_err(|e| {
            format!(
                "Failed to update checksum for migration {}: {e}",
                migration.version
            )
        })?;
    }

    pool.close().await;
    Ok(())
}

pub fn is_migration_checksum_error(err: &str) -> bool {
    err.contains("migration") && err.contains("has been modified")
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn connect(db_path: &Path) -> sqlx::SqlitePool {
        let conn_str = format!("sqlite://{}", db_path.to_string_lossy());
        SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&conn_str)
            .await
            .expect("connect")
    }

    #[test]
    fn detects_migration_checksum_error() {
        assert!(is_migration_checksum_error(
            "migration 1 was previously applied but has been modified"
        ));
        assert!(!is_migration_checksum_error("table workspaces already exists"));
    }

    #[tokio::test]
    async fn fresh_install_applies_migrations_idempotently() {
        let dir = tempfile::tempdir().expect("tempdir");
        let db_path = dir.path().join("test.db");

        run_migrations(&db_path).await.expect("first run");
        run_migrations(&db_path).await.expect("second run");
    }

    #[tokio::test]
    async fn checksum_repair_preserves_user_data() {
        let dir = tempfile::tempdir().expect("tempdir");
        let db_path = dir.path().join("test.db");

        run_migrations(&db_path).await.expect("migrate");

        let pool = connect(&db_path).await;
        sqlx::query("INSERT INTO workspaces (name, description) VALUES ('test-ws', 'desc')")
            .execute(&pool)
            .await
            .expect("insert workspace");
        pool.close().await;

        let pool = connect(&db_path).await;
        sqlx::query("UPDATE _sqlx_migrations SET checksum = X'00' WHERE version = 1")
            .execute(&pool)
            .await
            .expect("corrupt checksum");
        pool.close().await;

        let err = run_migrations(&db_path).await.unwrap_err();
        assert!(is_migration_checksum_error(&err));

        repair_migration_checksums(&db_path)
            .await
            .expect("repair checksums");
        run_migrations(&db_path).await.expect("migrate after repair");

        let pool = connect(&db_path).await;
        let (count,): (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM workspaces WHERE name = 'test-ws'",
        )
        .fetch_one(&pool)
        .await
        .expect("count workspaces");
        pool.close().await;

        assert_eq!(count, 1);
    }
}
