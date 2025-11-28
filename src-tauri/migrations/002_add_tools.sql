-- Add tools table for simplified action creation
CREATE TABLE IF NOT EXISTS tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    tool_type TEXT NOT NULL CHECK(tool_type IN ('command', 'script', 'http')),
    template TEXT NOT NULL,
    placeholders TEXT NOT NULL DEFAULT '[]',
    category TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tools_enabled ON tools(enabled);
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);

INSERT INTO tools (name, description, icon, enabled, tool_type, template, placeholders, category) VALUES
('PowerShell Script', 'Run a PowerShell script', '🔷', 1, 'command', 'powershell -ExecutionPolicy Bypass -File "{{script_path}}"', '[{"key":"script_path","label":"Script Path","type":"text"}]', 'Scripts'),
('Command', 'Execute a shell command', '⚡', 1, 'command', '{{command}}', '[{"key":"command","label":"Command","type":"text"}]', 'System'),
('Node Script', 'Run a Node.js script', '🟢', 1, 'command', 'node "{{script_path}}"', '[{"key":"script_path","label":"Script Path","type":"text"}]', 'Scripts'),
('Python Script', 'Run a Python script', '🐍', 1, 'command', 'python "{{script_path}}"', '[{"key":"script_path","label":"Script Path","type":"text"}]', 'Scripts'),
('Bash Script', 'Run a Bash script (WSL/Linux)', '🐚', 1, 'command', 'bash "{{script_path}}"', '[{"key":"script_path","label":"Script Path","type":"text"}]', 'Scripts'),
('HTTP Request', 'Make an HTTP request', '🌐', 1, 'http', '{{url}}', '[{"key":"url","label":"URL","type":"text"},{"key":"method","label":"Method","type":"select","options":["GET","POST","PUT","DELETE"]},{"key":"headers","label":"Headers (JSON)","type":"text"},{"key":"body","label":"Body","type":"text"}]', 'Network'),
('Docker Command', 'Run a Docker command', '🐳', 1, 'command', 'docker {{command}}', '[{"key":"command","label":"Docker Command","type":"text"}]', 'Containers'),
('Docker Compose', 'Run docker-compose', '🐳', 1, 'command', 'docker-compose -f "{{compose_file}}" {{command}}', '[{"key":"compose_file","label":"Compose File Path","type":"text"},{"key":"command","label":"Command (up/down/restart)","type":"text"}]', 'Containers'),
('NPM Script', 'Run an npm script', '📦', 1, 'command', 'npm run {{script}}', '[{"key":"script","label":"Script Name","type":"text"}]', 'Package Managers'),
('Yarn Script', 'Run a yarn script', '📦', 1, 'command', 'yarn {{script}}', '[{"key":"script","label":"Script Name","type":"text"}]', 'Package Managers'),
('Git Command', 'Run a git command', '🔱', 1, 'command', 'git {{command}}', '[{"key":"command","label":"Git Command","type":"text"}]', 'Version Control'),
('VS Code', 'Open VS Code', '💻', 1, 'command', 'code "{{path}}"', '[{"key":"path","label":"Path","type":"text"}]', 'Editors'),
('Open URL', 'Open a URL in browser', '🌐', 1, 'command', 'start {{url}}', '[{"key":"url","label":"URL","type":"text"}]', 'Browser'),
('SSH Command', 'Execute SSH command', '🔐', 1, 'command', 'ssh {{user}}@{{host}} "{{command}}"', '[{"key":"user","label":"User","type":"text"},{"key":"host","label":"Host","type":"text"},{"key":"command","label":"Command","type":"text"}]', 'Network');