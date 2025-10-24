import type { Component } from "solid-js";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { defaultTheme } from "@/libs/themePresets";
import type { ThemeColors } from "@/types/database";
import { ColorPicker } from "./ColorPicker";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectDescription, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch, SwitchControl, SwitchDescription, SwitchThumb } from "./ui/switch";
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
											<div class="space-y-2">
												<label class="text-sm font-medium text-foreground" for={`${key}-light`}>
													{formatLabel(key)}
												</label>
												<div class="flex items-center gap-3">
													<div class="w-1/2">
														<ColorPicker
															value={lightColors()[key]}
															onChange={(value) => {
																updateLightColor(key, value);
																setPreviewMode("light");
															}}
														/>
														<span class="text-xs text-muted-foreground mt-1 block">Light</span>
													</div>
													<div class="w-1/2">
														<ColorPicker
															value={darkColors()[key]}
															onChange={(value) => {
																updateDarkColor(key, value);
																setPreviewMode("dark");
															}}
														/>
														<span class="text-xs text-muted-foreground mt-1 block">Dark</span>
													</div>
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
						<div class="p-6 flex flex-col gap-6">
							{/* Typography Section */}
							<div class="flex flex-col gap-3">
								<h4 class="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
									Typography
								</h4>
								<p class="text-sm" style={{ color: "var(--muted-foreground)" }}>
									This preview reflects your current theme configuration across common UI elements.
								</p>
								<div class="flex flex-col gap-2">
									<h5 class="text-base font-medium" style={{ color: "var(--foreground)" }}>
										Heading
									</h5>
									<p class="text-sm" style={{ color: "var(--foreground)" }}>
										Regular text content
									</p>
									<p class="text-xs" style={{ color: "var(--muted-foreground)" }}>
										Small muted text
									</p>
								</div>
							</div>

							{/* Buttons Section */}
							<div class="flex flex-col gap-3">
								<div class="font-semibold" style={{ color: "var(--foreground)" }}>
									Buttons
								</div>
								<div class="flex flex-wrap gap-3">
									<Button onClick={() => console.log("Primary button clicked")}>Primary</Button>
									<Button variant="secondary" onClick={() => console.log("Secondary button clicked")}>
										Secondary
									</Button>
									<Button variant="outline" onClick={() => console.log("Outline button clicked")}>
										Outline
									</Button>
									<Button variant="destructive" onClick={() => console.log("Destructive button clicked")}>
										Destructive
									</Button>
								</div>
							</div>

							{/* Badges Section */}
							<div class="flex flex-col gap-3">
								<div class="font-semibold" style={{ color: "var(--foreground)" }}>
									Badges
								</div>
								<div class="flex flex-wrap gap-3">
									<span
										class="px-3 py-1 text-xs font-semibold rounded-md"
										style={{
											background: "var(--primary)",
											color: "var(--primary-foreground)",
										}}
									>
										Primary
									</span>
									<span
										class="px-3 py-1 text-xs font-semibold rounded-md"
										style={{
											background: "var(--secondary)",
											color: "var(--secondary-foreground)",
										}}
									>
										Secondary
									</span>
									<span
										class="px-3 py-1 text-xs font-semibold rounded-md border"
										style={{
											"border-color": "var(--border)",
											color: "var(--foreground)",
											background: "var(--background)",
										}}
									>
										Outline
									</span>
									<span
										class="px-3 py-1 text-xs font-semibold rounded-md"
										style={{
											background: "var(--destructive)",
											color: "var(--destructive-foreground)",
										}}
									>
										Destructive
									</span>
								</div>
							</div>

							{/* Form Controls Section */}
							<div class="flex flex-col gap-3">
								<div class="font-semibold" style={{ color: "var(--foreground)" }}>
									Form Controls
								</div>
								<div class="flex flex-col gap-3">
									<TextFieldRoot>
										<TextFieldLabel>Input Field</TextFieldLabel>
										<TextField
											value="Sample input text"
											placeholder="Type something..."
											onInput={(e) => console.log("Input changed:", e.currentTarget.value)}
										/>
									</TextFieldRoot>
									<Select
										value="option1"
										onChange={(value) => console.log("Select changed:", value)}
										options={["option1", "option2", "option3"]}
										placeholder="Choose an option"
										itemComponent={(props) => (
											<SelectItem item={props.item}>
												{props.item.rawValue === "option1"
													? "Option 1"
													: props.item.rawValue === "option2"
														? "Option 2"
														: "Option 3"}
											</SelectItem>
										)}
									>
										<SelectTrigger>
											<SelectValue<string>>
												{(state) => {
													const option = state.selectedOption();
													return option === "option1"
														? "Option 1"
														: option === "option2"
															? "Option 2"
															: option === "option3"
																? "Option 3"
																: "Choose an option";
												}}
											</SelectValue>
										</SelectTrigger>
										<SelectContent />
										<SelectDescription class="text-sm" style={{ color: "var(--foreground)" }}>
											Select Option
										</SelectDescription>
									</Select>
									<div class="flex items-center gap-4">
										<Switch checked={true} onChange={(checked) => console.log("Toggle 1 changed:", checked)}>
											<SwitchControl>
												<SwitchThumb />
											</SwitchControl>
											<SwitchDescription class="text-sm" style={{ color: "var(--foreground)" }}>
												Toggle Switch
											</SwitchDescription>
										</Switch>
										<Switch checked={false} onChange={(checked) => console.log("Toggle 2 changed:", checked)}>
											<SwitchControl>
												<SwitchThumb />
											</SwitchControl>
											<SwitchDescription class="text-sm" style={{ color: "var(--foreground)" }}>
												Toggle Off
											</SwitchDescription>
										</Switch>
									</div>
								</div>
							</div>

							{/* Surface Colors Section */}
							<div class="flex flex-col gap-3">
								<div class="font-semibold" style={{ color: "var(--foreground)" }}>
									Surface Colors
								</div>
								<div class="flex flex-col gap-3">
									<div
										class="p-4 rounded-md border"
										style={{
											background: "var(--card)",
											color: "var(--card-foreground)",
											"border-color": "var(--border)",
										}}
									>
										<div class="font-medium mb-1">Card Surface</div>
										<div class="text-sm" style={{ color: "var(--muted-foreground)" }}>
											Card content with card foreground text
										</div>
									</div>
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
									<div
										class="p-4 rounded-md border"
										style={{
											background: "var(--popover)",
											color: "var(--popover-foreground)",
											"border-color": "var(--border)",
										}}
									>
										<div class="font-medium mb-1">Popover Surface</div>
										<div class="text-sm" style={{ color: "var(--muted-foreground)" }}>
											Popover content with popover foreground text
										</div>
									</div>
								</div>
							</div>

							{/* Borders and Ring Section */}
							<div class="flex flex-col gap-3">
								<div class="font-semibold" style={{ color: "var(--foreground)" }}>
									Borders & Focus
								</div>
								<div class="flex flex-col gap-3">
									<div
										class="p-3 rounded-md border-2"
										style={{
											"border-color": "var(--border)",
											background: "var(--background)",
											color: "var(--foreground)",
										}}
									>
										Border example
									</div>
									<div
										class="p-3 rounded-md border-2 focus-within:ring-2"
										style={{
											"border-color": "var(--ring)",
											background: "var(--background)",
											color: "var(--foreground)",
										}}
									>
										Focus ring example
									</div>
								</div>
							</div>
						</div>
					</div>

					<div class="flex justify-end gap-2 pt-4 border-t">
						<Button variant="outline" onClick={props.onCancel}>
							Cancel
						</Button>
						<Button onClick={handleSave} disabled={!name().trim()} data-theme-save-button>
							<div class="i-mdi-content-save w-4 h-4 mr-2" />
							Save Theme
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};
