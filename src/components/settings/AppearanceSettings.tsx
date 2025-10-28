import type { Component } from "solid-js";
import { createSignal, onMount } from "solid-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch, SwitchControl, SwitchThumb } from "@/components/ui/switch";
import { useThemeStore } from "@/store/theme";

export const AppearanceSettings: Component = () => {
	const [themeStore, themeActions] = useThemeStore();
	const [darkMode, setDarkMode] = createSignal(false);

	onMount(() => {
		const isDark = document.documentElement.getAttribute("data-kb-theme") === "dark";
		setDarkMode(isDark);
	});

	const toggleDarkMode = () => {
		const newMode = !darkMode();
		setDarkMode(newMode);
		document.documentElement.setAttribute("data-kb-theme", newMode ? "dark" : "light");
	};

	const handleThemeChange = (value: string) => {
		const themeId = Number(value);
		if (Number.isNaN(themeId)) return;
		themeActions.activateTheme(themeId);
	};

	return (
		<div class="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<div class="i-mdi-theme-light-dark w-5 h-5" />
						Theme
					</CardTitle>
					<CardDescription>Customize the application appearance</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="flex items-center justify-between">
						<div class="space-y-1">
							<p class="text-sm font-medium">Dark Mode</p>
							<p class="text-sm text-muted-foreground">Toggle between light and dark mode</p>
						</div>
						<Switch checked={darkMode()} onChange={toggleDarkMode}>
							<SwitchControl>
								<SwitchThumb />
							</SwitchControl>
						</Switch>
					</div>

					<Separator />

					<div class="space-y-2">
						<label for="active-theme-select" class="text-sm font-medium">
							Active Theme
						</label>
						<Select
							id="active-theme-select"
							value={themeStore.activeTheme?.id.toString()}
							onChange={handleThemeChange}
							options={themeStore.themes.map((t) => t.id.toString())}
							placeholder="Select a theme"
							itemComponent={(props) => (
								<SelectItem item={props.item}>
									{themeStore.themes.find((t) => t.id.toString() === props.item.rawValue)?.name}
								</SelectItem>
							)}
						>
							<SelectTrigger>
								<SelectValue<string>>
									{(state) =>
										themeStore.themes.find((t) => t.id.toString() === state.selectedOption())?.name || "Select theme"
									}
								</SelectValue>
							</SelectTrigger>
							<SelectContent />
						</Select>
						<p class="text-xs text-muted-foreground">{themeStore.activeTheme?.description || "No description"}</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
