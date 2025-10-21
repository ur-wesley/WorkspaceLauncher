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
			Coloris({
				el: `#${inputId}`,
				theme: "polaroid",
				themeMode: "dark",
				alpha: false,
				format: "hsl",
				formatToggle: false,
				swatches: [
					"hsl(0, 0%, 0%)",
					"hsl(0, 0%, 100%)",
					"hsl(0, 0%, 50%)",
					"hsl(217, 92%, 76%)",
					"hsl(347, 87%, 63%)",
					"hsl(189, 71%, 73%)",
					"hsl(220, 91%, 71%)",
				],
			});
			inputRef.value = formatValueForInput();
		}
	});

	return (
		<div class="flex flex-col gap-1.5">
			{props.label && (
				<label for={inputId} class="text-sm font-medium text-foreground">
					{props.label}
				</label>
			)}
			<div class="flex items-center gap-2">
				<input
					ref={inputRef}
					id={inputId}
					type="text"
					value={formatValueForInput()}
					data-coloris
					class="h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
					style={{ color: "var(--foreground)" }}
				/>
				<div
					class="h-9 w-12 rounded-md border border-input"
					style={{ background: `hsl(${props.value})` }}
					aria-hidden="true"
				/>
			</div>
		</div>
	);
};
