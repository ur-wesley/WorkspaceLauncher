-- Initial database schema for WorkspaceLauncher
-- This creates a flattened structure without environments

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create actions table (directly linked to workspaces)
CREATE TABLE IF NOT EXISTS actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    config TEXT NOT NULL DEFAULT '{}',
    dependencies TEXT, -- JSON array of action IDs
    timeout_seconds INTEGER,
    detached INTEGER NOT NULL DEFAULT 0 CHECK (detached IN (0, 1)),
    os_overrides TEXT, -- JSON object
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
);

-- Create variables table (workspace scoped)
CREATE TABLE IF NOT EXISTS variables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    is_secure INTEGER NOT NULL DEFAULT 0 CHECK (is_secure IN (0, 1)),
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    UNIQUE(workspace_id, key)
);

-- Create runs table (execution history)
CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    action_id INTEGER,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
    started_at DATETIME,
    completed_at DATETIME,
    exit_code INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY (action_id) REFERENCES actions (id) ON DELETE SET NULL
);

-- Create logs table (execution logs)
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    workspace_id INTEGER NOT NULL,
    action_id INTEGER,
    level TEXT NOT NULL DEFAULT 'info', -- debug, info, warn, error
    message TEXT NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs (id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY (action_id) REFERENCES actions (id) ON DELETE SET NULL
);

-- Create settings table (application settings)
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    value_type TEXT NOT NULL DEFAULT 'string', -- string, number, boolean, json
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value, value_type) VALUES
    ('default_shell', 'powershell', 'string'),
    ('theme', 'system', 'string'),
    ('auto_save', 'true', 'boolean');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_actions_workspace_id ON actions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_actions_order_index ON actions(workspace_id, order_index);
CREATE INDEX IF NOT EXISTS idx_variables_workspace_id ON variables(workspace_id);
CREATE INDEX IF NOT EXISTS idx_runs_workspace_id ON runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_runs_action_id ON runs(action_id);
CREATE INDEX IF NOT EXISTS idx_logs_run_id ON logs(run_id);
CREATE INDEX IF NOT EXISTS idx_logs_workspace_id ON logs(workspace_id);