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
import { useVariableStore } from "@/store/variable";
import type { Variable } from "@/types/database";

interface DeleteVariableDialogProps {
	variable: Variable;
	trigger: Component<{ onClick?: () => void }>;
}

export const DeleteVariableDialog: Component<DeleteVariableDialogProps> = (props) => {
	const [, variableActions] = useVariableStore();
	const [open, setOpen] = createSignal(false);
	const [deleting, setDeleting] = createSignal(false);

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await variableActions.removeVariable(props.variable.id);
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
						<AlertDialogTitle>Delete Variable</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete the variable "{props.variable.key}"? This action cannot be undone and any
							actions using this variable will need to be reconfigured.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogClose disabled={deleting()}>Cancel</AlertDialogClose>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={deleting()}
							class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleting() ? "Deleting..." : "Delete Variable"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};
