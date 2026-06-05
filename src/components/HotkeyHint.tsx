import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import { cn } from "@/libs/cn";
import {
	formatHotkeyKey,
	type HotkeyId,
	useHotkeyBindings,
} from "@/libs/hotkeys";

interface HotkeyHintProps {
	id: HotkeyId;
	class?: string;
}

export const HotkeyHint: Component<HotkeyHintProps> = (props) => {
	const bindings = useHotkeyBindings();
	const keys = () => bindings()[props.id]?.keys ?? [];

	return (
		<Show when={keys().length > 0}>
			<span
				class={cn(
					"inline-flex items-center gap-0.5 text-muted-foreground",
					props.class,
				)}
			>
				<For each={keys()}>
					{(key) => (
						<kbd class="rounded bg-muted px-1 py-0.5 font-mono text-[10px] leading-none">
							{formatHotkeyKey(key)}
						</kbd>
					)}
				</For>
			</span>
		</Show>
	);
};
