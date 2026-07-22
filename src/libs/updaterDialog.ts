import { createStore } from "solid-js/store";

export type UpdaterDialogMode = "available" | "downloading" | "info" | "error";

export interface UpdaterDialogState {
	open: boolean;
	mode: UpdaterDialogMode;
	title: string;
	message: string;
	version: string;
	releaseNotes: string;
	progress: number | null;
	progressLabel: string;
}

const initialState: UpdaterDialogState = {
	open: false,
	mode: "info",
	title: "",
	message: "",
	version: "",
	releaseNotes: "",
	progress: null,
	progressLabel: "",
};

export const [updaterDialogState, setUpdaterDialogState] =
	createStore<UpdaterDialogState>({ ...initialState });

let resolvePrompt: ((install: boolean) => void) | null = null;
let resolveAck: (() => void) | null = null;

function closeDialog() {
	setUpdaterDialogState("open", false);
}

export function promptForUpdate(
	version: string,
	releaseNotes: string | null | undefined,
): Promise<boolean> {
	return new Promise((resolve) => {
		resolvePrompt = resolve;
		setUpdaterDialogState({
			open: true,
			mode: "available",
			title: "Update Available",
			message: "",
			version,
			releaseNotes: releaseNotes?.trim() ?? "",
			progress: null,
			progressLabel: "",
		});
	});
}

export function showInfoDialog(title: string, message: string): Promise<void> {
	return new Promise((resolve) => {
		resolveAck = resolve;
		setUpdaterDialogState({
			open: true,
			mode: "info",
			title,
			message,
			version: "",
			releaseNotes: "",
			progress: null,
			progressLabel: "",
		});
	});
}

export function showErrorDialog(title: string, message: string): Promise<void> {
	return new Promise((resolve) => {
		resolveAck = resolve;
		setUpdaterDialogState({
			open: true,
			mode: "error",
			title,
			message,
			version: "",
			releaseNotes: "",
			progress: null,
			progressLabel: "",
		});
	});
}

export function showDownloadingDialog(): void {
	setUpdaterDialogState({
		open: true,
		mode: "downloading",
		title: "Installing Update",
		message: "Downloading update package…",
		progress: null,
		progressLabel: "Preparing download…",
	});
}

export function setDownloadProgress(
	downloadedBytes: number,
	totalBytes: number | null,
): void {
	if (totalBytes && totalBytes > 0) {
		const progress = Math.min(
			100,
			Math.round((downloadedBytes / totalBytes) * 100),
		);
		setUpdaterDialogState({
			progress,
			progressLabel: `Downloaded ${formatBytes(downloadedBytes)} of ${formatBytes(totalBytes)}`,
			message: "Downloading update package…",
		});
		return;
	}

	setUpdaterDialogState({
		progress: null,
		progressLabel: `Downloaded ${formatBytes(downloadedBytes)}`,
		message: "Downloading update package…",
	});
}

export function setInstallingState(): void {
	setUpdaterDialogState({
		progress: 100,
		progressLabel: "Installing update…",
		message: "The app will restart when installation completes.",
	});
}

export function confirmInstall(): void {
	resolvePrompt?.(true);
	resolvePrompt = null;
}

export function dismissUpdate(): void {
	resolvePrompt?.(false);
	resolvePrompt = null;
	closeDialog();
}

export function acknowledgeDialog(): void {
	resolveAck?.();
	resolveAck = null;
	closeDialog();
}

export function handleDialogOpenChange(open: boolean): void {
	if (!open) {
		if (updaterDialogState.mode === "downloading") {
			setUpdaterDialogState("open", true);
			return;
		}

		if (updaterDialogState.mode === "available") {
			dismissUpdate();
			return;
		}

		acknowledgeDialog();
	}
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
