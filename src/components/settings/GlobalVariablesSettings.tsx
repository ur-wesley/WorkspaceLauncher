import { type Component, createSignal, onMount, Show } from "solid-js";
import { GlobalVariableCard } from "@/components/GlobalVariableCard";
import { GlobalVariableDialog } from "@/components/global-variable/GlobalVariableDialog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { AddVariableTrigger } from "@/components/WorkspaceDetailTriggers";
import { showToast } from "@/libs/toast";
import { useGlobalVariableStore } from "@/store/globalVariable";

export const GlobalVariablesSettings: Component = () => {
	const [store, actions] = useGlobalVariableStore();
	const [importing, setImporting] = createSignal(false);

	onMount(() => {
		actions.loadVariables();
	});

	const handleToggle = (id: number, enabled: boolean) => {
		actions.toggleVariable(id, enabled);
	};

	const handleExport = async () => {
		const variables = store.variables;
		if (variables.length === 0) {
			showToast({
				title: "Nothing to export",
				description: "No global variables to export",
				variant: "default",
			});
			return;
		}

		const exportData = {
			version: 1,
			type: "global_variables",
			variables: variables.map((v) => ({
				key: v.key,
				value: v.value,
				is_secure: v.is_secure,
				enabled: v.enabled,
			})),
		};

		const json = JSON.stringify(exportData, null, 2);
		const fileName = `global_variables_${new Date().toISOString().slice(0, 10)}.json`;

		try {
			if (
				"showSaveFilePicker" in window &&
				typeof window.showSaveFilePicker === "function"
			) {
				const handle = await window.showSaveFilePicker({
					suggestedName: fileName,
					types: [
						{
							description: "JSON file",
							accept: { "application/json": [".json"] },
						},
					],
				});
				const writable = await handle.createWritable();
				await writable.write(json);
				await writable.close();
			} else {
				const blob = new Blob([json], { type: "application/json" });
				const url = URL.createObjectURL(blob);
				const anchor = document.createElement("a");
				anchor.href = url;
				anchor.download = fileName;
				anchor.click();
				URL.revokeObjectURL(url);
			}

			showToast({
				title: "Export Successful",
				description: `Exported ${variables.length} global variables`,
				variant: "default",
			});
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") {
				return;
			}
			showToast({
				title: "Export Failed",
				description: String(error),
				variant: "destructive",
			});
		}
	};

	const handleImport = async () => {
		try {
			const input = document.createElement("input");
			input.type = "file";
			input.accept = ".json";

			input.onchange = async (e) => {
				const file = (e.target as HTMLInputElement).files?.[0];
				if (!file) return;

				setImporting(true);
				try {
					const text = await file.text();
					const data = JSON.parse(text);

					if (
						data.type !== "global_variables" ||
						!Array.isArray(data.variables)
					) {
						throw new Error(
							"Invalid format: Not a global variables export file",
						);
					}

					let importedCount = 0;
					let skippedCount = 0;

					for (const v of data.variables) {
						const exists = store.variables.some(
							(existing) => existing.key === v.key,
						);
						if (exists) {
							skippedCount++;
							continue;
						}

						await actions.addVariable({
							key: v.key,
							value: v.value,
							is_secure: v.is_secure,
							enabled: v.enabled,
						});
						importedCount++;
					}

					showToast({
						title: "Import Complete",
						description: `Imported ${importedCount} variables. Skipped ${skippedCount} duplicates.`,
						variant: "default",
					});
				} catch (error) {
					showToast({
						title: "Import Failed",
						description: String(error),
						variant: "destructive",
					});
				} finally {
					setImporting(false);
				}
			};

			input.click();
		} catch (error) {
			showToast({
				title: "Import Error",
				description: String(error),
				variant: "destructive",
			});
		}
	};

	return (
		<div class="space-y-6">
			<Card>
				<CardHeader>
					<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
						<div>
							<CardTitle>Global Environment Variables</CardTitle>
							<CardDescription>
								Manage variables available to all workspaces. Workspace-specific
								variables with the same key will override these.
							</CardDescription>
						</div>
						<div class="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={handleImport}
								disabled={importing()}
							>
								<div class="i-mdi-import w-4 h-4 mr-2" />
								Import
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={handleExport}
								disabled={store.variables.length === 0}
							>
								<div class="i-mdi-export w-4 h-4 mr-2" />
								Export
							</Button>
							<GlobalVariableDialog trigger={AddVariableTrigger} />
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<Show
						when={store.variables.length > 0}
						fallback={
							<div class="text-center py-12 text-muted-foreground">
								<div class="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
									<div class="i-mdi-variable text-2xl" />
								</div>
								<h3 class="text-lg font-medium text-foreground mb-2">
									No global variables
								</h3>
								<p class="text-sm">
									Add variables here to use them across all workspaces.
								</p>
							</div>
						}
					>
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{store.variables.map((variable) => (
								<GlobalVariableCard
									variable={variable}
									onToggle={handleToggle}
								/>
							))}
						</div>
					</Show>
				</CardContent>
			</Card>
		</div>
	);
};
