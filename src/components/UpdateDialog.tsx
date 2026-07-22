import type { Component } from "solid-js";
import { Show } from "solid-js";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/libs/cn";
import {
	acknowledgeDialog,
	confirmInstall,
	dismissUpdate,
	handleDialogOpenChange,
	updaterDialogState,
} from "@/libs/updaterDialog";

export const UpdateDialog: Component = () => {
	const isDownloading = () => updaterDialogState.mode === "downloading";
	const isAvailable = () => updaterDialogState.mode === "available";

	return (
		<Dialog
			open={updaterDialogState.open}
			onOpenChange={handleDialogOpenChange}
		>
			<DialogContent
				class={cn("sm:max-w-lg", isDownloading() && "[&>button]:hidden")}
				onInteractOutside={(event) => {
					if (isDownloading()) event.preventDefault();
				}}
				onEscapeKeyDown={(event) => {
					if (isDownloading()) event.preventDefault();
				}}
			>
				<DialogHeader>
					<DialogTitle class="flex items-center gap-2">
						<div class="i-mdi-update w-5 h-5 text-primary" />
						{updaterDialogState.title}
					</DialogTitle>
					<Show when={updaterDialogState.message}>
						<DialogDescription>{updaterDialogState.message}</DialogDescription>
					</Show>
				</DialogHeader>

				<div class="space-y-4 px-4 py-4">
					<Show when={isAvailable()}>
						<div class="rounded-md border border-border bg-elevated-2 px-3 py-2">
							<p class="text-sm font-medium">
								Version {updaterDialogState.version}
							</p>
						</div>
						<Show
							when={updaterDialogState.releaseNotes}
							fallback={
								<p class="text-sm text-muted-foreground">
									No release notes provided.
								</p>
							}
						>
							<div class="space-y-2">
								<p class="text-sm font-medium">Release notes</p>
								<div class="max-h-48 overflow-y-auto rounded-md border border-border bg-elevated-2 p-3">
									<pre class="whitespace-pre-wrap text-sm text-muted-foreground font-sans">
										{updaterDialogState.releaseNotes}
									</pre>
								</div>
							</div>
						</Show>
					</Show>

					<Show when={isDownloading()}>
						<div class="space-y-3">
							<div class="h-2 overflow-hidden rounded-full bg-muted">
								<Show
									when={updaterDialogState.progress !== null}
									fallback={
										<div class="h-full w-1/3 animate-pulse rounded-full bg-primary" />
									}
								>
									<div
										class="h-full rounded-full bg-primary transition-all duration-200"
										style={{
											width: `${updaterDialogState.progress}%`,
										}}
									/>
								</Show>
							</div>
							<p class="text-sm text-muted-foreground">
								{updaterDialogState.progressLabel}
							</p>
						</div>
					</Show>

					<Show
						when={
							updaterDialogState.mode === "info" ||
							updaterDialogState.mode === "error"
						}
					>
						<p class="text-sm text-muted-foreground">
							{updaterDialogState.message}
						</p>
					</Show>
				</div>

				<DialogFooter>
					<Show
						when={isAvailable()}
						fallback={
							<Show when={!isDownloading()}>
								<Button onClick={acknowledgeDialog}>OK</Button>
							</Show>
						}
					>
						<Button variant="outline" onClick={dismissUpdate}>
							Later
						</Button>
						<Button onClick={confirmInstall}>Update</Button>
					</Show>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
