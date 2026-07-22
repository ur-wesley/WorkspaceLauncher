import type { ParentComponent } from "solid-js";
import { ActionStoreProvider } from "./action";
import { GlobalVariableStoreProvider } from "./globalVariable";
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
							<GlobalVariableStoreProvider>
								<RunStoreProvider>{props.children}</RunStoreProvider>
							</GlobalVariableStoreProvider>
						</VariableStoreProvider>
					</ActionStoreProvider>
				</WorkspaceProvider>
			</ToolStoreProvider>
		</SettingsProvider>
	);
};

export { useActionStore } from "./action";
export { useGlobalVariableStore } from "./globalVariable";
export { useRunStore } from "./run";
export { useSettingsStore } from "./settings";
export { useToolStore } from "./tool";
export { useVariableStore } from "./variable";
export { useWorkspaceStore } from "./workspace";
