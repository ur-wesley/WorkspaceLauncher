const STORAGE_KEY = "workspace-launcher:workspace-description-expanded";

type ExpandedDescriptions = Record<string, boolean>;

type DescriptionExpandOptions = {
	minCharacters?: number;
	minLineBreaks?: number;
};

const DEFAULT_MIN_CHARACTERS = 160;
const DEFAULT_MIN_LINE_BREAKS = 1;

function readState(): ExpandedDescriptions {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) {
			return {};
		}

		const parsed = JSON.parse(stored) as unknown;
		if (!parsed || typeof parsed !== "object") {
			return {};
		}

		return Object.fromEntries(
			Object.entries(parsed as ExpandedDescriptions).map(([key, value]) => [
				key,
				Boolean(value),
			]),
		);
	} catch {
		return {};
	}
}

function writeState(state: ExpandedDescriptions): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {}
}

export function getWorkspaceDescriptionExpanded(workspaceId: number): boolean {
	const state = readState();
	const key = String(workspaceId);
	return key in state ? Boolean(state[key]) : false;
}

export function setWorkspaceDescriptionExpanded(
	workspaceId: number,
	expanded: boolean,
): void {
	const state = readState();
	state[String(workspaceId)] = expanded;
	writeState(state);
}

export function clearWorkspaceDescriptionExpanded(workspaceId: number): void {
	const state = readState();
	const key = String(workspaceId);
	if (key in state) {
		delete state[key];
		writeState(state);
	}
}

export function isDescriptionExpandable(
	description: string | null | undefined,
	options: DescriptionExpandOptions = {},
): boolean {
	if (!description) {
		return false;
	}

	const normalized = description.trim();
	if (!normalized) {
		return false;
	}

	const minCharacters = options.minCharacters ?? DEFAULT_MIN_CHARACTERS;
	const minLineBreaks = options.minLineBreaks ?? DEFAULT_MIN_LINE_BREAKS;

	if (normalized.length > minCharacters) {
		return true;
	}

	if (minLineBreaks <= 0) {
		return false;
	}

	const lineBreakCount = normalized.split(/\r?\n/).length - 1;
	return lineBreakCount >= minLineBreaks;
}
