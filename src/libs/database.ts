import Database from "@tauri-apps/plugin-sql";

let database: Database | null = null;

export async function initializeDatabase(): Promise<void> {
	try {
		console.log("Initializing database...");
		database = await Database.load("sqlite:workspacelauncher.db");
		console.log("Database connected successfully");

		await initializeDefaultSettings();
	} catch (error) {
		console.error("Failed to initialize database:", error);
		throw error;
	}
}

export function getDatabase(): Database {
	if (!database) {
		throw new Error("Database not initialized. Call initializeDatabase() first.");
	}
	return database;
}

export const DEFAULT_SETTINGS = {
	eclipse_binary_path: "",
	default_shell_windows: "powershell.exe",
	default_shell_macos: "zsh",
	default_shell_linux: "bash",
	log_retention_days: "30",
} as const;

export async function initializeDefaultSettings(): Promise<void> {
	try {
		const database = getDatabase();
		for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
			const existing = await database.select("SELECT value FROM settings WHERE key = $1", [key]);
			if (Array.isArray(existing) && existing.length === 0) {
				await database.execute("INSERT INTO settings (key, value) VALUES ($1, $2)", [key, value]);
			}
		}
		console.log("Default settings initialized");
	} catch (error) {
		console.error("Failed to initialize default settings:", error);
	}
}

export async function getSetting(key: string): Promise<string | null> {
	try {
		const database = getDatabase();
		const result = await database.select("SELECT value FROM settings WHERE key = $1", [key]);

		if (Array.isArray(result) && result.length > 0) {
			const row = result[0] as { value: string };
			return row.value;
		}
		return null;
	} catch (error) {
		console.error(`Failed to get setting ${key}:`, error);
		return null;
	}
}

export async function setSetting(key: string, value: string): Promise<void> {
	try {
		const database = getDatabase();
		await database.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)", [key, value]);
	} catch (error) {
		console.error(`Failed to set setting ${key}:`, error);
		throw error;
	}
}
