import { A } from "@solidjs/router";
import type { Component } from "solid-js";
import { createSignal, onMount } from "solid-js";
import { DatabaseResetDialog } from "@/components/DatabaseResetDialog";
import { ImportDialog } from "@/components/ImportDialog";
import { ShareDialog } from "@/components/ShareDialog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch, SwitchControl, SwitchThumb } from "@/components/ui/switch";
import * as api from "@/libs/api";
import { autostartHandler } from "@/libs/autostart";
import { showToast } from "@/libs/toast";
import { checkForUpdates } from "@/libs/updater";
import { useThemeStore } from "@/store/theme";
import { useToolStore } from "@/store/tool";
import { version } from "../../../package.json" with { type: "json" };

export const GeneralSettings: Component = () => {
	const [, toolActions] = useToolStore();
	const [, themeActions] = useThemeStore();
	const [autoLaunch, setAutoLaunch] = createSignal(false);
	const [resetDialogOpen, setResetDialogOpen] = createSignal(false);
	const [backupDialogOpen, setBackupDialogOpen] = createSignal(false);
	const openDataLocation = async () => {
		try {
			const { appDataDir } = await import("@tauri-apps/api/path");
			const { openPath } = await import("@tauri-apps/plugin-opener");
			const dir = await appDataDir();
			await openPath(dir);
		} catch (error) {
			showToast({
				title: "Failed to open data folder",
				description: error instanceof Error ? error.message : "Unknown error occurred",
				variant: "destructive",
			});
		}
	};

	onMount(() => {
		autostartHandler.isEnabled().then((enabled) => {
			setAutoLaunch(enabled);
		});
	});

	const toggleAutoLaunch = async (enabled: boolean) => {
		try {
			await autostartHandler.toggle(enabled);
			setAutoLaunch(enabled);
			showToast({
				title: enabled ? "Autostart enabled" : "Autostart disabled",
				description: enabled
					? "Application will start automatically when you log in"
					: "Application will not start automatically",
			});
		} catch (error) {
			showToast({
				title: "Failed to update autostart",
				description:
					error instanceof Error ? error.message : "Unknown error occurred",
				variant: "destructive",
			});
			setAutoLaunch(!enabled);
		}
	};

	const handleResetDatabase = async () => {
		try {
			const result = await api.resetDatabase();
			if (result.isOk()) {
				showToast({
					title: "Database Reset",
					description:
						"Database has been reset successfully. All data has been cleared.",
				});
				toolActions.loadTools();
				themeActions.loadThemes();
			} else {
				showToast({
					title: "Reset Failed",
					description: result.error.message,
					variant: "destructive",
				});
			}
		} catch (error) {
			showToast({
				title: "Reset Failed",
				description:
					error instanceof Error ? error.message : "Unknown error occurred",
				variant: "destructive",
			});
		}
		setResetDialogOpen(false);
	};

	const handleBackupAndReset = async () => {
		try {
			const result = await api.backupAndResetDatabase();
			if (result.isOk()) {
				showToast({
					title: "Backup & Reset Complete",
					description: `Database has been backed up and reset. Backup saved to: ${result.value}`,
				});
				toolActions.loadTools();
				themeActions.loadThemes();
			} else {
				showToast({
					title: "Backup & Reset Failed",
					description: result.error.message,
					variant: "destructive",
				});
			}
		} catch (error) {
			showToast({
				title: "Backup & Reset Failed",
				description:
					error instanceof Error ? error.message : "Unknown error occurred",
				variant: "destructive",
			});
		}
		setBackupDialogOpen(false);
	};

	return (
		<div class="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<div class="i-mdi-cog w-5 h-5" />
						General & Hotkeys
					</CardTitle>
					<CardDescription>
						Application preferences and keyboard shortcuts
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="flex items-center justify-between">
						<div class="space-y-1">
							<p class="text-sm font-medium">Auto-launch on startup</p>
							<p class="text-sm text-muted-foreground">Start with the system</p>
						</div>
						<Switch checked={autoLaunch()} onChange={toggleAutoLaunch}>
							<SwitchControl>
								<SwitchThumb />
							</SwitchControl>
						</Switch>
					</div>

					<Separator />

					<div class="flex items-center justify-between">
						<div class="space-y-1">
							<p class="text-sm font-medium">Data location</p>
							<p class="text-sm text-muted-foreground">Open the application data folder</p>
						</div>
						<Button variant="outline" onClick={openDataLocation}>
							<span class="iconify w-4 h-4 mr-2" data-icon="mdi:folder-open" />
							Open Folder
						</Button>
					</div>

					<Separator />

					<div class="space-y-2">
						<p class="text-sm font-medium">Keyboard Shortcuts</p>
						<p class="text-sm text-muted-foreground">
							Configure global hotkeys for quick access
						</p>
						<A href="/settings/hotkeys">
							<Button variant="outline" class="w-full">
								<div class="i-mdi-keyboard-settings w-4 h-4 mr-2" />
								Configure Hotkeys
							</Button>
						</A>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<div class="i-mdi-update w-5 h-5" />
						Updates
					</CardTitle>
					<CardDescription>Check for application updates</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium">Application Updates</p>
							<p class="text-sm text-muted-foreground">
								Current version: {version || "dev"}
							</p>
						</div>
						<Button onClick={() => checkForUpdates(false)}>
							<div class="i-mdi-update w-4 h-4 mr-2" />
							Check for Updates
						</Button>
					</div>

					<Separator />

					<div class="flex gap-2">
						<a
							href="https://github.com/ur-wesley/WorkspaceLauncher"
							target="_blank"
							rel="noreferrer"
							class="flex-1"
						>
							<Button variant="outline" class="w-full">
								<span
									class="iconify w-4 h-4 mr-2"
									data-icon="mdi:source-repository"
								/>
								Repository
							</Button>
						</a>
						<a
							href="https://github.com/ur-wesley/WorkspaceLauncher/issues/new/choose"
							target="_blank"
							rel="noreferrer"
							class="flex-1"
						>
							<Button variant="outline" class="w-full">
								<span class="iconify w-4 h-4 mr-2" data-icon="mdi:github" />
								New Issue
							</Button>
						</a>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<span class="iconify w-5 h-5" data-icon="mdi:share-variant" />
						Share & Import
					</CardTitle>
					<CardDescription>
						Export your data to share with others or backup, and import data
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					<div class="flex items-start gap-3">
						<div class="flex-1 space-y-1">
							<p class="text-sm font-medium">Export Data</p>
							<p class="text-sm text-muted-foreground">
								Select and export workspaces and tools to a file or clipboard
							</p>
						</div>
						<ShareDialog
							trigger={(props) => (
								<Button onClick={props.onClick}>
									<span class="iconify w-4 h-4 mr-2" data-icon="mdi:export" />
									Export
								</Button>
							)}
						/>
					</div>

					<Separator />

					<div class="flex items-start gap-3">
						<div class="flex-1 space-y-1">
							<p class="text-sm font-medium">Import Data</p>
							<p class="text-sm text-muted-foreground">
								Import workspaces and tools from a file or clipboard
							</p>
						</div>
						<ImportDialog
							trigger={(props: { onClick?: () => void }) => (
								<Button variant="outline" onClick={props.onClick}>
									<span class="iconify w-4 h-4 mr-2" data-icon="mdi:import" />
									Import
								</Button>
							)}
						/>
					</div>
				</CardContent>
			</Card>

			<Separator />

			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<span class="iconify w-5 h-5" data-icon="mdi:database-remove" />
						Reset Database
					</CardTitle>
					<CardDescription>
						Permanently delete all data and reset the database
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					<div class="flex items-start gap-3">
						<div class="flex-1 space-y-1">
							<p class="text-sm font-medium">Reset Database</p>
							<p class="text-sm text-muted-foreground">
								This will permanently delete all workspaces, actions, tools,
								themes, and settings. This action cannot be undone.
							</p>
						</div>
						<Button
							variant="destructive"
							onClick={() => setResetDialogOpen(true)}
						>
							<span
								class="iconify w-4 h-4 mr-2"
								data-icon="mdi:database-remove"
							/>
							Reset Database
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<span class="iconify w-5 h-5" data-icon="mdi:database-backup" />
						Backup & Reset Database
					</CardTitle>
					<CardDescription>
						Create a backup of all data, then reset the database
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					<div class="flex items-start gap-3">
						<div class="flex-1 space-y-1">
							<p class="text-sm font-medium">Backup & Reset Database</p>
							<p class="text-sm text-muted-foreground">
								This will export all data to a JSON file, then reset the
								database. Your data will be safely backed up.
							</p>
						</div>
						<Button variant="outline" onClick={() => setBackupDialogOpen(true)}>
							<span
								class="iconify w-4 h-4 mr-2"
								data-icon="mdi:database-backup"
							/>
							Backup & Reset
						</Button>
					</div>
				</CardContent>
			</Card>

			<DatabaseResetDialog
				open={resetDialogOpen()}
				onClose={() => setResetDialogOpen(false)}
				onConfirm={handleResetDatabase}
				title="Reset Database"
				description="This will permanently delete all workspaces, actions, tools, themes, and settings. This action cannot be undone. Are you sure you want to continue?"
				confirmText="Reset Database"
				variant="destructive"
			/>

			<DatabaseResetDialog
				open={backupDialogOpen()}
				onClose={() => setBackupDialogOpen(false)}
				onConfirm={handleBackupAndReset}
				title="Backup & Reset Database"
				description="This will export all your data to a JSON file and then reset the database. Your data will be safely backed up. Are you sure you want to continue?"
				confirmText="Backup & Reset"
			/>
		</div>
	);
};
