import type { Component } from "solid-js";
import { createSignal, onMount } from "solid-js";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Switch, SwitchControl, SwitchThumb } from "@/components/ui/switch";

export const AppearanceSettings: Component = () => {
	const [darkMode, setDarkMode] = createSignal(false);

	onMount(() => {
		const isDark =
			document.documentElement.getAttribute("data-kb-theme") === "dark";
		setDarkMode(isDark);
	});

	const toggleDarkMode = () => {
		const newMode = !darkMode();
		setDarkMode(newMode);
		document.documentElement.setAttribute(
			"data-kb-theme",
			newMode ? "dark" : "light",
		);
	};

	return (
		<div class="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<div class="i-mdi-theme-light-dark w-5 h-5" />
						Theme
					</CardTitle>
					<CardDescription>
						Customize the application appearance
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="flex items-center justify-between">
						<div class="space-y-1">
							<p class="text-sm font-medium">Dark Mode</p>
							<p class="text-sm text-muted-foreground">
								Toggle between light and dark mode
							</p>
						</div>
						<Switch checked={darkMode()} onChange={toggleDarkMode}>
							<SwitchControl>
								<SwitchThumb />
							</SwitchControl>
						</Switch>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
