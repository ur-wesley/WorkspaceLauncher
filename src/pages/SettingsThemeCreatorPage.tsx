import { A, useNavigate, useSearchParams } from "@solidjs/router";
import type { Component } from "solid-js";
import { createSignal, onMount } from "solid-js";
import { ThemeCreator } from "@/components/ThemeCreator";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/store/theme";
import type { ThemeColors } from "@/types/database";

export const SettingsThemeCreatorPage: Component = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const [themeStore, themeActions] = useThemeStore();
	const [initialTheme, setInitialTheme] = createSignal<
		| {
				name: string;
				description?: string;
				lightColors: ThemeColors;
				darkColors: ThemeColors;
		  }
		| undefined
	>();

	onMount(() => {
		const themeId = searchParams.id;
		if (themeId) {
			const theme = themeStore.themes.find((t) => t.id === Number(themeId));
			if (theme) {
				setInitialTheme({
					name: theme.name,
					description: theme.description || undefined,
					lightColors: JSON.parse(theme.light_colors),
					darkColors: JSON.parse(theme.dark_colors),
				});
			}
		}
	});

	const handleSave = async (theme: {
		name: string;
		description?: string;
		lightColors: ThemeColors;
		darkColors: ThemeColors;
	}) => {
		const themeId = searchParams.id;

		if (themeId) {
			await themeActions.updateTheme(Number(themeId), {
				name: theme.name,
				description: theme.description,
				light_colors: JSON.stringify(theme.lightColors),
				dark_colors: JSON.stringify(theme.darkColors),
			});
		} else {
			await themeActions.createTheme({
				name: theme.name,
				description: theme.description,
				light_colors: JSON.stringify(theme.lightColors),
				dark_colors: JSON.stringify(theme.darkColors),
			});
		}

		navigate("/settings?tab=themes");
	};

	const handleCancel = () => {
		navigate("/settings?tab=themes");
	};

	return (
		<div class="h-full w-full flex flex-col">
			<div class="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8 border-b">
				<A href="/settings?tab=themes">
					<Button variant="outline">
						<div class="i-mdi-arrow-left w-4 h-4 mr-2" />
						Back
					</Button>
				</A>
				<div class="text-right">
					<h1 class="text-2xl font-bold">{searchParams.id ? "Edit Theme" : "Create Theme"}</h1>
					<p class="text-sm text-muted-foreground">Customize colors for light and dark modes</p>
				</div>
			</div>

			<div class="flex-1 overflow-y-auto px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-4">
				<ThemeCreator
					initialTheme={initialTheme()}
					onSave={handleSave}
					onCancel={handleCancel}
					presets={themeStore.themes.map((theme) => ({
						id: theme.id.toString(),
						name: theme.name,
						description: theme.description || undefined,
						lightColors: JSON.parse(theme.light_colors),
						darkColors: JSON.parse(theme.dark_colors),
					}))}
				/>
			</div>
		</div>
	);
};
