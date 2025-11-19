import { type Component, createSignal } from "solid-js";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogClose,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Tool } from "@/models/tool.model";
import { useToolStore } from "@/store/tool";

interface DeleteToolDialogProps {
	tool: Tool;
	trigger: Component<{ onClick?: () => void }>;
}

export const DeleteToolDialog: Component<DeleteToolDialogProps> = (props) => {
	const [, toolActions] = useToolStore();
	const [open, setOpen] = createSignal(false);
	const [deleting, setDeleting] = createSignal(false);

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await toolActions.deleteTool(props.tool.id);
			setOpen(false);
		} catch (error) {
			console.error("Delete failed:", error);
		} finally {
			setDeleting(false);
		}
	};

	return (
		<AlertDialog open={open()} onOpenChange={setOpen}>
			<AlertDialogTrigger as={props.trigger} />
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Tool</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to delete "{props.tool.name}"? This action
						cannot be undone and any actions using this tool will need to be
						reconfigured.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogClose disabled={deleting()}>Cancel</AlertDialogClose>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={deleting()}
						class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{deleting() ? "Deleting..." : "Delete Tool"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
