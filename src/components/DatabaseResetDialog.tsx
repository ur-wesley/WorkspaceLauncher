import type { Component } from "solid-js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DatabaseResetDialogProps {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	description: string;
	confirmText: string;
	variant?: "destructive" | "default";
}

export const DatabaseResetDialog: Component<DatabaseResetDialogProps> = (props) => {
	return (
		<Dialog open={props.open} onOpenChange={props.onClose}>
			<DialogContent class="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{props.title}</DialogTitle>
					<DialogDescription>{props.description}</DialogDescription>
				</DialogHeader>
				<div class="flex justify-end gap-2 pt-4">
					<Button variant="outline" onClick={props.onClose}>
						Cancel
					</Button>
					<Button variant={props.variant === "destructive" ? "destructive" : "default"} onClick={props.onConfirm}>
						{props.confirmText}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
