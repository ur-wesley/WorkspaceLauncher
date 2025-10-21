import type { Component } from "solid-js";
import { createEffect, createSignal, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Switch, SwitchControl, SwitchLabel, SwitchThumb } from "@/components/ui/switch";
import { TextField, TextFieldLabel, TextFieldRoot } from "@/components/ui/textfield";
import { showToast } from "@/libs/toast";
import { useVariableStore } from "@/store/variable";
import type { Variable } from "@/types/database";

type VariableDialogProps = {
	workspaceId: string;
	variable?: Variable;
	trigger: Component<{ onClick?: () => void }>;
	onClose?: () => void;
	forceOpen?: boolean;
};

export const VariableDialog: Component<VariableDialogProps> = (props) => {
	const [, variableStoreActions] = useVariableStore() ?? [null, null];
	const [open, setOpen] = createSignal(false);
	const isOpen = () => (props.forceOpen !== undefined ? props.forceOpen : open());

	const [key, setKey] = createSignal(props.variable?.key || "");
	const [value, setValue] = createSignal(props.variable?.value || "");
	const [isSecure, setIsSecure] = createSignal(props.variable?.is_secure || false);
	const [enabled, setEnabled] = createSignal(props.variable?.enabled ?? true);

	const [loading, setLoading] = createSignal(false);

	createEffect(() => {
		if (isOpen() && !props.variable) {
			setKey("");
			setValue("");
			setIsSecure(false);
			setEnabled(true);
			console.log("VariableDialog: Reset form for new variable");
		} else if (isOpen() && props.variable) {
			setKey(props.variable.key);
			setValue(props.variable.value);
			setIsSecure(props.variable.is_secure);
			setEnabled(props.variable.enabled);
			console.log("VariableDialog: Loaded existing variable data", props.variable);
		}
	});

	const handleSubmit = async () => {
		if (!key().trim() || !variableStoreActions) return;

		console.log("VariableDialog: Starting submit", {
			key: key(),
			value: value(),
			isSecure: isSecure(),
			enabled: enabled(),
		});
		setLoading(true);

		try {
			if (props.variable) {
				console.log("VariableDialog: Updating variable", props.variable.id);
				await variableStoreActions.updateVariable(props.variable.id, {
					workspace_id: Number(props.workspaceId),
					key: key(),
					value: value(),
					is_secure: isSecure(),
					enabled: enabled(),
				});
			} else {
				console.log("VariableDialog: Creating new variable");
				const newVariable = {
					workspace_id: Number(props.workspaceId),
					key: key(),
					value: value(),
					is_secure: isSecure(),
					enabled: enabled(),
				};
				console.log("VariableDialog: New variable data:", newVariable);
				await variableStoreActions.addVariable(newVariable);
			}

			console.log("VariableDialog: Submit successful");
			setOpen(false);
			props.onClose?.();

			showToast({
				title: "Variable Saved",
				description: props.variable
					? `Variable "${key()}" has been updated successfully.`
					: `Variable "${key()}" has been created successfully.`,
				variant: "default",
			});
		} catch (error) {
			console.error("VariableDialog: Submit failed", error);
			showToast({
				title: "Failed to Save Variable",
				description: `Error: ${error}`,
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleOpenChange = (openNext: boolean) => {
		if (props.forceOpen !== undefined) {
			if (!openNext) props.onClose?.();
			return;
		}
		setOpen(openNext);
		if (!openNext) {
			props.onClose?.();
		}
	};

	return (
		<>
			<props.trigger
				onClick={() => {
					console.log("VariableDialog: Trigger clicked, isNewVariable:", !props.variable);
					setOpen(true);
				}}
			/>
			<Dialog open={isOpen()} onOpenChange={handleOpenChange}>
				<DialogContent class="max-w-md">
					<DialogHeader>
						<DialogTitle>{props.variable ? "Edit Variable" : "Create New Variable"}</DialogTitle>
						<DialogDescription>
							{props.variable
								? "Modify the environment variable."
								: "Create a new environment variable for this workspace."}
						</DialogDescription>
					</DialogHeader>

					<div class="space-y-4">
						<TextFieldRoot>
							<TextFieldLabel for="variable-key">Key *</TextFieldLabel>
							<TextField
								id="variable-key"
								value={key()}
								onInput={(e: InputEvent) => setKey((e.target as HTMLInputElement).value)}
								placeholder="VARIABLE_NAME"
								required
							/>
						</TextFieldRoot>

						<TextFieldRoot>
							<TextFieldLabel for="variable-value">Value</TextFieldLabel>
							<TextField
								id="variable-value"
								type={isSecure() ? "password" : "text"}
								value={value()}
								onInput={(e: InputEvent) => setValue((e.target as HTMLInputElement).value)}
								placeholder="Variable value"
							/>
						</TextFieldRoot>

						<div class="flex items-center justify-between">
							<Switch
								checked={isSecure()}
								onChange={(checked) => {
									console.log("VariableDialog: Secure switch changed to:", checked);
									setIsSecure(checked);
								}}
							>
								<SwitchLabel class="text-sm font-medium">Secure variable</SwitchLabel>
								<SwitchControl>
									<SwitchThumb />
								</SwitchControl>
							</Switch>
						</div>

						<div class="flex items-center justify-between">
							<Switch
								checked={enabled()}
								onChange={(checked) => {
									console.log("VariableDialog: Enabled switch changed to:", checked);
									setEnabled(checked);
								}}
							>
								<SwitchLabel class="text-sm font-medium">Enabled</SwitchLabel>
								<SwitchControl>
									<SwitchThumb />
								</SwitchControl>
							</Switch>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)} disabled={loading()}>
							Cancel
						</Button>
						<Button onClick={handleSubmit} disabled={loading() || !key().trim()}>
							<Show when={loading()}>
								<div class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
							</Show>
							{props.variable ? "Update" : "Create"} Variable
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};
