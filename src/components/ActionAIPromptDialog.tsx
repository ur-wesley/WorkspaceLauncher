import type { Component } from "solid-js";
import { createSignal } from "solid-js";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { createAction } from "@/libs/api";
import { showToast } from "@/libs/toast";
import { useVariableStore } from "@/store/variable";
import type { NewAction } from "@/types/database";

const VARIABLE_PATTERN = /\$\{([^}]+)\}/g;

function extractVariablesFromText(value: string | undefined | null): string[] {
	if (!value) return [];
	const matches = value.match(VARIABLE_PATTERN) ?? [];
	return matches
		.map((match) => match.slice(2, -1))
		.filter((variable) => variable.length > 0);
}

function extractVariablesFromAction(action: Partial<NewAction>): Set<string> {
	const variables = new Set<string>();

	const configStr =
		typeof action.config === "string"
			? action.config
			: JSON.stringify(action.config);

	for (const varName of extractVariablesFromText(configStr)) {
		variables.add(varName);
	}

	for (const varName of extractVariablesFromText(action.name)) {
		variables.add(varName);
	}

	return variables;
}

const AI_PROMPT = `I need help creating an action configuration for my workspace launcher app.

## What this app does:
This is a Windows desktop application that launches development environments with one click. You can configure "workspaces" that contain multiple "actions" (open VS Code, run commands, open URLs, etc.). Actions can have dependencies and execute in order.

## I need you to help me create an action. Please ask me:

1. **What do you want this action to do?** (e.g., "open VS Code", "start a dev server", "open a website")

2. **What type of action is this?**
   - **CLI Command**: Use "command" type for system commands (npm, git, node, etc.)
   - **Binary Executable**: Use "tool" type with "custom" source for .exe files with full paths
   - **VS Code/Eclipse**: Use "vscode" or "eclipse" type
   - **Open URL**: Use "url" type
   - **Delay/Wait**: Use "delay" type

3. **Do you need to use environment variables?**
   - Available variables: \${WORKSPACE_PATH}, \${PROJECT_NAME}, \${USER_HOME}, or custom ones
   - Example: "C:\\\\Projects\\\\\${PROJECT_NAME}\\\\src"

4. **What path/directory and arguments?**
   - Working directory (where to run the command)
   - Command arguments
   - Binary path (if using a .exe file)

## After I answer, respond with ONLY a JSON object. Choose the correct format:

**For CLI commands (npm, node, git, etc.):**
\`\`\`json
{
  "name": "Start Dev Server",
  "action_type": "command",
  "config": {
    "type": "command",
    "command": "npm",
    "args": ["run", "dev"],
    "working_directory": "C:\\\\Projects\\\\myapp",
    "environment_variables": { "NODE_ENV": "development" },
    "keep_terminal_open": false
  },
  "dependencies": null,
  "timeout_seconds": null,
  "detached": false,
  "track_process": true,
  "os_overrides": null,
  "order_index": 0
}
\`\`\`

**For binary executables (.exe files with full paths):**
\`\`\`json
{
  "name": "Launch FiveM",
  "action_type": "tool",
  "config": {
    "type": "tool",
    "source": "custom",
    "tool_name": "FiveM",
    "tool_type": "binary",
    "binary_path": "C:\\\\Program Files\\\\FiveM\\\\FiveM.exe",
    "args": ["fivem://connect/127.0.0.1:30120", "+sv_pureMode", "1"],
    "working_directory": null,
    "detached": false
  },
  "dependencies": null,
  "timeout_seconds": null,
  "detached": false,
  "track_process": true,
  "os_overrides": null,
  "order_index": 0
}
\`\`\`

## TypeScript Schema (for reference):

\`\`\`typescript
// Top-level action structure
interface Action {
  name: string;                    // Display name
  action_type: string;             // "vscode" | "eclipse" | "command" | "url" | "delay" | "tool"
  config: ActionConfig;            // Type-specific configuration (JSON stringified)
  dependencies: string | null;     // JSON array of action names ["Action1", "Action2"]
  timeout_seconds: number | null;  // Max execution time
  detached: boolean;               // Run without waiting for completion
  track_process: boolean;          // Monitor if process is still running
  os_overrides: string | null;     // JSON: { "windows": {...}, "macos": {...}, "linux": {...} }
  order_index: number;             // Execution order (lower = first)
}

// Config types (the "config" field must be one of these):

// 1. Command (for CLI tools like npm, git, node):
{
  "type": "command",
  "command": "npm",                   // Command name (must be in PATH)
  "args": ["run", "dev"],
  "working_directory": "C:\\\\Project",
  "environment_variables": { "NODE_ENV": "dev" },
  "keep_terminal_open": false
}

// 2. Custom tool (for .exe files with full paths):
{
  "type": "tool",
  "source": "custom",
  "tool_name": "Custom Script",
  "tool_type": "binary",              // "binary" | "cli"
  "binary_path": "C:\\\\app.exe",      // For binary type
  "command": "node",                  // For cli type
  "args": ["script.js"],
  "working_directory": "C:\\\\Projects",
  "detached": false
}
\`\`\`

## Key Fields Explained:

- **name**: Display name shown in UI
- **action_type**: Must match config.type - IMPORTANT: Use "tool" for .exe files, "command" for CLI tools
- **config**: JSON object (must be stringified when sending to API)
- **dependencies**: JSON array string of action names that must complete first
  - Example: \`"[\\"Start Server\\", \\"Wait 3s\\"]"\` or \`null\`
- **timeout_seconds**: Max time before killing process (null = no timeout)
- **detached**: 
  - \`true\` = fire-and-forget, don't wait for completion
  - \`false\` = wait for action to complete before next
- **track_process**: Monitor if process is still running (shows in UI)
- **os_overrides**: Platform-specific config overrides
  - Example: \`"{\\"windows\\": {\\"command\\": \\"npm.cmd\\"}}"\` or \`null\`
- **order_index**: Execution order (0, 1, 2...) - lower numbers run first

## Important Notes:

1. **Windows Paths**: Use double backslashes (\\\\) in JSON strings
2. **Config Stringification**: The \`config\` field is a JSON object, but will be stringified when saved
3. **Dependencies**: Must be a JSON array string or null
4. **Action Type Selection**:
   - Use **"command"** type for CLI tools (npm, git, node, python, etc.) - commands in PATH
   - Use **"tool"** type with **"custom"** source for .exe files with full paths
   - Never use "command" type with full .exe paths - this will cause issues!
5. **Environment Variables**: 
   - Use \${VAR_NAME} syntax in strings
   - Available: \${WORKSPACE_PATH}, \${PROJECT_NAME}, \${USER_HOME}
   - Custom variables can be defined per workspace

Now, what action do you want to create?`;

interface ActionAIPromptDialogProps {
	workspaceId: number;
	onImportSuccess?: () => void;
}

export const ActionAIPromptDialog: Component<ActionAIPromptDialogProps> = (
	props,
) => {
	const [variableStore, variableActions] = useVariableStore();
	const [open, setOpen] = createSignal(false);
	const [userDescription, setUserDescription] = createSignal("");
	const [jsonInput, setJsonInput] = createSignal("");

	const generatedPrompt = () => {
		const description = userDescription().trim();
		if (!description) {
			return `${AI_PROMPT}\n\n[Describe what you want your action to do above]`;
		}
		return `${AI_PROMPT}\n\nUser Request: ${description}`;
	};

	const isValidJSON = () => {
		try {
			const trimmed = jsonInput().trim();
			if (!trimmed) return false;
			JSON.parse(trimmed);
			return true;
		} catch {
			return false;
		}
	};

	const copyPrompt = async () => {
		try {
			await navigator.clipboard.writeText(generatedPrompt());
			showToast({
				title: "Prompt Copied",
				description: "Paste this into ChatGPT/Claude to generate your action",
				variant: "success",
			});
		} catch (error) {
			showToast({
				title: "Copy Failed",
				description: `Failed to copy: ${error}`,
				variant: "destructive",
			});
		}
	};

	const readFromClipboard = async () => {
		try {
			const text = await navigator.clipboard.readText();
			setJsonInput(text);

			try {
				const parsed = JSON.parse(text);
				const prettified = JSON.stringify(parsed, null, 2);
				setJsonInput(prettified);
				showToast({
					title: "JSON Read & Prettified",
					description: "Clipboard content has been formatted",
					variant: "success",
				});
			} catch {
				showToast({
					title: "Content Read",
					description: "Pasted from clipboard",
					variant: "success",
				});
			}
		} catch (error) {
			showToast({
				title: "Read Failed",
				description: `Failed to read clipboard: ${error}`,
				variant: "destructive",
			});
		}
	};

	const handlePaste = (e: ClipboardEvent) => {
		e.preventDefault();
		const pastedText = e.clipboardData?.getData("text");
		if (!pastedText) return;

		try {
			const parsed = JSON.parse(pastedText);
			const prettified = JSON.stringify(parsed, null, 2);
			setJsonInput(prettified);
		} catch {
			setJsonInput(pastedText);
		}
	};

	const handleImport = async () => {
		try {
			const parsed = JSON.parse(jsonInput());

			const actionsToImport: Partial<NewAction>[] = Array.isArray(parsed)
				? parsed
				: [parsed];

			const availableVariables = new Set(
				variableStore.variables.map((v) => v.key),
			);
			const allMissingVariables = new Set<string>();

			const validatedActions: NewAction[] = [];
			for (const action of actionsToImport) {
				if (!action.name) {
					throw new Error(`Action missing name: ${JSON.stringify(action)}`);
				}
				if (!action.action_type) {
					throw new Error(`Action "${action.name}" missing action_type`);
				}
				if (!action.config) {
					throw new Error(`Action "${action.name}" missing config`);
				}

				const varsInAction = extractVariablesFromAction(action);
				for (const varName of varsInAction) {
					if (!availableVariables.has(varName)) {
						allMissingVariables.add(varName);
					}
				}

				const detached =
					typeof action.detached === "string"
						? action.detached === "true" || action.detached === "1"
						: Boolean(action.detached ?? false);

				const track_process =
					typeof action.track_process === "string"
						? action.track_process === "true" || action.track_process === "1"
						: Boolean(action.track_process ?? true);

				validatedActions.push({
					workspace_id: props.workspaceId,
					name: action.name,
					action_type: action.action_type,
					config:
						typeof action.config === "string"
							? action.config
							: JSON.stringify(action.config),
					dependencies: action.dependencies || null,
					timeout_seconds: action.timeout_seconds || null,
					detached,
					track_process,
					os_overrides: action.os_overrides || null,
					order_index: action.order_index ?? 0,
					auto_launch: false,
				});
			}

			if (allMissingVariables.size > 0) {
				for (const varName of allMissingVariables) {
					await variableActions.addVariable({
						workspace_id: props.workspaceId,
						key: varName,
						value: "",
						is_secure: false,
						enabled: true,
					});
				}
				await variableActions.loadVariables(props.workspaceId);
			}

			let successCount = 0;
			let failedCount = 0;

			for (const newAction of validatedActions) {
				const result = await createAction(newAction);
				if (result.isOk()) {
					successCount++;
				} else {
					failedCount++;
					console.error(
						`Failed to import action "${newAction.name}":`,
						result.error.message,
					);
				}
			}

			if (successCount > 0) {
				const varMessage =
					allMissingVariables.size > 0
						? ` Created ${allMissingVariables.size} variable${allMissingVariables.size !== 1 ? "s" : ""}.`
						: "";

				showToast({
					title: "Actions Imported",
					description: `Successfully imported ${successCount} action${successCount !== 1 ? "s" : ""}.${varMessage}`,
					variant: "success",
				});
				setOpen(false);
				setUserDescription("");
				setJsonInput("");
				props.onImportSuccess?.();
			}

			if (failedCount > 0) {
				showToast({
					title: "Import Incomplete",
					description: `${failedCount} action${
						failedCount !== 1 ? "s" : ""
					} failed to import. Check console for details.`,
					variant: "destructive",
				});
			}
		} catch (error) {
			showToast({
				title: "Invalid JSON",
				description:
					error instanceof Error ? error.message : "Failed to parse JSON",
				variant: "destructive",
			});
		}
	};

	return (
		<Dialog open={open()} onOpenChange={setOpen}>
			<DialogTrigger
				as={(props: { onClick?: () => void }) => (
					<Button variant="outline" size="sm" {...props}>
						<div class="i-mdi-robot w-4 h-4 mr-2" />
						AI Assistant
					</Button>
				)}
			/>
			<DialogContent class="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle class="flex items-center gap-2">
						<div class="i-mdi-robot w-5 h-5" />
						AI Action Generator
					</DialogTitle>
					<DialogDescription>
						Step 1: Describe what you want, copy the prompt. <br />
						Step 2: Paste the AI's JSON response (single object or array) to
						import.
					</DialogDescription>
				</DialogHeader>

				<div class="flex-1 overflow-auto space-y-4 p-1">
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<div class="text-sm font-medium">
								Step 1: Describe Your Action
							</div>
							<Button size="sm" onClick={copyPrompt}>
								<div class="i-mdi-content-copy w-4 h-4 mr-2" />
								Copy Prompt
							</Button>
						</div>
						<textarea
							value={userDescription()}
							onInput={(e) => setUserDescription(e.currentTarget.value)}
							class="min-h-[100px] font-sans text-sm resize-none w-full p-3 rounded-md border border-input bg-background"
							placeholder="Example: I want to launch FiveM and connect to a specific server..."
						/>
						<div class="text-xs text-muted-foreground">
							Describe what you want your action to do. Click "Copy Prompt" to
							get the full prompt with your description.
						</div>
					</div>

					<div class="relative">
						<div class="absolute inset-0 flex items-center">
							<span class="w-full border-t" />
						</div>
						<div class="relative flex justify-center text-xs uppercase">
							<span class="bg-background px-2 text-muted-foreground">
								Then paste AI response below
							</span>
						</div>
					</div>

					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<div class="text-sm font-medium">
								Step 2: Import JSON Response
							</div>
							<Button size="sm" variant="outline" onClick={readFromClipboard}>
								<div class="i-mdi-clipboard-text w-4 h-4 mr-2" />
								Read from Clipboard
							</Button>
						</div>
						<textarea
							value={jsonInput()}
							onInput={(e) => setJsonInput(e.currentTarget.value)}
							onPaste={handlePaste}
							class="min-h-[250px] font-mono text-xs resize-none w-full p-3 rounded-md border border-input bg-background"
							placeholder='Paste JSON here (single object or array): { "name": "..." } or [{ "name": "..." }, ...]'
						/>
						<div class="text-xs text-muted-foreground">
							Paste the JSON response from ChatGPT/Claude here (single action
							object or array of actions), or click "Read from Clipboard".
						</div>
					</div>
				</div>

				<DialogFooter class="flex gap-2">
					<Button variant="outline" onClick={() => setOpen(false)}>
						Close
					</Button>
					<Button
						onClick={handleImport}
						disabled={!isValidJSON()}
						variant="default"
					>
						<div class="i-mdi-import w-4 h-4 mr-2" />
						Import Action
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
