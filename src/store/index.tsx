import type { ParentComponent } from "solid-js";
import { ActionStoreProvider } from "./action";
import { RunStoreProvider } from "./run";
import { SettingsProvider } from "./settings";
import { ToolStoreProvider } from "./tool";
import { VariableStoreProvider } from "./variable";
import { WorkspaceProvider } from "./workspace";

export const StoreProvider: ParentComponent = (props) => {
	return (
		<SettingsProvider>
			<ToolStoreProvider>
				<WorkspaceProvider>
					<ActionStoreProvider>
						<VariableStoreProvider>
							<RunStoreProvider>{props.children}</RunStoreProvider>
						</VariableStoreProvider>
					</ActionStoreProvider>
				</WorkspaceProvider>
			</ToolStoreProvider>
		</SettingsProvider>
	);
};

export { useActionStore } from "./action";
export { useRunStore } from "./run";
export { useSettingsStore } from "./settings";
export { useToolStore } from "./tool";
export { useVariableStore } from "./variable";
export { useWorkspaceStore } from "./workspace";
