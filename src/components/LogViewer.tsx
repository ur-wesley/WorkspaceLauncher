import Filter from "ansi-to-html";
import { createEffect, createMemo, For, onMount } from "solid-js";

interface LogViewerProps {
	logs: string[];
	title?: string;
}

const converter = new Filter({
	newline: true,
	escapeXML: true,
	colors: {
		0: "#000000",
		1: "#ef4444", // red
		2: "#22c55e", // green
		3: "#eab308", // yellow
		4: "#3b82f6", // blue
		5: "#a855f7", // purple
		6: "#06b6d4", // cyan
		7: "#e5e7eb", // white
	},
});

export const LogViewer = (props: LogViewerProps) => {
	let containerRef: HTMLDivElement | undefined;

	const formattedLogs = createMemo(() => {
		return props.logs.map((log) => converter.toHtml(log));
	});

	const scrollToBottom = () => {
		if (containerRef) {
			containerRef.scrollTop = containerRef.scrollHeight;
		}
	};

	createEffect(() => {
		props.logs.length;
		scrollToBottom();
	});

	onMount(() => {
		scrollToBottom();
	});

	return (
		<div class="flex flex-col h-full bg-[#1e1e1e] rounded-md overflow-hidden border border-border">
			<div
				class="flex-1 overflow-y-auto p-4 font-mono text-xs md:text-sm"
				ref={containerRef}
			>
				<For each={formattedLogs()}>
					{(log) => (
						<div
							class="whitespace-pre-wrap break-all text-gray-300"
							innerHTML={log}
						/>
					)}
				</For>
				{props.logs.length === 0 && (
					<div class="text-gray-500 italic text-center mt-4">
						No logs available
					</div>
				)}
			</div>
		</div>
	);
};
