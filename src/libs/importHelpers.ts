import type { ExportData } from "./share";

/**
 * Parses JSON data from a string
 */
export function parseImportData(jsonString: string): ExportData {
	return JSON.parse(jsonString) as ExportData;
}

/**
 * Reads JSON data from a File object
 */
export async function readFileAsJSON(file: File): Promise<ExportData> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = parseImportData(e.target?.result as string);
				resolve(data);
			} catch (err) {
				reject(err);
			}
		};
		reader.onerror = () => reject(reader.error);
		reader.readAsText(file);
	});
}

/**
 * Reads JSON data from clipboard
 */
export async function readClipboardAsJSON(): Promise<ExportData> {
	const text = await navigator.clipboard.readText();
	return parseImportData(text);
}

/**
 * Extracts all IDs from an array of objects with id property
 */
export function extractIds<T extends { id: number }>(items: T[]): Set<number> {
	return new Set<number>(items.map((item) => item.id));
}

/**
 * Checks if a name is duplicated in a list
 */
export function isDuplicateName(
	targetId: number,
	items: Array<{ id: number; name: string }>,
	selectedIds: Set<number>,
	renamedMap: Map<number, string>,
): boolean {
	const getName = (item: { id: number; name: string }) =>
		renamedMap.get(item.id) || item.name;

	const targetName = getName(
		items.find((item) => item.id === targetId) || { id: targetId, name: "" },
	);

	const allNames = items
		.filter((item) => selectedIds.has(item.id))
		.map((item) => getName(item));

	return allNames.filter((name) => name === targetName).length > 1;
}

/**
 * Gets the effective name for an item (renamed or original)
 */
export function getEffectiveName<T extends { id: number; name: string }>(
	item: T,
	renamedMap: Map<number, string>,
): string {
	return renamedMap.get(item.id) || item.name;
}

/**
 * Toggles an ID in a Set
 */
export function toggleIdInSet(
	id: number,
	currentSet: Set<number>,
): Set<number> {
	const newSet = new Set<number>(currentSet);
	if (newSet.has(id)) {
		newSet.delete(id);
	} else {
		newSet.add(id);
	}
	return newSet;
}

/**
 * Updates a rename map
 */
export function updateRenameMap(
	id: number,
	newName: string,
	currentMap: Map<number, string>,
): Map<number, string> {
	const newMap = new Map(currentMap);
	if (newName.trim()) {
		newMap.set(id, newName);
	} else {
		newMap.delete(id);
	}
	return newMap;
}

export function hasAnyWorkspaceNameConflict(
	workspaces: Array<{ id: number; name: string }>,
	selectedIds: Set<number>,
	renameMap: Map<number, string>,
	existingLowerNames: Set<string>,
): boolean {
	const lower = (s: string) => s.toLowerCase();
	const selectedNames: string[] = [];
	for (const ws of workspaces) {
		if (!selectedIds.has(ws.id)) continue;
		const name = (renameMap.get(ws.id) || ws.name || "").trim();
		if (!name) continue;
		const lowerName = lower(name);
		if (existingLowerNames.has(lowerName)) return true;
		selectedNames.push(lowerName);
	}
	const seen = new Set<string>();
	for (const n of selectedNames) {
		if (seen.has(n)) return true;
		seen.add(n);
	}
	return false;
}

export function groupActionsByWorkspace<
	T extends { id: number; workspace_id?: number | null },
>(actions: T[]): Map<number, T[]> {
	const map = new Map<number, T[]>();
	for (const a of actions) {
		const wsId = a.workspace_id;
		if (typeof wsId !== "number") continue;
		const arr = map.get(wsId) || [];
		arr.push(a);
		map.set(wsId, arr);
	}
	return map;
}
