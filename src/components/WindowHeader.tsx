import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Component } from "solid-js";
import { createSignal, onCleanup, onMount } from "solid-js";
import { Button } from "@/components/ui/button";
import { cn } from "@/libs/cn";

interface WindowHeaderProps {
	sidebarCollapsed?: boolean;
	onToggleSidebar?: () => void;
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
			class="h-10 flex items-center border-b border-border bg-background select-none shrink-0"
			data-tauri-drag-region
		>
			<Button
				variant="ghost"
				size="sm"
				class="h-8 w-8 ml-1 p-0 flex items-center justify-center hover:bg-accent hover:text-accent-foreground shrink-0"
				onClick={props.onToggleSidebar}
				title={props.sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
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
				class="flex items-center gap-2 pl-1 h-full shrink-0"
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

			<div class="flex-1" data-tauri-drag-region />

			<div class="flex h-full items-center shrink-0">
				<Button
					variant="ghost"
					size="sm"
					class="h-7 w-9 rounded-sm p-0 flex items-center justify-center hover:bg-accent hover:text-accent-foreground"
					onClick={() => appWindow.minimize()}
					title="Minimize"
				>
					<div class="w-4 h-4 i-mdi-minus" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					class="h-7 w-9 rounded-sm p-0 flex items-center justify-center hover:bg-accent hover:text-accent-foreground"
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
					size="sm"
					class="h-7 w-9 rounded-sm p-0 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground"
					onClick={() => appWindow.close()}
					title="Close"
				>
					<div class="w-4 h-4 i-mdi-close" />
				</Button>
			</div>
		</div>
	);
};
