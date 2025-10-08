One-Click Dev Environment Launcher (Tauri) — Spec Sheet

Overview
A cross-platform desktop app to launch full dev environments (multiple VS Code windows, Eclipse, terminals/commands, URLs) with one click. Configurable via UI, persisted in SQLite. Built on your app-template, using Tauri + SQLite.

Features

- Workspaces
  - Create/edit/delete with description and sort
  - Import/export as JSON
  - Duplicate workspace
- Environments
  - Multiple per workspace; clone/duplicate
  - Start/Stop all actions in an environment
  - Run history (status, timings)
- Actions
  - Types: open_vscode, open_eclipse, run_command, open_url, delay
  - Ordered list, dependencies, per-action timeout
  - Detached (don’t track) vs tracked (PID/logs)
  - OS-specific overrides (Windows/macOS/Linux)
- Variables & Templating
  - Workspace- and Environment-level variables
  - Secure secrets stored encrypted
  - Templating in command/args/cwd/env via ${VAR_NAME}
  - Resolution order: Action > Environment > Workspace > Process env
- Process & Logs
  - Live stdout/stderr streaming in UI
  - Stop signals (graceful -> kill escalation)
  - Per-action status: pending/running/success/failed/detached
- Configuration
  - Tool paths (VS Code, Eclipse), default shell per OS
  - Profile selector (auto-detected OS with override)
  - Log retention settings
- System Tray
  - Quick-start recent environments
- Storage
  - SQLite for all entities (workspaces, environments, actions, variables, runs, logs)

Tasks

Backend (Tauri/Rust)

- Data Layer
  - Integrate tauri-plugin-sql (SQLite)
  - Implement migrations (embedded SQL)
  - CRUD commands: workspaces, environments, actions, variables
  - JSON import/export for workspace bundles
- Process Orchestration
  - Spawn processes with Tauri Command API
  - Track PIDs, stream stdout/stderr over IPC
  - Implement stop signals per OS; timeout + kill escalation
  - Dependency resolution and parallelization (start when deps succeed or action is detached)
- Security
  - Secrets encryption using OS keychain plugin (e.g., tauri-plugin-stronghold or keyring)
  - Command validation/sanitization
- Telemetry/Settings
  - App settings CRUD (shells, paths, profiles, retention)
  - Optional, disabled-by-default telemetry hook (no-op initially)

Frontend

use styling based on shadcn-solid and unocss. use colors from unocss config. use contrasts instead of borders where possible.

- Project Setup
  - Use provided Vite + SolidJS + TS structure
  - State management: use contextstores
  - Styling: use unocss config for styling
  - use components from /src/ui/\*. use components from shadcn-solid!
  - IPC utilities: use template’s Tauri bridge helpers
- Routing (solid Router per template)
  - “/”: Workspaces list (create, edit, delete, import/export, duplicate)
  - “/w/:workspaceId”: Workspace detail with Environments tabs/list
  - “/w/:workspaceId/env/:envId”: Environment detail
- Environment Detail UI
  - Variables editor: table with key/value, secure toggle, scope (env/workspace)
  - Actions builder: sortable list, type preset modal, dependency selector, timeout, detached, OS overrides
  - Run panel: Start/Stop buttons, live logs per action, status chips, filters, run summary
- Global UI
  - Profile selector dropdown (auto OS + override)
  - Settings modal: tool paths, shells, retention
  - System tray integration: quick launch menu
- Import/Export
  - File dialog via Tauri; validate JSON schema; map fields
- Error/Edge Handling
  - Missing tool detection with hints (e.g., code/eclipse not found)
  - Confirmations for destructive actions
  - Toasts/snackbars for run status changes and failures

Layout

- Collapsible Sidebar with icons for navigation (Workspaces, Settings)
- Main Content Area with header (breadcrumb, actions) and body (lists, forms)
- Modals/Alert-Dialog for creating/editing entities and confirmations
- menubar for fast action access
- @solid-primitives/keyboard for shortcuts
- @solid-primitives/event-bus for event bus

DX

- Full TypeScript with strict types (no any types!)
- good file splitting and modularization
- reusable helpers/hooks
- comprehensive error handling
- event driven architecture

---

there are workspaces. each workspace could have actions. an action is a tool call, like a cli, binary, url, etc. each workspace could have environment variables like paths, which can be used inside actions. workspaces can be started/stopped. starting a workspace means executing all actions inside the workspace. stopping a workspace means stopping all running actions inside the workspace. you can define custom actions just for the workspace, or select preconfigured actions from the tools setup in the settings, like preconfigured vscode etc...

---

i want to start a workspace like that:

- open eclipse binary ("C:\Users\parac\Desktop\eclipse-pc\eclipse.exe")
- open binary ("C:\Users\parac\Desktop\Kyocera\Debug-SQLITE\HEDAS-API.exe")
- open cursor (cursor C:\Arbeit\LogReceiver\LogCollector and run it with "cd C:\Arbeit\LogReceiver\LogCollector ; bun run dev")
- open 2x vscode instance (code C:\eclipse-ws\PrintHere; code C:\eclipse-ws\HoerAuthenticator)
- therefore, the paths for printhere and hoerauthenticator are defined as environment variables in the workspace, like PRINT_HERE_PATH=C:\eclipse-ws\PrintHere and run like that: code ${PRINT_HERE_PATH}

---

tool usage:

- set tool name
- select binary or cli option
- when binary, select path to binary (optional with file dialog)
  - optionally, select arguments (optional with text input)
- when cli, select enter cli command (with text input, add test button)
  - optionally set arguments
