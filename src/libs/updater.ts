import { ask, message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import type { DownloadEvent } from "@tauri-apps/plugin-updater";
import { check } from "@tauri-apps/plugin-updater";

export async function checkForUpdates(silent = false): Promise<void> {
	try {
		const update = await check();

		if (update) {
			const yes = await ask(
				`Update to version ${update.version} is available!\n\nRelease notes:\n${update.body}\n\nWould you like to install it now?`,
				{
					title: "Update Available",
					kind: "info",
					okLabel: "Update",
					cancelLabel: "Later",
				},
			);

			if (yes) {
				console.log("Downloading and installing update...");

				await update.downloadAndInstall((event: DownloadEvent) => {
					switch (event.event) {
						case "Started":
							console.log(
								`Starting download of ${event.data.contentLength} bytes`,
							);
							break;
						case "Progress":
							console.log(`Downloaded ${event.data.chunkLength} bytes`);
							break;
						case "Finished":
							console.log("Download finished");
							break;
					}
				});

				console.log("Update installed, restarting app...");

				await relaunch();
			}
		} else if (!silent) {
			await message("You are already running the latest version.", {
				title: "No Updates",
				kind: "info",
				buttons: {
					ok: "OK",
				},
			});
		}
	} catch (error) {
		console.error("Failed to check for updates:", error);
		if (!silent) {
			await message(`Failed to check for updates: ${error}`, {
				title: "Update Check Failed",
				kind: "error",
				buttons: {
					ok: "OK",
				},
			});
		}
	}
}

export async function checkForUpdatesOnStartup(): Promise<void> {
	await checkForUpdates(true);
}
