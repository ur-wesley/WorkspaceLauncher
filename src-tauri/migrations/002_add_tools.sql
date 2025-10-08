-- Add tools table for simplified action creation
-- Tools define templates that can be used to create actions

CREATE TABLE IF NOT EXISTS tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Icon class/name (e.g., 'i-mdi-code', 'i-mdi-web')
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    tool_type TEXT NOT NULL, -- 'binary' or 'cli'
    template TEXT NOT NULL, -- Template with placeholders (e.g., 'code {workspace_path}')
    placeholders TEXT, -- JSON array of placeholder definitions
    category TEXT, -- 'development', 'browser', 'utility', etc.
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default tools
INSERT INTO tools (name, description, icon, tool_type, template, placeholders, category) VALUES
('VS Code', 'Microsoft Visual Studio Code', 'i-mdi-microsoft-visual-studio-code', 'cli', 'code {workspace_path}', '[{"name": "workspace_path", "description": "Path to workspace/folder", "required": true, "type": "path"}]', 'development'),
('Chrome', 'Google Chrome Browser', 'i-mdi-google-chrome', 'cli', 'chrome {url}', '[{"name": "url", "description": "URL to open", "required": true, "type": "url"}]', 'browser'),
('Firefox', 'Mozilla Firefox Browser', 'i-mdi-firefox', 'cli', 'firefox {url}', '[{"name": "url", "description": "URL to open", "required": true, "type": "url"}]', 'browser'),
('Explorer', 'Windows File Explorer', 'i-mdi-folder-open', 'cli', 'explorer {path}', '[{"name": "path", "description": "Path to open", "required": true, "type": "path"}]', 'utility'),
('Terminal', 'Command Line Terminal', 'i-mdi-terminal', 'cli', 'cmd /c start cmd /k "cd /d {path}"', '[{"name": "path", "description": "Working directory", "required": false, "type": "path", "default": "."}]', 'utility'),
('PowerShell', 'PowerShell Terminal', 'i-mdi-powershell', 'cli', 'powershell -NoExit -Command "Set-Location ''{path}''"', '[{"name": "path", "description": "Working directory", "required": false, "type": "path", "default": "."}]', 'utility'),
('Custom Binary', 'Custom executable', 'i-mdi-application', 'binary', '{binary_path} {args}', '[{"name": "binary_path", "description": "Path to executable", "required": true, "type": "path"}, {"name": "args", "description": "Command line arguments", "required": false, "type": "text"}]', 'custom'),
('Eclipse', 'Eclipse IDE', 'i-mdi-eclipse', 'binary', '{eclipse_path} -data {workspace_path}', '[{"name": "eclipse_path", "description": "Path to Eclipse executable", "required": true, "type": "path"}, {"name": "workspace_path", "description": "Eclipse workspace directory", "required": true, "type": "path"}]', 'development'),
('Cursor', 'Cursor AI Editor', 'i-mdi-cursor-default-click', 'cli', 'cursor {project_path}', '[{"name": "project_path", "description": "Path to project folder", "required": true, "type": "path"}]', 'development'),
('Command with Args', 'Run command with arguments', 'i-mdi-console-line', 'cli', '{command} {args}', '[{"name": "command", "description": "Command to execute", "required": true, "type": "text"}, {"name": "args", "description": "Command arguments", "required": false, "type": "text"}]', 'utility'),
('URL Opener', 'Open URL in default browser', 'i-mdi-web', 'cli', 'start {url}', '[{"name": "url", "description": "URL to open", "required": true, "type": "url"}]', 'browser');

-- Create index for enabled tools
CREATE INDEX IF NOT EXISTS idx_tools_enabled ON tools(enabled);
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);