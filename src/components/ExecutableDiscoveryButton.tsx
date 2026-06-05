import { type Component, createSignal, Show } from "solid-js";
import { discoverExecutable, getSetting } from "@/libs/api";
import { showToast } from "@/libs/toast";
import { SETTING_KEYS } from "@/types/database";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface ExecutableDiscoveryButtonProps {
	command: () => string;
	workingDirectory?: () => string | undefined;
	size?: "sm" | "default";
}

export const ExecutableDiscoveryButton: Component<
	ExecutableDiscoveryButtonProps
> = (props) => {
	const [loading, setLoading] = createSignal(false);
	const [lastResult, setLastResult] = createSignal<{
		found: boolean;
		message: string;
		path?: string;
	} | null>(null);

	const handleTest = async () => {
		const command = props.command().trim();
		if (!command) {
			showToast({
				title: "Nothing to test",
				description: "Enter a command or path first",
				variant: "destructive",
			});
			return;
		}

		setLoading(true);
		const extraSettingResult = await getSetting(
			SETTING_KEYS.EXTRA_PATH_DIRECTORIES,
		);
		const extraPaths = extraSettingResult.isOk()
			? extraSettingResult.value?.value
					?.split(";")
					.map((p) => p.trim())
					.filter(Boolean)
			: undefined;

		const result = await discoverExecutable(command, {
			workingDirectory: props.workingDirectory?.(),
			extraPaths,
		});
		setLoading(false);

		if (result.isErr()) {
			setLastResult({ found: false, message: result.error });
			showToast({
				title: "Discovery failed",
				description: result.error,
				variant: "destructive",
			});
			return;
		}

		const data = result.value;
		setLastResult({
			found: data.found,
			message: data.message,
			path: data.resolved_path ?? undefined,
		});

		showToast({
			title: data.found ? "Executable found" : "Not found",
			description: data.message,
			variant: data.found ? "success" : "destructive",
		});
	};

	return (
		<div class="flex flex-col gap-1.5">
			<Button
				type="button"
				variant="outline"
				size={props.size ?? "sm"}
				onClick={handleTest}
				disabled={loading()}
			>
				<Show when={loading()}>
					<div class="mr-1.5 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
				</Show>
				Test discovery
			</Button>
			<Show when={lastResult()}>
				{(result) => (
					<div class="flex flex-col gap-1">
						<Badge variant={result().found ? "default" : "destructive"}>
							{result().found ? "Found" : "Not found"}
						</Badge>
						<p class="text-xs text-muted-foreground break-all">
							{result().message}
						</p>
					</div>
				)}
			</Show>
		</div>
	);
};
