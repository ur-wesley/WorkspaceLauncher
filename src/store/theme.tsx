import { createContext, onMount, type ParentComponent, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import {
	activateTheme as activateThemeApi,
	createTheme as createThemeApi,
	deleteTheme as deleteThemeApi,
	listThemes as listThemesApi,
	updateTheme as updateThemeApi,
} from "@/libs/api";
import { applyThemeColors } from "@/libs/themeApplier";
import { showToast } from "@/libs/toast";
import type { NewTheme, Theme, ThemeColors } from "@/types/database";

interface ThemeStoreState {
	themes: Theme[];
	activeTheme: Theme | null;
	isLoading: boolean;
	error: string | null;
}

interface ThemeStoreActions {
	loadThemes: () => Promise<void>;
	createTheme: (theme: NewTheme) => Promise<boolean>;
	updateTheme: (id: number, theme: Partial<NewTheme>) => Promise<boolean>;
	deleteTheme: (id: number) => Promise<boolean>;
	activateTheme: (id: number) => Promise<boolean>;
	applyThemeColors: (lightColors: string, darkColors: string) => void;
}

type ThemeStore = [ThemeStoreState, ThemeStoreActions];

const ThemeStoreContext = createContext<ThemeStore>();

function parseThemeColors(json: string): ThemeColors {
	try {
		return JSON.parse(json) as ThemeColors;
	} catch (error) {
		console.error("Failed to parse theme colors", error);
		throw new Error("Invalid theme colors");
	}
}

export const ThemeProvider: ParentComponent = (props) => {
	const [store, setStore] = createStore<ThemeStoreState>({
		themes: [],
		activeTheme: null,
		isLoading: false,
		error: null,
	});

	const applyThemeFromThemeObject = (theme: Theme) => {
		try {
			const light = parseThemeColors(theme.light_colors);
			const dark = parseThemeColors(theme.dark_colors);
			applyThemeColors(light, dark);
		} catch (error) {
			console.error("Failed to apply theme colors", error);
			showToast({
				title: "Failed to apply theme",
				description: error instanceof Error ? error.message : "Unknown error",
				variant: "destructive",
			});
		}
	};

	const actions: ThemeStoreActions = {
		async loadThemes() {
			setStore({ isLoading: true, error: null });
			try {
				const result = await listThemesApi();
				if (result.isOk()) {
					const themes = result.value;
					const active = themes.find((theme) => theme.is_active) ?? null;
					setStore({ themes, activeTheme: active, isLoading: false });
					if (active) {
						applyThemeFromThemeObject(active);
					}
				} else {
					setStore({ error: result.error, isLoading: false });
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : `${error}`;
				setStore({ error: errorMessage, isLoading: false });
			}
		},

		async createTheme(theme: NewTheme) {
			try {
				const result = await createThemeApi(theme);
				if (result.isOk()) {
					await actions.loadThemes();
					showToast({
						title: "Theme created",
						description: `${theme.name} added successfully`,
					});
					return true;
				}
				showToast({
					title: "Failed to create theme",
					description: result.error,
					variant: "destructive",
				});
				return false;
			} catch (error) {
				showToast({
					title: "Failed to create theme",
					description: error instanceof Error ? error.message : `${error}`,
					variant: "destructive",
				});
				return false;
			}
		},

		async updateTheme(id: number, theme: Partial<NewTheme>) {
			try {
				const result = await updateThemeApi(id, theme);
				if (result.isOk()) {
					await actions.loadThemes();
					showToast({
						title: "Theme updated",
						description: "Theme changes saved",
					});
					return true;
				}
				showToast({
					title: "Failed to update theme",
					description: result.error,
					variant: "destructive",
				});
				return false;
			} catch (error) {
				showToast({
					title: "Failed to update theme",
					description: error instanceof Error ? error.message : `${error}`,
					variant: "destructive",
				});
				return false;
			}
		},

		async deleteTheme(id: number) {
			try {
				const result = await deleteThemeApi(id);
				if (result.isOk()) {
					await actions.loadThemes();
					showToast({
						title: "Theme deleted",
						description: "Theme removed successfully",
					});
					return true;
				}
				showToast({
					title: "Failed to delete theme",
					description: result.error,
					variant: "destructive",
				});
				return false;
			} catch (error) {
				showToast({
					title: "Failed to delete theme",
					description: error instanceof Error ? error.message : `${error}`,
					variant: "destructive",
				});
				return false;
			}
		},

		async activateTheme(id: number) {
			try {
				const result = await activateThemeApi(id);
				if (result.isOk()) {
					await actions.loadThemes();
					showToast({
						title: "Theme activated",
						description: "Theme applied successfully",
					});
					return true;
				}
				showToast({
					title: "Failed to activate theme",
					description: result.error,
					variant: "destructive",
				});
				return false;
			} catch (error) {
				showToast({
					title: "Failed to activate theme",
					description: error instanceof Error ? error.message : `${error}`,
					variant: "destructive",
				});
				return false;
			}
		},

		applyThemeColors(lightColors: string, darkColors: string) {
			try {
				const light = parseThemeColors(lightColors);
				const dark = parseThemeColors(darkColors);
				applyThemeColors(light, dark);
			} catch (error) {
				console.error("Failed to apply theme colors", error);
			}
		},
	};

	onMount(() => {
		void actions.loadThemes();
	});

	return <ThemeStoreContext.Provider value={[store, actions]}>{props.children}</ThemeStoreContext.Provider>;
};

export function useThemeStore(): ThemeStore {
	const context = useContext(ThemeStoreContext);
	if (!context) {
		throw new Error("useThemeStore must be used within a ThemeProvider");
	}
	return context;
}
