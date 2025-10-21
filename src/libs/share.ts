import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { Action, Theme, Tool, Workspace } from "@/types/database";

export interface ExportData {
	version: string;
	exportDate: string;
	workspaces?: Workspace[];
	actions?: Action[];
	tools?: Tool[];
	themes?: Theme[];
}

/**
 * Share/Export handler for workspaces, environments, actions, and tools
 */
export const shareHandler = {
	/**
	 * Export data to a JSON file
	 */
	async exportToFile(data: ExportData): Promise<void> {
		try {
			const fileName = `workspace-launcher-export-${new Date().toISOString().split("T")[0]}.json`;
			const filePath = await save({
				defaultPath: fileName,
				filters: [
					{
						name: "JSON",
						extensions: ["json"],
					},
				],
			});

			if (!filePath) {
				throw new Error("No file path selected");
			}

			const exportData: ExportData = {
				...data,
				version: "1.0.0",
				exportDate: new Date().toISOString(),
			};

			await writeTextFile(filePath, JSON.stringify(exportData, null, 2));
		} catch (error) {
			console.error("Failed to export data:", error);
			throw new Error(`Export failed: ${error}`);
		}
	},

	/**
	 * Import data from a JSON file
	 */
	async importFromFile(): Promise<ExportData> {
		try {
			const filePath = await open({
				multiple: false,
				filters: [
					{
						name: "JSON",
						extensions: ["json"],
					},
				],
			});

			if (!filePath) {
				throw new Error("No file selected");
			}

			const fileContent = await readTextFile(filePath);
			const importData: ExportData = JSON.parse(fileContent);

			if (!importData.version) {
				throw new Error("Invalid export file format");
			}

			return importData;
		} catch (error) {
			console.error("Failed to import data:", error);
			throw new Error(`Import failed: ${error}`);
		}
	},

	/**
	 * Export workspaces to clipboard as JSON
	 */
	async exportToClipboard(data: ExportData): Promise<void> {
		try {
			const exportData: ExportData = {
				...data,
				version: "1.0.0",
				exportDate: new Date().toISOString(),
			};

			const jsonString = JSON.stringify(exportData, null, 2);
			await navigator.clipboard.writeText(jsonString);
		} catch (error) {
			console.error("Failed to export to clipboard:", error);
			throw new Error(`Clipboard export failed: ${error}`);
		}
	},

	/**
	 * Import from clipboard
	 */
	async importFromClipboard(): Promise<ExportData> {
		try {
			const clipboardText = await navigator.clipboard.readText();
			const importData: ExportData = JSON.parse(clipboardText);

			if (!importData.version) {
				throw new Error("Invalid export format in clipboard");
			}

			return importData;
		} catch (error) {
			console.error("Failed to import from clipboard:", error);
			throw new Error(`Clipboard import failed: ${error}`);
		}
	},
};
