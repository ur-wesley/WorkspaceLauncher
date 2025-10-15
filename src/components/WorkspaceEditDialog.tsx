import type { Component } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import { IconPicker } from "@/components/IconPicker";
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
import { Button } from "@/components/ui/button";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { TextArea } from "@/components/ui/textarea";
import {
 TextField,
 TextFieldLabel,
 TextFieldRoot,
} from "@/components/ui/textfield";
import { useWorkspaceStore } from "@/store/workspace";
import type { Workspace } from "@/types/database";

type WorkspaceEditDialogProps = {
 workspace: Workspace;
 trigger: Component<{ onClick?: () => void }>;
 onClose?: () => void;
};

export const WorkspaceEditDialog: Component<WorkspaceEditDialogProps> = (
 props
) => {
 const navigate = useNavigate();
 const workspaceContext = useWorkspaceStore();
 const [open, setOpen] = createSignal(false);
 const [deleteDialogOpen, setDeleteDialogOpen] = createSignal(false);

 const [name, setName] = createSignal(props.workspace.name);
 const [description, setDescription] = createSignal(
  props.workspace.description || ""
 );
 const [icon, setIcon] = createSignal(props.workspace.icon || undefined);

 const [loading, setLoading] = createSignal(false);
 const [deleting, setDeleting] = createSignal(false);

 const handleSubmit = async () => {
  if (!name().trim() || !workspaceContext) return;

  setLoading(true);

  try {
   await workspaceContext.actions.updateWorkspace(props.workspace.id, {
    name: name(),
    description: description() || undefined,
    icon: icon(),
   });

   setOpen(false);
   props.onClose?.();
  } finally {
   setLoading(false);
  }
 };

 const handleDelete = async () => {
  if (!workspaceContext) return;

  setDeleting(true);

  try {
   await workspaceContext.actions.deleteWorkspace(props.workspace.id);
   setDeleteDialogOpen(false);
   setOpen(false);
   props.onClose?.();
   navigate("/");
  } finally {
   setDeleting(false);
  }
 };

 const resetForm = () => {
  setName(props.workspace.name);
  setDescription(props.workspace.description || "");
  setIcon(props.workspace.icon || undefined);
 };

 const handleOpenChange = (isOpen: boolean) => {
  setOpen(isOpen);
  if (!isOpen) {
   resetForm();
   props.onClose?.();
  }
 };

 const TriggerComponent = props.trigger;

 return (
  <>
   <TriggerComponent onClick={() => setOpen(true)} />
   <Dialog open={open()} onOpenChange={handleOpenChange}>
    <DialogContent class="max-w-lg">
     <DialogHeader>
      <DialogTitle>Edit Workspace</DialogTitle>
      <DialogDescription>
       Modify the workspace details or delete it permanently.
      </DialogDescription>
     </DialogHeader>

     <div class="space-y-4">
      <TextFieldRoot>
       <TextFieldLabel for="workspace-name">Name *</TextFieldLabel>
       <TextField
        id="workspace-name"
        value={name()}
        onInput={(e: InputEvent) =>
         setName((e.target as HTMLInputElement).value)
        }
        placeholder="Workspace name"
        required
       />
      </TextFieldRoot>

      <div class="space-y-2">
       <div class="text-sm font-medium">Icon</div>
       <div class="flex items-center gap-2">
        <IconPicker value={icon()} onChange={setIcon} />
        <Show when={icon()}>
         <span class="text-sm text-muted-foreground">Custom icon selected</span>
        </Show>
       </div>
      </div>

      <TextFieldRoot>
       <TextFieldLabel for="workspace-description">Description</TextFieldLabel>
       <TextArea
        id="workspace-description"
        value={description()}
        onInput={(e: InputEvent) =>
         setDescription((e.target as HTMLTextAreaElement).value)
        }
        placeholder="Optional description..."
        rows={3}
       />
      </TextFieldRoot>
     </div>

     <DialogFooter class="flex justify-between">
      <div class="flex gap-2">
       <Button
        variant="outline"
        onClick={() => setOpen(false)}
        disabled={loading() || deleting()}
       >
        Cancel
       </Button>
       <Button
        onClick={handleSubmit}
        disabled={loading() || deleting() || !name().trim()}
       >
        <Show when={loading()}>
         <div class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </Show>
        Update Workspace
       </Button>
      </div>

      <AlertDialog open={deleteDialogOpen()} onOpenChange={setDeleteDialogOpen}>
       <AlertDialogTrigger>
        <Button variant="destructive" disabled={loading() || deleting()}>
         <Show when={deleting()}>
          <div class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
         </Show>
         Delete
        </Button>
       </AlertDialogTrigger>
       <AlertDialogContent>
        <AlertDialogHeader>
         <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
         <AlertDialogDescription>
          Are you sure you want to delete "{props.workspace.name}"? This action
          cannot be undone. All actions and environment variables will be
          permanently deleted.
         </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
         <AlertDialogClose disabled={deleting()}>Cancel</AlertDialogClose>
         <AlertDialogAction
          onClick={handleDelete}
          disabled={deleting()}
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
         >
          <Show when={deleting()}>
           <div class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </Show>
          Delete Workspace
         </AlertDialogAction>
        </AlertDialogFooter>
       </AlertDialogContent>
      </AlertDialog>
     </DialogFooter>
    </DialogContent>
   </Dialog>
  </>
 );
};
