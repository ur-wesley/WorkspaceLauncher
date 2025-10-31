import type { Component } from "solid-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch, SwitchControl, SwitchThumb } from "@/components/ui/switch";
import { useSettingsStore } from "@/store/settings";
import { useThemeStore } from "@/store/theme";
import { SETTING_KEYS } from "@/types/database";

export const AppearanceSettings: Component = () => {
	const [themeStore, themeActions] = useThemeStore();
	const { actions: settingsActions } = useSettingsStore();

	const handleThemeChange = (value: string | null) => {
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
						<Switch
							checked={settingsActions.getSettingWithDefault(SETTING_KEYS.APPEARANCE_THEME_MODE, "light") === "dark"}
							onChange={(val) => {
								settingsActions.setDarkMode(val);
							}}
						>
							<SwitchControl>
								<SwitchThumb />
							</SwitchControl>
						</Switch>
					</div>

					<Separator />

					<div class="space-y-2">
						<p id="active-theme-label" class="text-sm font-medium">
							Active Theme
						</p>
						<Select
							value={themeStore.activeTheme ? themeStore.activeTheme.id.toString() : null}
							onChange={handleThemeChange}
							options={themeStore.themes.map((t) => t.id.toString())}
							placeholder="Select a theme"
							itemComponent={(props) => (
								<SelectItem item={props.item}>
									{themeStore.themes.find((t) => t.id.toString() === props.item.rawValue)?.name}
								</SelectItem>
							)}
						>
							<SelectTrigger id="active-theme-trigger" aria-labelledby="active-theme-label">
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
