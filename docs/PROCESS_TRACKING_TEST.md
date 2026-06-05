# Process tracking manual test checklist

1. Launch a tracked detached CLI (`npm run dev` or similar). Confirm the Running panel shows a PID that matches the real server process, not a short-lived PowerShell/cmd wrapper.
2. Kill the child process externally (Task Manager). Within ~3 seconds the action should disappear from Running Actions and a completed run should appear in history.
3. Restart the app with a stale `running-actions` entry in localStorage (dead PID). On startup the entry should be pruned and auto-launch should work again for that action.
4. Start an elevated process (Run as administrator). Stop should show an access-denied style message; use **Dismiss** to clear the list without falsely showing it as running.
5. In Settings → General, set **Extra PATH directories** and use **Test discovery** in Tools or action editor for `node`, a full path, and a bogus name.
6. Launch with **Track Process** disabled. No entry should appear in the Running panel.
