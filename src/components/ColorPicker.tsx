import Coloris from "@melloware/coloris";
import type { Component } from "solid-js";
import { createEffect, createUniqueId, onCleanup, onMount } from "solid-js";
import "@melloware/coloris/dist/coloris.css";

let colorisInitialized = false;

interface ColorPickerProps {
	value: string;
	onChange: (value: string) => void;
	label?: string;
}

export const ColorPicker: Component<ColorPickerProps> = (props) => {
	const inputId = createUniqueId();
	let inputRef: HTMLInputElement | undefined;

	onMount(() => {
		if (!colorisInitialized) {
			setTimeout(() => {
				Coloris.init();
				colorisInitialized = true;
			}, 0);
		}

		if (inputRef) {
			inputRef.addEventListener("input", handleInput);
		}
	});

	onCleanup(() => {
		if (inputRef) {
			inputRef.removeEventListener("input", handleInput);
		}
	});

	const handleInput = (e: Event) => {
		const target = e.target as HTMLInputElement;
		const hslValue = target.value;

		const match = hslValue.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
		if (match) {
			const [, h, s, l] = match;
			props.onChange(`${h} ${s}% ${l}%`);
		}
	};

	const formatValueForInput = () => {
		const parts = props.value.split(" ");
		if (parts.length === 3) {
			return `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
		}
		return "hsl(0, 0%, 50%)";
	};

	createEffect(() => {
		if (inputRef) {
			setTimeout(() => {
				Coloris({
					el: `#${inputId}`,
					theme: "polaroid",
					themeMode: "dark",
					alpha: false,
					format: "hsl",
					formatToggle: false,
					closeLabel: "Close",
					clearLabel: "Clear",
					closeButton: true,
				});
				inputRef.value = formatValueForInput();
			}, 0);
		}
	});

	return (
		<input
			ref={inputRef}
			id={inputId}
			type="text"
			value={formatValueForInput()}
			data-coloris
			class="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground!"
		/>
	);
};
