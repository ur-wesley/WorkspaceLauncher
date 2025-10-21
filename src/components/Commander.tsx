import { useLocation, useNavigate } from "@solidjs/router";
import { createMemo, For, Show } from "solid-js";
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@/components/ui/command";
import { type HotkeyId, loadBindings } from "@/libs/hotkeys";
import { useUI } from "@/store/ui";
import { useWorkspaceStore } from "@/store/workspace";

export function Commander() {
	const navigate = useNavigate();
	const ui = useUI();
	const workspaceCtx = useWorkspaceStore();
	const location = useLocation();

	const inWorkspaceDetail = createMemo(() => /^\/w\//.test(location.pathname));

	const bindings = () => loadBindings();
	const formatKey = (k: string) => {
		if (k === "Control") return "Ctrl";
		if (k === "Meta") return "Cmd";
		if (k.length === 1) return k.toUpperCase();
		return k;
	};
	const shortcut = (id: HotkeyId) => bindings()[id]?.keys.map(formatKey).join("+") || "";

	const workspaces = () => workspaceCtx.store.workspaces;

	const close = () => ui.actions.closeCommander();

	return (
		<CommandDialog
			open={ui.store.commanderOpen}
			onOpenChange={(v) => (v ? ui.actions.openCommander() : ui.actions.closeCommander())}
		>
			<Command>
				<CommandInput placeholder="Type a command or search..." />
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>

					<CommandGroup heading="Navigation">
						<CommandItem
							onSelect={() => {
								navigate("/");
								close();
							}}
						>
							<div class="i-mdi-view-dashboard-outline w-4 h-4 mr-2" /> Dashboard
							<CommandShortcut>{shortcut("navigateDashboard")}</CommandShortcut>
						</CommandItem>
						<CommandItem
							onSelect={() => {
								navigate("/settings");
								close();
							}}
						>
							<div class="i-mdi-cog w-4 h-4 mr-2" /> Settings
							<CommandShortcut>{shortcut("navigateSettings")}</CommandShortcut>
						</CommandItem>
						<CommandItem
							onSelect={() => {
								navigate("/settings/hotkeys");
								close();
							}}
						>
							<div class="i-mdi-keyboard-outline w-4 h-4 mr-2" /> Hotkeys
						</CommandItem>
					</CommandGroup>

					<CommandSeparator />

					<CommandGroup heading="Workspaces">
						<For each={workspaces()}>
							{(w) => (
								<CommandItem
									onSelect={() => {
										navigate(`/w/${w.id}`);
										close();
									}}
								>
									<div class="i-mdi-briefcase-outline w-4 h-4 mr-2" /> {w.name}
								</CommandItem>
							)}
						</For>
						<CommandItem
							onSelect={() => {
								ui.actions.openWorkspaceCreate();
								close();
							}}
						>
							<div class="i-mdi-plus w-4 h-4 mr-2" /> Create Workspace
							<CommandShortcut>{shortcut("createWorkspace")}</CommandShortcut>
						</CommandItem>
					</CommandGroup>

					<Show when={inWorkspaceDetail()}>
						<CommandSeparator />
						<CommandGroup heading="Current Workspace">
							<CommandItem
								onSelect={() => {
									const id = ui.store.currentWorkspaceId;
									if (id != null) ui.actions.openActionCreate(id);
									close();
								}}
							>
								<div class="i-mdi-plus-circle-outline w-4 h-4 mr-2" /> Create Action
								<CommandShortcut>{shortcut("createAction")}</CommandShortcut>
							</CommandItem>
							<CommandItem
								onSelect={() => {
									const id = ui.store.currentWorkspaceId;
									if (id != null) {
										ui.actions.requestRunAll();
										close();
									}
								}}
							>
								<div class="i-mdi-play w-4 h-4 mr-2" /> Run All Actions
								<CommandShortcut>{shortcut("runAll")}</CommandShortcut>
							</CommandItem>
							<CommandItem
								onSelect={() => {
									const id = ui.store.currentWorkspaceId;
									if (id != null) ui.actions.openVariableCreate(id);
									close();
								}}
							>
								<div class="i-mdi-plus-box-outline w-4 h-4 mr-2" /> Create Variable
								<CommandShortcut>{shortcut("createVariable")}</CommandShortcut>
							</CommandItem>
						</CommandGroup>
					</Show>
				</CommandList>
			</Command>
		</CommandDialog>
	);
}
