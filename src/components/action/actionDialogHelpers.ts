import type {
	CustomToolActionConfig,
	PlaceholderDefinition,
	SavedToolActionConfig,
	ToolActionConfig,
} from "@/types/database";

const VARIABLE_PATTERN = /\$\{([^}]+)\}/g;

export function parsePlaceholderDefinitions(
	value: string,
): PlaceholderDefinition[] {
	if (!value) {
		return [];
	}

	try {
		const parsed = JSON.parse(value) as unknown;
		if (Array.isArray(parsed)) {
			return parsed
				.filter((item): item is PlaceholderDefinition => {
					return (
						item !== null &&
						typeof item === "object" &&
						typeof (item as { name?: unknown }).name === "string" &&
						typeof (item as { type?: unknown }).type === "string" &&
						typeof (item as { required?: unknown }).required === "boolean"
					);
				})
				.map((item) => ({
					name: item.name,
					description:
						typeof item.description === "string" ? item.description : "",
					required: item.required,
					type: item.type,
					default: typeof item.default === "string" ? item.default : undefined,
				}));
		}
	} catch (error) {
		console.warn(
			"ActionDialogStepper: failed to parse placeholder metadata",
			error,
		);
	}

	return [];
}

export function parseToolActionConfig(config: string): ToolActionConfig | null {
	if (!config) {
		return null;
	}

	try {
		const parsed = JSON.parse(config) as unknown;
		if (
			parsed &&
			typeof parsed === "object" &&
			(parsed as { type?: unknown }).type === "tool"
		) {
			if ((parsed as { source?: unknown }).source === "saved") {
				return parsed as SavedToolActionConfig;
			}

			if ((parsed as { source?: unknown }).source === "custom") {
				return parsed as CustomToolActionConfig;
			}
		}
	} catch (error) {
		console.warn("ActionDialogStepper: failed to parse action config", error);
	}

	return null;
}

export function extractVariablesFromText(
	value: string | undefined | null,
): string[] {
	if (!value) {
		return [];
	}

	const matches = value.match(VARIABLE_PATTERN) ?? [];
	return matches
		.map((match) => match.slice(2, -1))
		.filter((variable) => variable.length > 0);
}

export function normalizePlaceholderValues(
	placeholders: PlaceholderDefinition[],
	values: Record<string, string>,
): Record<string, string> {
	const result: Record<string, string> = {};

	for (const placeholder of placeholders) {
		const hasExistingValue = placeholder.name in values;
		if (hasExistingValue) {
			result[placeholder.name] = values[placeholder.name];
			continue;
		}

		if (typeof placeholder.default === "string") {
			result[placeholder.name] = placeholder.default;
		} else {
			result[placeholder.name] = "";
		}
	}

	return result;
}

export function parseArgsText(value: string): string[] {
	return value
		.split(/\r?\n/)
		.map((arg) => arg.trim())
		.filter((arg) => arg.length > 0);
}

export function gatherMissingVariables(
	sources: string[],
	available: Set<string>,
): Set<string> {
	const missing = new Set<string>();
	for (const source of sources) {
		for (const variable of extractVariablesFromText(source)) {
			if (!available.has(variable)) {
				missing.add(variable);
			}
		}
	}
	return missing;
}
