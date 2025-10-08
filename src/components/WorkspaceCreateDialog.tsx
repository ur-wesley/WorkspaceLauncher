import type { Component } from "solid-js";
import { createSignal, Show } from "solid-js";
import { IconPicker } from "@/components/IconPicker";
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
import type { NewWorkspace } from "@/types/database";

interface WorkspaceCreateDialogProps {
 open: boolean;
 onClose: () => void;
 onSubmit: (workspace: NewWorkspace) => Promise<void>;
}

export const WorkspaceCreateDialog: Component<WorkspaceCreateDialogProps> = (
 props
) => {
 const [name, setName] = createSignal("");
 const [description, setDescription] = createSignal("");
 const [icon, setIcon] = createSignal<string | undefined>(undefined);
 const [isSubmitting, setIsSubmitting] = createSignal(false);

 const handleSubmit = async (e: Event) => {
  e.preventDefault();

  const trimmedName = name().trim();
  if (!trimmedName) {
   return;
  }

  setIsSubmitting(true);
  try {
   await props.onSubmit({
    name: trimmedName,
    description: description().trim() || undefined,
    icon: icon(),
   });

   setName("");
   setDescription("");
   setIcon(undefined);
   props.onClose();
  } catch (error) {
   console.error("Failed to create workspace:", error);
  } finally {
   setIsSubmitting(false);
  }
 };

 const handleClose = () => {
  if (isSubmitting()) return;

  setName("");
  setDescription("");
  setIcon(undefined);
  props.onClose();
 };

 return (
  <Dialog open={props.open} onOpenChange={(open) => !open && handleClose()}>
   <DialogContent class="sm:max-w-md">
    <form onSubmit={handleSubmit}>
     <DialogHeader>
      <DialogTitle>Create New Workspace</DialogTitle>
      <DialogDescription>
       Create a new workspace to organize your development environments.
      </DialogDescription>
     </DialogHeader>

     <div class="grid gap-4 py-4">
      <TextFieldRoot class="grid grid-cols-4 items-center gap-4">
       <TextFieldLabel for="name" class="text-right">
        Name
       </TextFieldLabel>
       <TextField
        id="name"
        value={name()}
        onInput={(e: InputEvent) =>
         setName((e.target as HTMLInputElement).value)
        }
        placeholder="My Workspace"
        class="col-span-3"
        required
        disabled={isSubmitting()}
       />
      </TextFieldRoot>

      <div class="grid grid-cols-4 items-center gap-4">
       <TextFieldLabel class="text-right">Icon</TextFieldLabel>
       <div class="col-span-3 flex items-center gap-2">
        <IconPicker value={icon()} onChange={setIcon} />
        <Show when={icon()}>
         <span class="text-sm text-muted-foreground">Selected icon</span>
        </Show>
       </div>
      </div>

      <TextFieldRoot class="grid grid-cols-4 items-start gap-4">
       <TextFieldLabel for="description" class="text-right pt-2">
        Description
       </TextFieldLabel>
       <TextArea
        id="description"
        value={description()}
        onInput={(e: InputEvent) =>
         setDescription((e.target as HTMLTextAreaElement).value)
        }
        placeholder="Optional description..."
        class="col-span-3 min-h-20"
        disabled={isSubmitting()}
       />
      </TextFieldRoot>
     </div>

     <DialogFooter>
      <Button
       type="button"
       variant="outline"
       onclick={handleClose}
       disabled={isSubmitting()}
      >
       Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting() || !name().trim()}>
       {isSubmitting() ? "Creating..." : "Create Workspace"}
      </Button>
     </DialogFooter>
    </form>
   </DialogContent>
  </Dialog>
 );
};
