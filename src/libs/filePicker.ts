import { open } from "@tauri-apps/plugin-dialog";

export interface FilePickerOptions {
	title?: string;
	directory?: boolean;
	multiple?: boolean;
	filters?: Array<{
		name: string;
		extensions: string[];
	}>;
	defaultPath?: string;
}

/**
 * Open a file picker dialog to select a file
 * @returns The selected file path or null if cancelled
 */
export async function pickFile(options: FilePickerOptions = {}): Promise<string | null> {
	try {
		const result = await open({
			title: options.title || "Select File",
			directory: options.directory || false,
			multiple: false,
			filters: options.filters,
			defaultPath: options.defaultPath,
		});

		if (typeof result === "string") {
			return result;
		}

		return null;
	} catch (error) {
		console.error("File picker error:", error);
		throw error;
	}
}

/**
 * Open a file picker dialog to select multiple files
 * @returns Array of selected file paths or empty array if cancelled
 */
export async function pickFiles(options: FilePickerOptions = {}): Promise<string[]> {
	try {
		const result = await open({
			title: options.title || "Select Files",
			directory: options.directory || false,
			multiple: true,
			filters: options.filters,
			defaultPath: options.defaultPath,
		});

		if (Array.isArray(result)) {
			return result;
		}

		return [];
	} catch (error) {
		console.error("File picker error:", error);
		throw error;
	}
}

/**
 * Open a directory picker dialog
 * @returns The selected directory path or null if cancelled
 */
export async function pickDirectory(options: Omit<FilePickerOptions, "directory"> = {}): Promise<string | null> {
	try {
		const result = await open({
			title: options.title || "Select Directory",
			directory: true,
			multiple: false,
			defaultPath: options.defaultPath,
		});

		if (typeof result === "string") {
			return result;
		}

		return null;
	} catch (error) {
		console.error("Directory picker error:", error);
		throw error;
	}
}

/**
 * Open a file picker specifically for executable files
 * @returns The selected executable path or null if cancelled
 */
export async function pickExecutable(options: Omit<FilePickerOptions, "filters"> = {}): Promise<string | null> {
	const filters = [
		{ name: "Executable", extensions: ["exe", "bat", "cmd", "sh", "app", "bin"] },
		{ name: "All Files", extensions: ["*"] },
	];

	return pickFile({
		...options,
		title: options.title || "Select Executable",
		filters,
	});
}
