import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Component } from "solid-js";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import { cn } from "@/libs/cn";
import { hotkeyTitle } from "@/libs/hotkeys";

interface WindowHeaderProps {
	sidebarCollapsed?: boolean;
	onToggleSidebar?: () => void;
	centerTitle?: string;
}

export const WindowHeader: Component<WindowHeaderProps> = (props) => {
	const appWindow = getCurrentWindow();
	const [isMaximized, setIsMaximized] = createSignal(false);

	onMount(async () => {
		setIsMaximized(await appWindow.isMaximized());

		const unlisten = await appWindow.onResized(async () => {
			setIsMaximized(await appWindow.isMaximized());
		});

		onCleanup(() => {
			unlisten();
		});
	});

	return (
		<div
			class="grid h-10 shrink-0 select-none border-b border-border bg-background/75 grid-cols-[auto_1fr_auto] items-center"
			data-tauri-drag-region
		>
			<div class="flex h-full shrink-0 items-center">
				<Button
					variant="ghost"
					class="h-full w-10 shrink-0 rounded-none p-0 hover:bg-accent hover:text-accent-foreground"
					onClick={props.onToggleSidebar}
					title={hotkeyTitle(
						props.sidebarCollapsed ? "Show sidebar" : "Hide sidebar",
						"toggleSidebar",
					)}
				>
					<div
						class={cn(
							"w-4 h-4",
							props.sidebarCollapsed
								? "i-mdi-chevron-double-right"
								: "i-mdi-chevron-double-left",
						)}
					/>
				</Button>

				<div
					class="flex h-full shrink-0 items-center gap-2 pl-2"
					data-tauri-drag-region
				>
					<img src="/icon.png" alt="" class="w-5 h-5 shrink-0" />
					<span
						class="text-sm font-medium text-foreground whitespace-nowrap"
						data-tauri-drag-region
					>
						Workspace Launcher
					</span>
				</div>
			</div>

			<div
				class="flex h-full min-w-0 items-center justify-center px-4"
				data-tauri-drag-region
			>
				<Show when={props.centerTitle}>
					<span
						class="text-sm font-medium text-foreground truncate text-center"
						data-tauri-drag-region
					>
						{props.centerTitle}
					</span>
				</Show>
			</div>

			<div class="flex h-full shrink-0">
				<Button
					variant="ghost"
					class="h-full w-11 rounded-none p-0 hover:bg-accent hover:text-accent-foreground"
					onClick={() => appWindow.minimize()}
					title="Minimize"
				>
					<div class="w-4 h-4 i-mdi-minus" />
				</Button>
				<Button
					variant="ghost"
					class="h-full w-11 rounded-none p-0 hover:bg-accent hover:text-accent-foreground"
					onClick={() => appWindow.toggleMaximize()}
					title={isMaximized() ? "Restore" : "Maximize"}
				>
					<div
						class={cn(
							"w-4 h-4",
							isMaximized() ? "i-mdi-window-restore" : "i-mdi-window-maximize",
						)}
					/>
				</Button>
				<Button
					variant="ghost"
					class="h-full w-11 rounded-none p-0 hover:bg-destructive hover:text-destructive-foreground"
					onClick={() => appWindow.close()}
					title="Close"
				>
					<div class="w-4 h-4 i-mdi-close" />
				</Button>
			</div>
		</div>
	);
};
