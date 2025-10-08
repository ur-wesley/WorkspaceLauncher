# Workspace Launcher - AI Coding Instructions

## Project Overview

This is a cross-platform Tauri desktop app for launching dev environments with one click. Built with SolidJS frontend + Rust backend, using SQLite for data persistence. The app manages workspaces, environments, and actions (VS Code, terminals, URLs) with process orchestration and live logging.

## Architecture & Key Patterns

### Tauri Hybrid Structure

- **Frontend**: SolidJS + TypeScript in `/src` (Vite dev server on port 1420)
- **Backend**: Rust in `/src-tauri` (Tauri commands + SQLite via tauri-plugin-sql)
- **Build**: `bun run build` → `tauri build` (configured in `tauri.conf.json`)
- **IPC**: Tauri commands for DB operations, process management, and file system access

### Styling Architecture

- **UnoCSS** with WindiCSS v4 preset (`unocss.config.ts`)
- **shadcn-solid** components in `/src/components/ui/`
- **CSS Variables**: HSL color system with dark/light themes via `[data-kb-theme]` selectors
- **Utility Pattern**: Use `cn()` helper from `/src/libs/cn.ts` for conditional classes
- **No Borders**: Prefer contrasts over borders per spec requirements

### State Management

- **Entity Stores**: Each entity (Workspace, Environment, Action, Variable, Run) has its own store
- **Store Pattern**: Use `createStore()` with actions → export as `useStore()` hook pattern
- **Context Providers**: Wrap stores in context providers for dependency injection
- **Event Bus**: `@solid-primitives/event-bus` for cross-component communication
- **Local State**: Prefer signals and derived values over external state libs

### Data Layer Design

The app follows a hierarchical data model:

```
Workspace → Environment → Action
         ↓             ↓
      Variables    Variables (inherited + overridden)
```

Key entities:

- **Actions**: Configurable action types with extensible behavior (VS Code, Eclipse, commands, URLs, delays, etc.)
- **Variables**: Workspace/Environment scoped with templating (`${VAR_NAME}`)
- **Runs**: Execution history with status tracking and logs

### Error Handling

- **neverthrow**: Use `Result<T, E>` pattern for error handling instead of throwing exceptions
- **Toast Notifications**: Display error messages via toast system from shadcn-solid
- **Validation**: Validate inputs at boundaries (UI forms, Tauri commands)
- **Graceful Degradation**: Handle missing tools/paths with helpful error messages

## Critical Development Workflows

### Development Commands

```bash
bun run tauri        # Start Vite dev server + Tauri dev
bun run build        # Production build
bun run lint         # Biome linting (strict: no any, unused imports)
bun run format       # Biome formatting (tabs, semicolons, trailing commas)
bun run add          # Add shadcn-solid components
```

### Database Operations

- Use `tauri-plugin-sql` for SQLite integration
- **Schema & Migrations**: Create database schema and implement auto-migration system in Rust
- **Entity Tables**: Separate tables for workspaces, environments, actions, variables, runs, logs
- All CRUD operations via Tauri commands (never direct DB access from frontend)

### Component Development

- Import UI components from `@/components/ui/*` (shadcn-solid)
- Use Kobalte primitives as base (`@kobalte/core`)
- Follow CVA pattern for component variants (see `button.tsx`)
- Keyboard navigation with `@solid-primitives/keyboard`

## Project-Specific Conventions

### File Organization

```
/src/components/ui/     # shadcn-solid components (reusable)
/src/pages/            # Route components
/src/store/            # Context stores and providers
/src/libs/             # Utilities (cn.ts for styling)
/src-tauri/src/        # Rust backend (lib.rs, commands)
```

### Routing Structure (SolidJS Router)

- `/` - Workspaces list
- `/w/:workspaceId` - Workspace detail with environments
- `/w/:workspaceId/env/:envId` - Environment detail (variables, actions, logs)

### TypeScript Patterns

- **Strict Types**: No `any` types (Biome enforces this)
- **Import Types**: Use `import type` for type-only imports
- **Component Types**: Use `Component<Props>` from solid-js
- **Tauri Types**: Import from `@tauri-apps/api` for commands

### Process Management

- **Detached vs Tracked**: Actions can run detached (fire-and-forget) or tracked (PID monitoring)
- **Dependency Resolution**: Actions wait for dependencies before starting
- **OS-Specific Overrides**: Commands can have Windows/macOS/Linux variants
- **Graceful Shutdown**: SIGTERM → SIGKILL escalation with timeouts

## Integration Points

### Tauri Plugins Used

- `tauri-plugin-sql`: SQLite database operations
- `tauri-plugin-opener`: Open URLs and files
- `tauri-plugin-shell`: Execute system commands and launch configured tools

### External Tool Integration

- **Launch Targets**: Configure tool paths in settings (Eclipse binary path, VS Code `code` command)
- **VS Code**: Launch via CLI command `code <workspace-path>`
- **Eclipse**: Launch via configured binary path using `tauri-plugin-shell`
- **System Tools**: Use CLI commands (`explorer` on Windows, `open` on macOS, etc.)
- **System Shell**: Configurable per OS (PowerShell/bash/zsh)

### Security Considerations

- **Variable Encryption**: Secure variables stored encrypted (future: OS keychain)
- **Command Validation**: Sanitize user input for shell commands
- **Process Isolation**: Each action runs in separate process context

## Key Files to Reference

- `spec.md` - Complete feature specification and requirements
- `components.json` - shadcn-solid configuration (UnoCSS + aliases)
- `unocss.config.ts` - Styling system with HSL color variables
- `src/components/ui/button.tsx` - Example of CVA component pattern
- `src-tauri/tauri.conf.json` - App configuration and build settings
- `biome.json` - Strict linting/formatting rules (tabs, no unused imports)

## Common Gotchas

- Always use `bun` (not npm/yarn) - project uses Bun as package manager
- UnoCSS classes use parentheses for pseudo-selectors: `hover:(bg-accent text-accent-foreground)`
- Tauri dev server must run on port 1420 (hardcoded in config)
- Use `@/` path alias for src imports (configured in tsconfig)
- Dark mode toggling via `data-kb-theme` attribute (not CSS media queries)
