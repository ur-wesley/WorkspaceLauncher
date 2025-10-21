import type { ParentComponent } from "solid-js";
import { ActionStoreProvider } from "./action";
import { RunStoreProvider } from "./run";
import { SettingsProvider } from "./settings";
import { ThemeProvider } from "./theme";
import { ToolStoreProvider } from "./tool";
import { VariableStoreProvider } from "./variable";
import { WorkspaceProvider } from "./workspace";

export const StoreProvider: ParentComponent = (props) => {
	return (
		<SettingsProvider>
			<ThemeProvider>
				<ToolStoreProvider>
					<WorkspaceProvider>
						<ActionStoreProvider>
							<VariableStoreProvider>
								<RunStoreProvider>{props.children}</RunStoreProvider>
							</VariableStoreProvider>
						</ActionStoreProvider>
					</WorkspaceProvider>
				</ToolStoreProvider>
			</ThemeProvider>
		</SettingsProvider>
	);
};

export { useActionStore } from "./action";
export { useRunStore } from "./run";
export { useSettingsStore } from "./settings";
export { useThemeStore } from "./theme";
export { useToolStore } from "./tool";
export { useVariableStore } from "./variable";
export { useWorkspaceStore } from "./workspace";
