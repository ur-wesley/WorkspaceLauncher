import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

/**
 * Autostart handler for managing application launch on system startup
 */
export const autostartHandler = {
	/**
	 * Enable autostart - app will launch when system starts
	 */
	async enable(): Promise<void> {
		try {
			await enable();
		} catch (error) {
			console.error("Failed to enable autostart:", error);
			throw new Error(`Could not enable autostart: ${error}`);
		}
	},

	/**
	 * Disable autostart - app will not launch when system starts
	 */
	async disable(): Promise<void> {
		try {
			await disable();
		} catch (error) {
			console.error("Failed to disable autostart:", error);
			throw new Error(`Could not disable autostart: ${error}`);
		}
	},

	/**
	 * Check if autostart is currently enabled
	 */
	async isEnabled(): Promise<boolean> {
		try {
			return await isEnabled();
		} catch (error) {
			console.error("Failed to check autostart status:", error);
			return false;
		}
	},

	/**
	 * Toggle autostart on/off
	 */
	async toggle(shouldEnable: boolean): Promise<void> {
		if (shouldEnable) {
			await this.enable();
		} else {
			await this.disable();
		}
	},
};
