import { reconcileRunningActions } from "./processTracking";

const CHECK_INTERVAL = 3000;

let intervalId: number | null = null;

export function startPidChecker(): void {
	if (intervalId !== null) {
		console.warn("PID checker is already running");
		return;
	}

	reconcileRunningActions().catch(console.error);

	intervalId = window.setInterval(() => {
		reconcileRunningActions().catch(console.error);
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
