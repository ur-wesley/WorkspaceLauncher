import type { ThemeColors } from "@/types/database";

const LIGHT_STYLE_ID = "theme-light-vars";
const DARK_STYLE_ID = "theme-dark-vars";

export function applyThemeColors(lightColors: ThemeColors, darkColors: ThemeColors): void {
	const lightStyle = ensureStyleElement(LIGHT_STYLE_ID);
	lightStyle.textContent = buildStyleBlock(":root", lightColors);

	const darkStyle = ensureStyleElement(DARK_STYLE_ID);
	darkStyle.textContent = buildStyleBlock('[data-kb-theme="dark"]', darkColors);
}

export function getCurrentThemeColors(): { light: ThemeColors; dark: ThemeColors } {
	const root = document.documentElement;
	const computedStyle = getComputedStyle(root);

	const lightColors: ThemeColors = {
		background: getVarValue(computedStyle, "--background"),
		foreground: getVarValue(computedStyle, "--foreground"),
		card: getVarValue(computedStyle, "--card"),
		cardForeground: getVarValue(computedStyle, "--card-foreground"),
		popover: getVarValue(computedStyle, "--popover"),
		popoverForeground: getVarValue(computedStyle, "--popover-foreground"),
		primary: getVarValue(computedStyle, "--primary"),
		primaryForeground: getVarValue(computedStyle, "--primary-foreground"),
		secondary: getVarValue(computedStyle, "--secondary"),
		secondaryForeground: getVarValue(computedStyle, "--secondary-foreground"),
		muted: getVarValue(computedStyle, "--muted"),
		mutedForeground: getVarValue(computedStyle, "--muted-foreground"),
		accent: getVarValue(computedStyle, "--accent"),
		accentForeground: getVarValue(computedStyle, "--accent-foreground"),
		destructive: getVarValue(computedStyle, "--destructive"),
		destructiveForeground: getVarValue(computedStyle, "--destructive-foreground"),
		border: getVarValue(computedStyle, "--border"),
		input: getVarValue(computedStyle, "--input"),
		ring: getVarValue(computedStyle, "--ring"),
	};

	const darkThemeElement = document.querySelector('[data-kb-theme="dark"]');
	const darkComputedStyle = darkThemeElement ? getComputedStyle(darkThemeElement as Element) : computedStyle;

	const darkColors: ThemeColors = {
		background: getVarValue(darkComputedStyle, "--background"),
		foreground: getVarValue(darkComputedStyle, "--foreground"),
		card: getVarValue(darkComputedStyle, "--card"),
		cardForeground: getVarValue(darkComputedStyle, "--card-foreground"),
		popover: getVarValue(darkComputedStyle, "--popover"),
		popoverForeground: getVarValue(darkComputedStyle, "--popover-foreground"),
		primary: getVarValue(darkComputedStyle, "--primary"),
		primaryForeground: getVarValue(darkComputedStyle, "--primary-foreground"),
		secondary: getVarValue(darkComputedStyle, "--secondary"),
		secondaryForeground: getVarValue(darkComputedStyle, "--secondary-foreground"),
		muted: getVarValue(darkComputedStyle, "--muted"),
		mutedForeground: getVarValue(darkComputedStyle, "--muted-foreground"),
		accent: getVarValue(darkComputedStyle, "--accent"),
		accentForeground: getVarValue(darkComputedStyle, "--accent-foreground"),
		destructive: getVarValue(darkComputedStyle, "--destructive"),
		destructiveForeground: getVarValue(darkComputedStyle, "--destructive-foreground"),
		border: getVarValue(darkComputedStyle, "--border"),
		input: getVarValue(darkComputedStyle, "--input"),
		ring: getVarValue(darkComputedStyle, "--ring"),
	};

	return { light: lightColors, dark: darkColors };
}

function convertToCSSVarName(key: string): string {
	return `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
}

function getVarValue(style: CSSStyleDeclaration, varName: string): string {
	return style.getPropertyValue(varName).trim();
}

function ensureStyleElement(id: string): HTMLStyleElement {
	let style = document.getElementById(id) as HTMLStyleElement | null;
	if (!style) {
		style = document.createElement("style");
		style.id = id;
		document.head.appendChild(style);
	}
	return style;
}

function buildStyleBlock(selector: string, colors: ThemeColors): string {
	const vars = Object.entries(colors)
		.map(([key, value]) => {
			const cssVar = convertToCSSVarName(key);
			return `  ${cssVar}: ${value};`;
		})
		.join("\n");

	return `${selector} {\n${vars}\n}`;
}
