import type { Component } from "solid-js";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { defaultTheme } from "@/libs/themePresets";
import type { ThemeColors } from "@/types/database";
import { ColorPicker } from "./ColorPicker";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { TextField, TextFieldLabel, TextFieldRoot } from "./ui/textfield";

interface ThemeCreatorProps {
	initialTheme?: {
		name: string;
		description?: string;
		lightColors: ThemeColors;
		darkColors: ThemeColors;
	};
	onSave: (theme: { name: string; description?: string; lightColors: ThemeColors; darkColors: ThemeColors }) => void;
	onCancel: () => void;
	presets?: Array<{
		id: string;
		name: string;
		description?: string;
		lightColors: ThemeColors;
		darkColors: ThemeColors;
	}>;
}

export const ThemeCreator: Component<ThemeCreatorProps> = (props) => {
	const [name, setName] = createSignal<string>(props.initialTheme?.name ?? "");
	const [description, setDescription] = createSignal<string>(props.initialTheme?.description ?? "");
	const [lightColors, setLightColors] = createSignal<ThemeColors>(
		props.initialTheme?.lightColors || { ...defaultTheme.light },
	);
	const [darkColors, setDarkColors] = createSignal<ThemeColors>(
		props.initialTheme?.darkColors || { ...defaultTheme.dark },
	);
	const [previewMode, setPreviewMode] = createSignal<"light" | "dark">("light");
	const [selectedPreset, setSelectedPreset] = createSignal<string | null>(null);

	const updateLightColor = (key: keyof ThemeColors, value: string) => {
		setLightColors((prev) => ({ ...prev, [key]: value }));
	};

	const updateDarkColor = (key: keyof ThemeColors, value: string) => {
		setDarkColors((prev) => ({ ...prev, [key]: value }));
	};

	const applyPreset = (presetId: string | null) => {
		const preset = availablePresets().find((item) => item.id === presetId);
		if (!preset) {
			return;
		}
		setLightColors({ ...preset.lightColors });
		setDarkColors({ ...preset.darkColors });
		if (!props.initialTheme) {
			if (!name().trim()) {
				setName(preset.name ?? "");
			}
			if (!description().trim()) {
				setDescription(preset.description ?? "");
			}
		}
		setSelectedPreset(presetId);
	};

	const availablePresets = createMemo(() => props.presets ?? []);
	const presetOptions = createMemo<string[]>(() => availablePresets().map((preset) => preset.id));

	createEffect(() => {
		const initial = props.initialTheme;
		if (!initial) {
			return;
		}
		setName(initial.name ?? "");
		setDescription(initial.description ?? "");
		setLightColors({ ...initial.lightColors });
		setDarkColors({ ...initial.darkColors });
		setSelectedPreset(null);
	});

	const handleSave = () => {
		props.onSave({
			name: name(),
			description: description() || undefined,
			lightColors: lightColors(),
			darkColors: darkColors(),
		});
	};

	const colorGroups: Array<{
		title: string;
		keys: Array<keyof ThemeColors>;
	}> = [
		{
			title: "Background & Surfaces",
			keys: ["background", "foreground", "card", "cardForeground", "popover", "popoverForeground"],
		},
		{
			title: "Primary & Secondary",
			keys: ["primary", "primaryForeground", "secondary", "secondaryForeground"],
		},
		{
			title: "Muted & Accent",
			keys: ["muted", "mutedForeground", "accent", "accentForeground"],
		},
		{
			title: "Destructive",
			keys: ["destructive", "destructiveForeground"],
		},
		{
			title: "Borders & Inputs",
			keys: ["border", "input", "ring"],
		},
	];

	const previewColors = createMemo(() => (previewMode() === "light" ? lightColors() : darkColors()));

	const previewStyle = createMemo(() => {
		const colors = previewColors();
		const toCssVarName = (key: keyof ThemeColors) => `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;

		const vars: Record<string, string> = {};

		(Object.entries(colors) as Array<[keyof ThemeColors, string]>).forEach(([key, value]) => {
			const cssVar = toCssVarName(key);
			vars[cssVar] = value;
			vars[`${cssVar}-hsl`] = `hsl(${value})`;
		});

		return vars;
	});

	const formatLabel = (key: string): string => {
		return key
			.replace(/([A-Z])/g, " $1")
			.replace(/^./, (str) => str.toUpperCase())
			.trim();
	};

	return (
		<div class="flex flex-col h-full gap-4 overflow-y-auto pr-2">
			<div class="space-y-4">
				<Show when={!props.initialTheme && availablePresets().length > 0}>
					<div class="space-y-2">
						<label for="theme-creator-preset" class="text-sm font-medium">
							Start from preset
						</label>
						<Select
							id="theme-creator-preset"
							value={selectedPreset()}
							onChange={(value) => {
								setSelectedPreset(value);
								applyPreset(value);
							}}
							options={presetOptions()}
							placeholder="Choose a preset"
							itemComponent={(itemProps) => (
								<SelectItem item={itemProps.item}>
									{availablePresets().find((preset) => preset.id === itemProps.item.rawValue)?.name}
								</SelectItem>
							)}
						>
							<SelectTrigger>
								<SelectValue<string>>
									{(state) => {
										const preset = availablePresets().find((item) => item.id === state.selectedOption());
										return preset ? preset.name : "Choose a preset";
									}}
								</SelectValue>
							</SelectTrigger>
							<SelectContent />
						</Select>
					</div>
				</Show>

				<TextFieldRoot>
					<TextFieldLabel>Theme Name</TextFieldLabel>
					<TextField value={name()} onInput={(e) => setName(e.currentTarget.value)} placeholder="My Custom Theme" />
				</TextFieldRoot>

				<div class="flex flex-col gap-1.5">
					<label for="theme-creator-description" class="text-sm font-medium">
						Description
					</label>
					<textarea
						id="theme-creator-description"
						value={description()}
						onInput={(e) => setDescription(e.currentTarget.value)}
						placeholder="A beautiful theme with custom colors"
						rows={2}
						class="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>
			</div>

			<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				<div class="space-y-4">
					<h3 class="text-lg font-semibold">Color Settings</h3>
					<For each={colorGroups}>
						{(group) => (
							<Card>
								<CardHeader class="pb-3">
									<CardTitle class="text-sm">{group.title}</CardTitle>
								</CardHeader>
								<CardContent class="space-y-4">
									<For each={group.keys}>
										{(key) => (
											<div class="grid gap-2">
												<div class="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-border/50 px-3 py-3">
													<ColorPicker
														label={`${formatLabel(key)} (Light)`}
														value={lightColors()[key]}
														onChange={(value) => updateLightColor(key, value)}
													/>
													<span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
														{lightColors()[key]}
													</span>
												</div>
												<div class="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-border/50 px-3 py-3">
													<ColorPicker
														label={`${formatLabel(key)} (Dark)`}
														value={darkColors()[key]}
														onChange={(value) => updateDarkColor(key, value)}
													/>
													<span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
														{darkColors()[key]}
													</span>
												</div>
											</div>
										)}
									</For>
								</CardContent>
							</Card>
						)}
					</For>
				</div>

				<div class="space-y-4 lg:sticky lg:top-4 lg:h-fit">
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold">Preview</h3>
						<div class="flex gap-2">
							<Button
								variant={previewMode() === "light" ? "default" : "outline"}
								size="sm"
								onClick={() => setPreviewMode("light")}
							>
								<div class="i-mdi-white-balance-sunny w-4 h-4 mr-2" />
								Light
							</Button>
							<Button
								variant={previewMode() === "dark" ? "default" : "outline"}
								size="sm"
								onClick={() => setPreviewMode("dark")}
							>
								<div class="i-mdi-moon-waning-crescent w-4 h-4 mr-2" />
								Dark
							</Button>
						</div>
					</div>

					<div
						class="rounded-2xl border border-border/60 shadow-sm"
						data-kb-theme={previewMode() === "dark" ? "dark" : undefined}
						style={{
							...Object.fromEntries(
								Object.entries(previewStyle()).map(([key, value]) =>
									key.endsWith("-hsl") ? [key.replace("-hsl", ""), value] : [key, `hsl(${value})`],
								),
							),
						}}
					>
						<div class="p-6 space-y-4">
							<div class="space-y-3">
								<h4 class="text-lg font-semibold">Typography</h4>
								<p class="text-sm text-muted-foreground" style={{ color: "var(--muted-foreground)" }}>
									This preview reflects your current theme configuration across common UI elements.
								</p>
							</div>

							<div class="space-y-2">
								<div class="font-semibold">Buttons</div>
								<div class="flex flex-wrap gap-2">
									<button
										type="button"
										class="px-3 py-2 rounded-md text-sm"
										style={{
											background: "var(--primary)",
											color: "var(--primary-foreground)",
										}}
									>
										Primary
									</button>
									<button
										type="button"
										class="px-3 py-2 rounded-md text-sm"
										style={{
											background: "var(--secondary)",
											color: "var(--secondary-foreground)",
										}}
									>
										Secondary
									</button>
									<button
										type="button"
										class="px-3 py-2 rounded-md text-sm border"
										style={{
											"border-color": "var(--border)",
										}}
									>
										Outline
									</button>
									<button
										type="button"
										class="px-3 py-2 rounded-md text-sm"
										style={{
											background: "var(--destructive)",
											color: "var(--destructive-foreground)",
										}}
									>
										Destructive
									</button>
								</div>
							</div>

							<div class="space-y-2">
								<div class="font-semibold">Badges</div>
								<div class="flex flex-wrap gap-2">
									<span
										class="px-2.5 py-1 text-xs font-semibold rounded-md"
										style={{
											background: "var(--primary)",
											color: "var(--primary-foreground)",
										}}
									>
										Default
									</span>
									<span
										class="px-2.5 py-1 text-xs font-semibold rounded-md"
										style={{
											background: "var(--secondary)",
											color: "var(--secondary-foreground)",
										}}
									>
										Secondary
									</span>
									<span
										class="px-2.5 py-1 text-xs font-semibold rounded-md border"
										style={{
											"border-color": "var(--border)",
										}}
									>
										Outline
									</span>
									<span
										class="px-2.5 py-1 text-xs font-semibold rounded-md"
										style={{
											background: "var(--destructive)",
											color: "var(--destructive-foreground)",
										}}
									>
										Destructive
									</span>
								</div>
							</div>

							<div class="space-y-2">
								<div class="font-semibold">Form Controls</div>
								<label class="text-sm" style={{ color: "var(--foreground)" }}>
									Input Field
									<input
										class="mt-1 w-full rounded-md border px-3 py-2 text-sm"
										value="Sample input"
										readOnly
										style={{
											"border-color": "var(--input)",
											background: "var(--background)",
											color: "var(--foreground)",
										}}
									/>
								</label>
								<div
									class="p-4 rounded-md"
									style={{
										background: "var(--muted)",
										color: "var(--muted-foreground)",
									}}
								>
									Muted surface with muted text
								</div>
								<div
									class="p-4 rounded-md"
									style={{
										background: "var(--accent)",
										color: "var(--accent-foreground)",
									}}
								>
									Accent surface with accent text
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="flex justify-end gap-2 pt-4 border-t">
				<Button variant="outline" onClick={props.onCancel}>
					Cancel
				</Button>
				<Button onClick={handleSave} disabled={!name().trim()}>
					<div class="i-mdi-content-save w-4 h-4 mr-2" />
					Save Theme
				</Button>
			</div>
		</div>
	);
};
