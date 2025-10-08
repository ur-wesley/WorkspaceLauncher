import { createContext, type ParentComponent, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import * as api from "@/libs/api";
import { showToast } from "@/libs/toast";
import type { SettingKey } from "@/types/database";

interface SettingsStore {
	settings: Record<string, string>;
	loading: boolean;
}

interface SettingsActions {
	loadSettings: () => Promise<void>;
	getSetting: (key: SettingKey) => string | undefined;
	setSetting: (key: SettingKey, value: string) => Promise<boolean>;
	getSettingWithDefault: (key: SettingKey, defaultValue: string) => string;
}

interface SettingsContextValue {
	store: SettingsStore;
	actions: SettingsActions;
}

const SettingsContext = createContext<SettingsContextValue>();

export const SettingsProvider: ParentComponent = (props) => {
	const [store, setStore] = createStore<SettingsStore>({
		settings: {},
		loading: false,
	});

	const actions: SettingsActions = {
		async loadSettings() {
			setStore("loading", true);

			const result = await api.listSettings();

			if (result.isOk()) {
				const settingsMap: Record<string, string> = {};
				for (const setting of result.value) {
					settingsMap[setting.key] = setting.value;
				}
				setStore("settings", settingsMap);
			} else {
				showToast({
					title: "Error",
					description: `Failed to load settings: ${result.error.message}`,
					variant: "destructive",
				});
			}

			setStore("loading", false);
		},

		getSetting(key: SettingKey) {
			return store.settings[key];
		},

		async setSetting(key: SettingKey, value: string) {
			const result = await api.setSetting(key, value);

			if (result.isOk()) {
				setStore("settings", key, value);
				showToast({
					title: "Success",
					description: "Setting updated successfully",
				});
				return true;
			} else {
				showToast({
					title: "Error",
					description: `Failed to update setting: ${result.error.message}`,
					variant: "destructive",
				});
				return false;
			}
		},

		getSettingWithDefault(key: SettingKey, defaultValue: string) {
			return store.settings[key] ?? defaultValue;
		},
	};

	const contextValue: SettingsContextValue = {
		store,
		actions,
	};

	return <SettingsContext.Provider value={contextValue}>{props.children}</SettingsContext.Provider>;
};

export function useSettingsStore() {
	const context = useContext(SettingsContext);
	if (!context) {
		throw new Error("useSettingsStore must be used within SettingsProvider");
	}
	return context;
}
