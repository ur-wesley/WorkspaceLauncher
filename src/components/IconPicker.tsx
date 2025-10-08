import type { Component, JSX } from "solid-js";
import { createMemo, createSignal, For, Show } from "solid-js";
import { cn } from "@/libs/cn";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { TextField, TextFieldRoot } from "./ui/textfield";

// Import MDI icon metadata for search
// This is a lazy import - only loads when the picker is opened
let iconNames: string[] = [];
let iconsLoaded = false;

async function loadIconNames() {
	if (iconsLoaded) return iconNames;

	try {
		const mdiIcons = await import("@iconify-json/mdi/icons.json");
		iconNames = Object.keys(mdiIcons.icons);
		iconsLoaded = true;
		return iconNames;
	} catch (error) {
		console.error("Failed to load MDI icons:", error);
		return [];
	}
}

interface IconPickerProps {
	value?: string;
	onChange: (iconClass: string) => void;
	trigger?: JSX.Element;
}

export const IconPicker: Component<IconPickerProps> = (props) => {
	const [open, setOpen] = createSignal(false);
	const [searchQuery, setSearchQuery] = createSignal("");
	const [allIcons, setAllIcons] = createSignal<string[]>([]);
	const [loading, setLoading] = createSignal(false);

	const currentIconName = createMemo(() => {
		if (!props.value) return "";
		return props.value.replace(/^i-mdi-/, "");
	});

	const handleOpenChange = async (isOpen: boolean) => {
		setOpen(isOpen);
		if (isOpen && allIcons().length === 0) {
			setLoading(true);
			const icons = await loadIconNames();
			setAllIcons(icons);
			setLoading(false);
		}
	};

	const fuzzyMatch = (str: string, pattern: string): number => {
		const strLower = str.toLowerCase();
		const patternLower = pattern.toLowerCase();

		if (strLower === patternLower) return 1000;
		if (strLower.startsWith(patternLower)) return 500;
		if (strLower.includes(patternLower)) return 100;

		let score = 0;
		let strIndex = 0;

		for (const char of patternLower) {
			const foundIndex = strLower.indexOf(char, strIndex);
			if (foundIndex === -1) return 0;
			score += 1;
			strIndex = foundIndex + 1;
		}

		return score;
	};

	const filteredIcons = createMemo(() => {
		const query = searchQuery().toLowerCase().trim();
		if (!query) {
			return allIcons().slice(0, 120);
		}

		const matches = allIcons()
			.map((icon) => ({ icon, score: fuzzyMatch(icon, query) }))
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, 200)
			.map((item) => item.icon);

		return matches;
	});

	const handleSelectIcon = (iconName: string) => {
		const iconClass = `i-mdi-${iconName}`;
		props.onChange(iconClass);
		setOpen(false);
		setSearchQuery("");
	};

	return (
		<Popover open={open()} onOpenChange={handleOpenChange}>
			<PopoverTrigger
				as={(triggerProps: object) => (
					<Show
						when={props.trigger}
						fallback={
							<Button variant="outline" type="button" {...triggerProps}>
								<Show
									when={currentIconName()}
									fallback={<span class="iconify w-5 h-5" data-icon="mdi:emoticon-outline" />}
								>
									<span class="iconify w-5 h-5" data-icon={`mdi:${currentIconName()}`} />
								</Show>
							</Button>
						}
					>
						<div {...triggerProps}>{props.trigger}</div>
					</Show>
				)}
			/>
			<PopoverContent class="w-[420px] p-0">
				<div class="flex flex-col max-h-[400px]">
					{/* Search Input */}
					<div class="p-3 border-b border-border">
						<TextFieldRoot>
							<TextField
								type="text"
								placeholder="Search icons... (fuzzy search enabled)"
								value={searchQuery()}
								onInput={(e: any) => setSearchQuery(e.currentTarget.value)}
								class="w-full placeholder:text-muted-foreground/60"
							/>
						</TextFieldRoot>
						<div class="text-xs text-muted-foreground mt-1.5">
							{allIcons().length > 0 ? `${allIcons().length.toLocaleString()} icons available` : "Loading..."}
						</div>
					</div>{" "}
					{/* Icon Grid */}
					<div class="flex-1 overflow-y-auto">
						<Show when={loading()}>
							<div class="flex items-center justify-center p-12">
								<div class="i-mdi-loading animate-spin w-8 h-8 text-primary" />
							</div>
						</Show>
						<Show when={!loading() && filteredIcons().length === 0}>
							<div class="flex flex-col items-center justify-center p-8 text-center">
								<div class="i-mdi-magnify-close w-10 h-10 text-muted-foreground mb-2" />
								<p class="text-sm text-muted-foreground">No icons found matching "{searchQuery()}"</p>
							</div>
						</Show>
						<Show when={!loading() && filteredIcons().length > 0}>
							<div class="grid grid-cols-8 gap-1 p-2">
								<For each={filteredIcons()}>
									{(iconName) => {
										return (
											<button
												type="button"
												onClick={() => handleSelectIcon(iconName)}
												class={cn(
													"flex items-center justify-center p-2.5 rounded hover:bg-accent transition-colors group relative",
													currentIconName() === iconName && "bg-primary/10 ring-2 ring-primary",
												)}
												title={iconName}
											>
												<span
													class="iconify w-5 h-5 text-foreground group-hover:text-primary transition-colors"
													data-icon={`mdi:${iconName}`}
												/>
											</button>
										);
									}}
								</For>
							</div>
						</Show>
					</div>
					{/* Results info */}
					<div class="border-t border-border p-2 bg-muted/30">
						<Show when={!loading() && searchQuery()}>
							<div class="text-xs text-muted-foreground text-center">
								{filteredIcons().length} result{filteredIcons().length !== 1 ? "s" : ""}
								{filteredIcons().length === 200 && " (limited to 200)"}
							</div>
						</Show>
						<Show when={!loading() && !searchQuery()}>
							<div class="text-xs text-muted-foreground text-center">
								Showing first 120 icons • Use search to find more
							</div>
						</Show>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
};
