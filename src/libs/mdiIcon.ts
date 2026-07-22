export function toMdiIconName(
	value?: string | null,
	fallback = "folder",
): string {
	if (!value) {
		return `mdi:${fallback}`;
	}
	if (value.includes(":")) {
		return value;
	}
	return `mdi:${value.replace(/^i-mdi-/, "")}`;
}
