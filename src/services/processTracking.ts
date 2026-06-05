import { invoke } from "@tauri-apps/api/core";
import { cleanupOldRuns, createRun } from "@/libs/api";
import type { NewRun, RunningAction } from "@/types/database";
import { runningActionsService } from "./runningActions";

const MAX_RESOLUTION_RETRIES = 2;

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

export interface StopRunningActionResult {
	ok: boolean;
	pruned: boolean;
	denied: boolean;
	message: string;
}

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
	status: "success" | "failed" | "cancelled" = "success",
): Promise<void> {
	let runStatus: "success" | "failed" | "cancelled" = status;
	if (exitCode !== null && status === "success") {
		runStatus = exitCode === 0 ? "success" : "failed";
	} else if (errorMessage && status === "success") {
		runStatus = "failed";
	}

	const newRun: NewRun = {
		workspace_id: workspaceId,
		action_id: actionId,
		status: runStatus,
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

export async function pruneRunningAction(
	id: string,
	options?: {
		recordRun?: boolean;
		runStatus?: "success" | "failed" | "cancelled";
		errorMessage?: string | null;
	},
): Promise<void> {
	const action = runningActionsService.getById(id);
	if (!action) return;

	if (options?.recordRun !== false) {
		await createCompletedRun(
			action.workspace_id,
			action.action_id,
			action.started_at,
			null,
			options?.errorMessage ?? null,
			options?.runStatus ?? "success",
		);
	}

	runningActionsService.remove(id);
}

export function isActionAlive(action: RunningAction): Promise<boolean> {
	return isProcessRunning(action.process_id);
}

export async function reconcileRunningActions(): Promise<void> {
	const runningActions = runningActionsService.getAll();
	const now = new Date().toISOString();

	for (const action of runningActions) {
		const alive = await isProcessRunning(action.process_id);

		if (alive) {
			runningActionsService.update(action.id, {
				status: "running",
				last_verified_at: now,
				stop_error: undefined,
			});
			continue;
		}

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
					status: "running",
					last_verified_at: now,
				});
				console.log(`Re-resolved PID for "${action.action_name}": ${newPid}`);
				continue;
			}

			runningActionsService.update(action.id, {
				resolution_retries: retries + 1,
				status: "exited",
				last_verified_at: now,
			});
			continue;
		}

		await pruneRunningAction(action.id, { runStatus: "success" });
	}
}

export async function stopRunningAction(
	action: RunningAction,
): Promise<StopRunningActionResult> {
	try {
		const result = await invoke<{
			success: boolean;
			message: string;
			denied?: boolean;
		}>("kill_process", { pid: action.process_id });

		if (result.success) {
			await pruneRunningAction(action.id, { runStatus: "cancelled" });
			return {
				ok: true,
				pruned: true,
				denied: false,
				message: result.message,
			};
		}

		const stillAlive = await isProcessRunning(action.process_id);
		if (!stillAlive) {
			await pruneRunningAction(action.id, { runStatus: "cancelled" });
			return {
				ok: true,
				pruned: true,
				denied: false,
				message: "Process already exited; removed from list",
			};
		}

		if (result.denied) {
			runningActionsService.update(action.id, {
				status: "unreachable",
				stop_error: result.message,
				last_verified_at: new Date().toISOString(),
			});
			return {
				ok: false,
				pruned: false,
				denied: true,
				message: result.message,
			};
		}

		return {
			ok: false,
			pruned: false,
			denied: false,
			message: result.message,
		};
	} catch (error) {
		const message = String(error);
		const stillAlive = await isProcessRunning(action.process_id);
		if (!stillAlive) {
			await pruneRunningAction(action.id, { runStatus: "cancelled" });
			return {
				ok: true,
				pruned: true,
				denied: false,
				message: "Process already exited; removed from list",
			};
		}

		const denied =
			message.toLowerCase().includes("access is denied") ||
			message.toLowerCase().includes("zugriff verweigert") ||
			message.toLowerCase().includes("administrator");

		if (denied) {
			runningActionsService.update(action.id, {
				status: "unreachable",
				stop_error: message,
				last_verified_at: new Date().toISOString(),
			});
		}

		return {
			ok: false,
			pruned: false,
			denied,
			message,
		};
	}
}

export async function dismissRunningAction(id: string): Promise<void> {
	await pruneRunningAction(id, {
		recordRun: true,
		runStatus: "cancelled",
		errorMessage: "Removed from tracking (process may still be running)",
	});
}

export async function isActionTrackedAndAlive(
	workspaceId: number,
	actionId: number,
): Promise<boolean> {
	const entry = runningActionsService
		.getByWorkspace(workspaceId)
		.find((a) => a.action_id === actionId);
	if (!entry) return false;
	return isProcessRunning(entry.process_id);
}
