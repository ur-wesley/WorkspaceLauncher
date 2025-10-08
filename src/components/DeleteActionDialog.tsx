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
} from "@/components/ui/alert-dialog";
import { useActionStore } from "@/store/action";
import type { Action } from "@/types/database";

interface DeleteActionDialogProps {
	action: Action;
	trigger: Component<{ onClick?: () => void }>;
}

export const DeleteActionDialog: Component<DeleteActionDialogProps> = (props) => {
	const [, actionActions] = useActionStore();
	const [open, setOpen] = createSignal(false);
	const [deleting, setDeleting] = createSignal(false);

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await actionActions.removeAction(props.action.id);
			setOpen(false);
		} catch (error) {
			console.error("Delete failed:", error);
		} finally {
			setDeleting(false);
		}
	};

	return (
		<>
			<props.trigger onClick={() => setOpen(true)} />
			<AlertDialog open={open()} onOpenChange={setOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Action</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete the action "{props.action.name}"? This action cannot be undone and may
							affect the launch sequence of this workspace.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogClose disabled={deleting()}>Cancel</AlertDialogClose>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={deleting()}
							class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleting() ? "Deleting..." : "Delete Action"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};
