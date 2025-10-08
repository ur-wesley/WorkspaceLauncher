-- Create runs table for tracking completed action executions
CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    action_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('success', 'failed', 'cancelled')),
    started_at DATETIME NOT NULL,
    completed_at DATETIME,
    exit_code INTEGER,
    error_message TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_runs_workspace_id ON runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_runs_action_id ON runs(action_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at DESC);
