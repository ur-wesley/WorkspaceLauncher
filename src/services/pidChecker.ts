import { invoke } from "@tauri-apps/api/core";
import { cleanupOldRuns, createRun } from "@/libs/api";
import type { NewRun } from "@/types/database";
import { runningActionsService } from "./runningActions";

const CHECK_INTERVAL = 5000;
let intervalId: number | null = null;

/**
 * Check if a process is still running
 */
async function isProcessRunning(pid: number): Promise<boolean> {
	try {
		return await invoke<boolean>("is_process_running", { pid });
	} catch (error) {
		console.error(`Failed to check if process ${pid} is running:`, error);
		return false;
	}
}

/**
 * Create a completed run record in the database and cleanup old runs
 */
async function createCompletedRun(
	workspaceId: number,
	actionId: number,
	startedAt: string,
	exitCode: number | null,
	errorMessage: string | null,
): Promise<void> {
	const status = exitCode === 0 ? "success" : "failed";
	const newRun: NewRun = {
		workspace_id: workspaceId,
		action_id: actionId,
		status,
		started_at: startedAt,
		completed_at: new Date().toISOString(),
		exit_code: exitCode ?? undefined,
		error_message: errorMessage ?? undefined,
	};

	try {
		const result = await createRun(newRun);
		if (result.isOk()) {
			await cleanupOldRuns(actionId, 20);
		}
	} catch (error) {
		console.error("Failed to create completed run record:", error);
	}
}

/**
 * Check all running actions and update their status
 */
async function checkRunningActions(): Promise<void> {
	const runningActions = runningActionsService.getAll();

	for (const action of runningActions) {
		const isRunning = await isProcessRunning(action.process_id);

		if (!isRunning) {
			await createCompletedRun(action.workspace_id, action.action_id, action.started_at, null, null);

			runningActionsService.remove(action.id);
		}
	}
}

/**
 * Start the periodic PID checker
 */
export function startPidChecker(): void {
	if (intervalId !== null) {
		console.warn("PID checker is already running");
		return;
	}

	checkRunningActions().catch(console.error);

	intervalId = window.setInterval(() => {
		checkRunningActions().catch(console.error);
	}, CHECK_INTERVAL);

	console.log("PID checker started");
}

/**
 * Stop the periodic PID checker
 */
export function stopPidChecker(): void {
	if (intervalId !== null) {
		window.clearInterval(intervalId);
		intervalId = null;
		console.log("PID checker stopped");
	}
}

/**
 * Check if the PID checker is running
 */
export function isPidCheckerRunning(): boolean {
	return intervalId !== null;
}
