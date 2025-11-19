# Action Launching

Launches actions (commands, tools, binaries) with configurable execution modes.

## Options

- **detached**: Runs in the background without a terminal window (Tokio hidden spawn).
- **track process**: Monitors the process PID until exit; records completion.
- **auto run**: Auto-launch on workspace start.
- **timeout**: Maximum runtime; kills the process if exceeded.

## Behavior

- **Detached = false**: Spawns with stdout/stderr streaming; real-time logs; completion via PID.
- **Detached = true**: Background spawn with no window; resolves descendant PID (excludes wrappers like powershell/cmd/npm/bun) and tracks it; completion via PID.

## PID Tracking

Resolves the actual child PID using sysinfo (leaf-most/newest descendant) and updates action-started with the resolved PID for monitoring.

## History

- Non-detached: Logs streamed; history entry on completion.
- Detached + tracking: History entry when the monitored PID exits.
