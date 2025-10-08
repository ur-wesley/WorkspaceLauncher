import type { RunningAction } from "@/types/database";

const STORAGE_KEY = "workspace-launcher:running-actions";

/**
 * Service for managing running actions in localStorage.
 * Running actions are NOT saved to the database until they complete.
 */
export const runningActionsService = {
	/**
	 * Get all running actions from localStorage
	 */
	getAll(): RunningAction[] {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return [];
		try {
			return JSON.parse(stored) as RunningAction[];
		} catch {
			console.error("Failed to parse running actions from localStorage");
			return [];
		}
	},

	/**
	 * Get running actions for a specific workspace
	 */
	getByWorkspace(workspaceId: number): RunningAction[] {
		return this.getAll().filter((action) => action.workspace_id === workspaceId);
	},

	/**
	 * Get a specific running action by its ID
	 */
	getById(id: string): RunningAction | undefined {
		return this.getAll().find((action) => action.id === id);
	},

	/**
	 * Add a new running action
	 */
	add(action: RunningAction): void {
		const all = this.getAll();
		all.push(action);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
	},

	/**
	 * Remove a running action by ID
	 */
	remove(id: string): void {
		const all = this.getAll();
		const filtered = all.filter((action) => action.id !== id);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
	},

	/**
	 * Remove all running actions for a specific workspace
	 */
	removeByWorkspace(workspaceId: number): void {
		const all = this.getAll();
		const filtered = all.filter((action) => action.workspace_id !== workspaceId);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
	},

	/**
	 * Clear all running actions
	 */
	clear(): void {
		localStorage.removeItem(STORAGE_KEY);
	},

	/**
	 * Update a running action
	 */
	update(id: string, updates: Partial<RunningAction>): void {
		const all = this.getAll();
		const index = all.findIndex((action) => action.id === id);
		if (index !== -1) {
			all[index] = { ...all[index], ...updates };
			localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
		}
	},
};
