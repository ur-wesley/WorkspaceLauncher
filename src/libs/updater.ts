import { relaunch } from "@tauri-apps/plugin-process";
import type { DownloadEvent } from "@tauri-apps/plugin-updater";
import { check } from "@tauri-apps/plugin-updater";
import {
	promptForUpdate,
	setDownloadProgress,
	setInstallingState,
	showDownloadingDialog,
	showErrorDialog,
	showInfoDialog,
} from "@/libs/updaterDialog";

export async function checkForUpdates(silent = false): Promise<void> {
	try {
		const update = await check();

		if (update) {
			const install = await promptForUpdate(update.version, update.body);

			if (!install) {
				return;
			}

			showDownloadingDialog();

			let downloadedBytes = 0;
			let totalBytes: number | null = null;

			await update.downloadAndInstall((event: DownloadEvent) => {
				switch (event.event) {
					case "Started":
						totalBytes = event.data.contentLength ?? null;
						downloadedBytes = 0;
						setDownloadProgress(downloadedBytes, totalBytes);
						break;
					case "Progress":
						downloadedBytes += event.data.chunkLength;
						setDownloadProgress(downloadedBytes, totalBytes);
						break;
					case "Finished":
						setInstallingState();
						break;
				}
			});

			await relaunch();
		} else if (!silent) {
			await showInfoDialog(
				"No Updates",
				"You are already running the latest version.",
			);
		}
	} catch (error) {
		console.error("Failed to check for updates:", error);
		if (!silent) {
			await showErrorDialog(
				"Update Check Failed",
				`Failed to check for updates: ${error}`,
			);
		}
	}
}

export async function checkForUpdatesOnStartup(): Promise<void> {
	await checkForUpdates(true);
}
