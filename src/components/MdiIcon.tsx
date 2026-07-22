import { loadIcon, renderSVG } from "@iconify/iconify";
import type { Component } from "solid-js";
import { createEffect, onCleanup } from "solid-js";
import { cn } from "@/libs/cn";
import { toMdiIconName } from "@/libs/mdiIcon";

interface MdiIconProps {
	icon?: string | null;
	fallback?: string;
	class?: string;
}

export const MdiIcon: Component<MdiIconProps> = (props) => {
	let ref: HTMLSpanElement | undefined;

	createEffect(() => {
		const el = ref;
		if (!el) {
			return;
		}

		const name = toMdiIconName(props.icon, props.fallback);
		let cancelled = false;

		void loadIcon(name).then(() => {
			if (cancelled) {
				return;
			}
			el.replaceChildren();
			const svg = renderSVG(name);
			if (svg) {
				el.appendChild(svg);
			}
		});

		onCleanup(() => {
			cancelled = true;
		});
	});

	return (
		<span
			ref={ref}
			class={cn(
				"inline-flex shrink-0 items-center justify-center",
				props.class,
			)}
		/>
	);
};
