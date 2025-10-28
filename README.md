# Workspace Launcher

A desktop app to organize workspaces and launch tools, commands, and URLs with one click. It tracks running processes and stores your configurations for repeatable setups.

## Features

- **Workspace Management**: Organize your dev environments with workspaces
- **Action System**: Define and execute multiple actions per workspace
- **Tool Templates**: Create reusable tool configurations with placeholders
- **Variable Support**: Workspace and environment-scoped variables with templating
- **Process Tracking**: Monitor running processes and view execution history
- **Import/Export**: Share workspace configurations via JSON files or clipboard
- **Auto-start**: Optional launch on system startup

## Prerequisites

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [Rust](https://www.rust-lang.org/) - For Tauri backend

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run tauri dev

# Build for production
bun run tauri build
```

## Usage

1. **Create a Workspace**: Add a new workspace with a name and description
2. **Define Actions**: Add actions like opening VS Code, launching terminals, or opening URLs
3. **Set Variables**: Configure workspace-specific variables for dynamic paths
4. **Launch**: Click the play button to execute all actions in sequence
5. **Track Progress**: Monitor running processes in the side panel

## Tech Stack

- **Frontend**: SolidJS + TypeScript
- **Styling**: UnoCSS + shadcn-solid components
- **Backend**: Tauri
- **Database**: SQLite
