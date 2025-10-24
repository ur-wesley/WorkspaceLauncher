import type { Component } from "solid-js";
import { Button } from "@/components/ui/button";

interface TriggerProps {
	readonly onClick?: () => void;
}

export const EditActionTrigger: Component<TriggerProps> = (props) => (
	<button
		type="button"
		onClick={(e) => {
			e.preventDefault();
			e.stopPropagation();
			setTimeout(() => props.onClick?.(), 100);
		}}
		class="flex items-center w-full px-2 py-2 text-sm cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground text-left border-none bg-transparent"
	>
		<div class="i-mdi-pencil w-4 h-4 mr-2" />
		Edit Action
	</button>
);

export const DeleteActionTrigger: Component<TriggerProps> = (props) => (
	<button
		type="button"
		onClick={(e) => {
			e.preventDefault();
			e.stopPropagation();
			setTimeout(() => props.onClick?.(), 100);
		}}
		class="flex items-center w-full px-2 py-2 text-sm cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground text-destructive hover:text-destructive text-left border-none bg-transparent"
	>
		<div class="i-mdi-delete w-4 h-4 mr-2" />
		Delete Action
	</button>
);

export const AddVariableTrigger: Component<TriggerProps> = (props) => (
	<Button onClick={props.onClick}>
		<div class="i-mdi-plus w-4 h-4 mr-2" />
		Add Variable
	</Button>
);

export const AddActionTrigger: Component<TriggerProps> = (props) => (
	<Button onClick={props.onClick}>
		<div class="i-mdi-plus w-4 h-4 mr-2" />
		Add Action
	</Button>
);

export const EditVariableTrigger: Component<TriggerProps> = (props) => (
	<button
		type="button"
		onClick={(e) => {
			e.preventDefault();
			e.stopPropagation();
			setTimeout(() => props.onClick?.(), 100);
		}}
		class="flex items-center w-full px-2 py-2 text-sm cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground text-left border-none bg-transparent"
	>
		<div class="i-mdi-pencil w-4 h-4 mr-2" />
		Edit Variable
	</button>
);

export const DeleteVariableTrigger: Component<TriggerProps> = (props) => (
	<button
		type="button"
		onClick={(e) => {
			e.preventDefault();
			e.stopPropagation();
			setTimeout(() => props.onClick?.(), 100);
		}}
		class="flex items-center w-full px-2 py-2 text-sm cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground text-destructive hover:text-destructive text-left border-none bg-transparent"
	>
		<div class="i-mdi-delete w-4 h-4 mr-2" />
		Delete Variable
	</button>
);

export const EditWorkspaceTrigger: Component<TriggerProps> = (props) => (
	<Button variant="outline" size="icon" onClick={props.onClick}>
		<div class="i-mdi-pencil w-4 h-4" />
	</Button>
);
