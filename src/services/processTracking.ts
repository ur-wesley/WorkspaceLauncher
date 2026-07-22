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

const APP_BOOT_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function getAppBootId(): string {
	return APP_BOOT_ID;
}

export function isActivelyRunning(action: RunningAction): boolean {
	return (action.status ?? "running") === "running";
}

export interface StopRunningActionResult {
	ok: boolean;
	pruned: boolean;
	denied: boolean;
	message: string;
}

export interface ReconcileOptions {
	cold?: boolean;
}

interface ProcessIdentity {
	pid: number;
	start_time_secs: number;
	name: string;
}

async function registerTrackedPid(pid: number): Promise<void> {
	try {
		await invoke("register_tracked_pid_command", { pid });
	} catch (error) {
		console.error(`Failed to register tracked PID ${pid}:`, error);
	}
}

async function verifyTrackedProcess(action: RunningAction): Promise<boolean> {
	try {
		return await invoke<boolean>("verify_tracked_process", {
			req: {
				pid: action.process_id,
				expected_start_time_secs: action.process_start_time_secs ?? null,
				expected_name: action.expected_process_name ?? null,
			},
		});
	} catch (error) {
		console.error(
			`Failed to verify tracked process ${action.process_id}:`,
			error,
		);
		return false;
	}
}

async function getProcessIdentity(
	pid: number,
): Promise<ProcessIdentity | null> {
	try {
		return await invoke<ProcessIdentity | null>("get_process_identity", {
			pid,
		});
	} catch (error) {
		console.error(`Failed to get process identity for ${pid}:`, error);
		return null;
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
	return verifyTrackedProcess(action);
}

function isSameSession(action: RunningAction): boolean {
	return action.app_boot_id === APP_BOOT_ID;
}

async function adoptProcessIdentity(
	actionId: string,
	pid: number,
	now: string,
): Promise<boolean> {
	const identity = await getProcessIdentity(pid);
	if (!identity) return false;

	runningActionsService.update(actionId, {
		process_id: pid,
		process_start_time_secs: identity.start_time_secs,
		expected_process_name:
			runningActionsService.getById(actionId)?.expected_process_name ??
			identity.name,
		resolution_retries: 0,
		status: "running",
		last_verified_at: now,
		stop_error: undefined,
	});
	await registerTrackedPid(pid);
	return true;
}

async function reconcileColdAction(
	action: RunningAction,
	now: string,
): Promise<void> {
	if (action.process_start_time_secs == null) {
		await pruneRunningAction(action.id, {
			runStatus: "failed",
			errorMessage: "Process identity unknown after restart",
		});
		return;
	}

	const alive = await verifyTrackedProcess(action);

	if (alive) {
		await registerTrackedPid(action.process_id);
		runningActionsService.update(action.id, {
			status: "running",
			last_verified_at: now,
			stop_error: undefined,
		});
		return;
	}

	await pruneRunningAction(action.id, {
		runStatus: "failed",
		errorMessage: "Process no longer running after restart",
	});
}

async function reconcileRuntimeAction(
	action: RunningAction,
	now: string,
): Promise<void> {
	const alive = await verifyTrackedProcess(action);

	if (alive) {
		await registerTrackedPid(action.process_id);
		runningActionsService.update(action.id, {
			status: "running",
			last_verified_at: now,
			stop_error: undefined,
		});
		return;
	}

	const retries = action.resolution_retries ?? 0;
	const canReResolve =
		isSameSession(action) &&
		action.working_directory &&
		action.launched_at_secs &&
		retries < MAX_RESOLUTION_RETRIES;

	if (canReResolve) {
		const newPid = await findServerProcess(
			action.working_directory!,
			action.launched_at_secs!,
		);

		if (newPid) {
			const adopted = await adoptProcessIdentity(action.id, newPid, now);
			if (adopted) {
				console.log(`Re-resolved PID for "${action.action_name}": ${newPid}`);
				return;
			}
		}

		runningActionsService.update(action.id, {
			resolution_retries: retries + 1,
			status: "exited",
			last_verified_at: now,
		});
		return;
	}

	await pruneRunningAction(action.id, { runStatus: "success" });
}

export async function reconcileRunningActions(
	options?: ReconcileOptions,
): Promise<void> {
	const runningActions = runningActionsService.getAll();
	const now = new Date().toISOString();
	const cold = options?.cold === true;

	for (const action of runningActions) {
		if (cold) {
			await reconcileColdAction(action, now);
		} else {
			await reconcileRuntimeAction(action, now);
		}
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

		const stillAlive = await verifyTrackedProcess(action);
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
		const stillAlive = await verifyTrackedProcess(action);
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
	return verifyTrackedProcess(entry);
}
