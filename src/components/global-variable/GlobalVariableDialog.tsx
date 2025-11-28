import type { Component } from "solid-js";
import { createEffect, createSignal, Show } from "solid-js";
import * as v from "valibot";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Switch, SwitchControl, SwitchThumb } from "@/components/ui/switch";
import {
	TextField,
	TextFieldLabel,
	TextFieldRoot,
} from "@/components/ui/textfield";
import { variableSchema } from "@/components/variable/VariableDialogValidation";
import { showToast } from "@/libs/toast";
import { useGlobalVariableStore } from "@/store/globalVariable";
import type { GlobalVariable } from "@/types/database";

type GlobalVariableDialogProps = {
	variable?: GlobalVariable;
	trigger: Component<{ onClick?: () => void }>;
	onClose?: () => void;
	forceOpen?: boolean;
};

export const GlobalVariableDialog: Component<GlobalVariableDialogProps> = (
	props,
) => {
	const [, globalVariableStoreActions] = useGlobalVariableStore() ?? [
		null,
		null,
	];
	const [open, setOpen] = createSignal(false);
	const isOpen = () =>
		props.forceOpen !== undefined ? props.forceOpen : open();

	const [key, setKey] = createSignal(props.variable?.key || "");
	const [value, setValue] = createSignal(props.variable?.value || "");
	const [isSecure, setIsSecure] = createSignal(
		props.variable?.is_secure || false,
	);
	const [enabled, setEnabled] = createSignal(props.variable?.enabled ?? true);
	const [keyError, setKeyError] = createSignal<string | null>(null);

	const [loading, setLoading] = createSignal(false);

	createEffect(() => {
		if (isOpen() && !props.variable) {
			setKey("");
			setValue("");
			setIsSecure(false);
			setEnabled(true);
			setKeyError(null);
		} else if (isOpen() && props.variable) {
			setKey(props.variable.key);
			setValue(props.variable.value);
			setIsSecure(props.variable.is_secure);
			setEnabled(props.variable.enabled ?? true);
			setKeyError(null);
		}
	});

	const validateKey = (keyValue: string) => {
		const result = v.safeParse(v.object({ key: variableSchema.entries.key }), {
			key: keyValue,
		});
		if (!result.success) {
			const firstIssue = result.issues[0];
			setKeyError(firstIssue?.message || "Invalid key");
			return false;
		}
		setKeyError(null);
		return true;
	};

	const canSubmit = () => {
		if (!key().trim()) return false;
		const result = v.safeParse(variableSchema, {
			key: key(),
			value: value(),
			isSecure: isSecure(),
			enabled: enabled(),
		});
		return result.success;
	};

	const handleSubmit = async () => {
		if (!globalVariableStoreActions) return;

		if (!validateKey(key())) {
			return;
		}

		setLoading(true);

		try {
			if (props.variable) {
				await globalVariableStoreActions.updateVariable(props.variable.id, {
					key: key(),
					value: value(),
					is_secure: isSecure(),
					enabled: enabled(),
				});
			} else {
				const newVariable = {
					key: key(),
					value: value(),
					is_secure: isSecure(),
					enabled: enabled(),
				};
				await globalVariableStoreActions.addVariable(newVariable);
			}

			setOpen(false);
			props.onClose?.();

			showToast({
				title: "Global Variable Saved",
				description: props.variable
					? `Global variable "${key()}" has been updated successfully.`
					: `Global variable "${key()}" has been created successfully.`,
				variant: "default",
			});
		} catch (error) {
			console.error("GlobalVariableDialog: Submit failed", error);
			showToast({
				title: "Failed to Save Global Variable",
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
					setOpen(true);
				}}
			/>
			<Dialog open={isOpen()} onOpenChange={handleOpenChange}>
				<DialogContent class="max-w-md">
					<DialogHeader>
						<DialogTitle>
							{props.variable
								? "Edit Global Variable"
								: "Create New Global Variable"}
						</DialogTitle>
						<DialogDescription>
							{props.variable
								? "Modify the global environment variable."
								: "Create a new global environment variable available to all workspaces."}
						</DialogDescription>
					</DialogHeader>

					<div class="space-y-4">
						<TextFieldRoot>
							<TextFieldLabel for="variable-key">Key *</TextFieldLabel>
							<TextField
								id="variable-key"
								value={key()}
								onInput={(e: InputEvent) => {
									const newKey = (e.target as HTMLInputElement).value;
									setKey(newKey);
									validateKey(newKey);
								}}
								onBlur={() => validateKey(key())}
								placeholder="VARIABLE_NAME"
								required
								class={keyError() ? "border-destructive" : ""}
							/>
							<Show when={keyError()}>
								<p class="text-xs text-destructive mt-1">{keyError()}</p>
							</Show>
							<Show when={!keyError()}>
								<p class="text-xs text-muted-foreground mt-1">
									Use UPPERCASE_WITH_UNDERSCORES format
								</p>
							</Show>
						</TextFieldRoot>

						<TextFieldRoot>
							<TextFieldLabel for="variable-value">Value</TextFieldLabel>
							<TextField
								id="variable-value"
								type={isSecure() ? "password" : "text"}
								value={value()}
								onInput={(e: InputEvent) =>
									setValue((e.target as HTMLInputElement).value)
								}
								placeholder="Variable value"
							/>
						</TextFieldRoot>

						<div class="space-y-3 pt-2">
							<div class="flex items-center justify-between space-x-2">
								<div class="space-y-0.5">
									<div class="text-sm font-medium">Secure variable</div>
									<p class="text-xs text-muted-foreground">
										Hide value and store securely
									</p>
								</div>
								<Switch checked={isSecure()} onChange={setIsSecure}>
									<SwitchControl>
										<SwitchThumb />
									</SwitchControl>
								</Switch>
							</div>

							<div class="flex items-center justify-between space-x-2">
								<div class="space-y-0.5">
									<div class="text-sm font-medium">Enabled</div>
									<p class="text-xs text-muted-foreground">
										Include in environment when running actions
									</p>
								</div>
								<Switch checked={enabled()} onChange={setEnabled}>
									<SwitchControl>
										<SwitchThumb />
									</SwitchControl>
								</Switch>
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={loading()}
						>
							Cancel
						</Button>
						<Button onClick={handleSubmit} disabled={loading() || !canSubmit()}>
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
