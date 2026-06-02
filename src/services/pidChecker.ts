import { invoke } from "@tauri-apps/api/core";
import { cleanupOldRuns, createRun } from "@/libs/api";
import type { NewRun } from "@/types/database";
import { runningActionsService } from "./runningActions";

const CHECK_INTERVAL = 5000;
const MAX_RESOLUTION_RETRIES = 3;

const WRAPPER_EXCLUDE = [
	"powershell",
	"cmd",
	"conhost",
	"bash",
	"sh",
	"npm",
	"npx",
	"yarn",
	"pnpm",
];

let intervalId: number | null = null;

async function isProcessRunning(pid: number): Promise<boolean> {
	try {
		return await invoke<boolean>("is_process_running", { pid });
	} catch (error) {
		console.error(`Failed to check if process ${pid} is running:`, error);
		return false;
	}
}

async function findServerProcess(
	workingDirectory: string,
	startedAfterSecs: number,
): Promise<number | null> {
	try {
		const pid = await invoke<number | null>("find_server_process", {
			req: {
				working_directory: workingDirectory,
				started_after_secs: startedAfterSecs,
				exclude_names: WRAPPER_EXCLUDE,
			},
		});
		return pid ?? null;
	} catch (error) {
		console.error("Failed to find server process:", error);
		return null;
	}
}

async function createCompletedRun(
	workspaceId: number,
	actionId: number,
	startedAt: string,
	exitCode: number | null,
	errorMessage: string | null,
): Promise<void> {
	let status: "success" | "failed" | "cancelled" = "success";
	if (exitCode !== null) {
		status = exitCode === 0 ? "success" : "failed";
	} else if (errorMessage) {
		status = "failed";
	}

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

async function checkRunningActions(): Promise<void> {
	const runningActions = runningActionsService.getAll();

	for (const action of runningActions) {
		const isRunning = await isProcessRunning(action.process_id);

		if (!isRunning) {
			const retries = action.resolution_retries ?? 0;

			if (
				action.working_directory &&
				action.launched_at_secs &&
				retries < MAX_RESOLUTION_RETRIES
			) {
				const newPid = await findServerProcess(
					action.working_directory,
					action.launched_at_secs,
				);

				if (newPid) {
					runningActionsService.update(action.id, {
						process_id: newPid,
						resolution_retries: 0,
					});
					console.log(`Re-resolved PID for "${action.action_name}": ${newPid}`);
					continue;
				}

				runningActionsService.update(action.id, {
					resolution_retries: retries + 1,
				});

				if (retries + 1 < MAX_RESOLUTION_RETRIES) {
					continue;
				}
			}

			await createCompletedRun(
				action.workspace_id,
				action.action_id,
				action.started_at,
				null,
				null,
			);
			runningActionsService.remove(action.id);
		}
	}
}

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

export function stopPidChecker(): void {
	if (intervalId !== null) {
		window.clearInterval(intervalId);
		intervalId = null;
		console.log("PID checker stopped");
	}
}

export function isPidCheckerRunning(): boolean {
	return intervalId !== null;
}
