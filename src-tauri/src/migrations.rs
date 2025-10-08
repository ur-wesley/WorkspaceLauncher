pub const RUNS_TABLE_MIGRATION: &str = r#"
CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    action_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('success', 'failed', 'cancelled')),
    started_at TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    exit_code INTEGER,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_runs_workspace_id ON runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_runs_action_id ON runs(action_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at);
"#;

pub async fn run_migrations(db: &tauri_plugin_sql::Database) -> Result<(), String> {
    // Run the runs table migration
    db.execute(RUNS_TABLE_MIGRATION)
        .await
        .map_err(|e| format!("Failed to create runs table: {}", e))?;

    Ok(())
}
