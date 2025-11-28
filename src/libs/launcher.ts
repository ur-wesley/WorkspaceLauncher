import { openPath } from "@tauri-apps/plugin-opener";
import { Command } from "@tauri-apps/plugin-shell";
import type { Action } from "@/models/action.model";
import type { Variable } from "@/models/variable.model";
import { runningActionsService } from "@/services/runningActions";
import type {
	ActionConfig,
	CommandActionConfig,
	DelayActionConfig,
	ToolActionConfig,
	URLActionConfig,
} from "@/types/database";

export interface LaunchContext {
	workspaceId: number;
	variables: Record<string, string>;
}

function normalizeActionConfig(
	actionType: string,
	config: ActionConfig,
	_context: LaunchContext,
): { type: "tool" | "command" | "url" | "delay"; config: ActionConfig } {
	const t = actionType.toLowerCase();
	if (t === "tool" || t === "command" || t === "url" || t === "delay") {
		return { type: t as "tool" | "command" | "url" | "delay", config };
	}

	type ConfigWithUnknownKeys = ActionConfig & Record<string, unknown>;
	const c = config as ConfigWithUnknownKeys;

	if (typeof c.command === "string" && c.command.trim()) {
		return {
			type: "command",
			config: {
				type: "command",
				command: c.command,
				args: (c.args as string[] | undefined) ?? [],
				detached: c.detached as boolean | undefined,
				working_directory: c.working_directory as string | undefined,
			},
		};
	}
	if (typeof c.binary_path === "string" && c.binary_path.trim()) {
		return {
			type: "tool",
			config: {
				type: "tool",
				source: "custom",
				tool_name: (c.tool_name as string | undefined) ?? t,
				tool_type: "binary",
				binary_path: c.binary_path,
				args: (c.args as string[] | undefined) ?? [],
				detached: c.detached as boolean | undefined,
				working_directory: c.working_directory as string | null | undefined,
			},
		};
	}

	const fallbackCommand = (c.tool_name as string | undefined) || t;
	return {
		type: "tool",
		config: {
			type: "tool",
			source: "custom",
			tool_name: (c.tool_name as string | undefined) ?? t,
			tool_type: "cli",
			command: fallbackCommand,
			args: (c.args as string[] | undefined) ?? [],
			detached: c.detached as boolean | undefined,
			working_directory: c.working_directory as string | null | undefined,
		},
	};
}

export interface LaunchResult {
	success: boolean;
	message: string;
	processId?: number;
	runId?: number;
}

function trackRunningAction(
	action: Action,
	processId: number,
	context: LaunchContext,
	runId?: number,
): void {
	const runningAction = {
		id: `${action.id}-${Date.now()}`,
		workspace_id: context.workspaceId,
		action_id: action.id,
		action_name: action.name,
		process_id: processId,
		run_id: runId,
		started_at: new Date().toISOString(),
	};

	runningActionsService.add(runningAction);
	console.log(
		`Tracking running action: ${action.name} (PID: ${processId}, RunID: ${runId})`,
	);
}

function isWindows(): boolean {
	return navigator.userAgent.includes("Windows");
}

function replaceVariables(
	input: string,
	variables: Record<string, string>,
): string {
	let result = input;
	for (const [key, value] of Object.entries(variables)) {
		result = result.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
	}
	return result;
}

export function prepareVariables(
	variables: Variable[],
	globalVariables: { key: string; value: string; enabled: boolean }[] = [],
): Record<string, string> {
	console.log("prepareVariables called with:", {
		workspaceVariablesCount: variables.length,
		globalVariablesCount: globalVariables.length,
		globalVariablesSample: globalVariables.slice(0, 3),
	});

	const variableMap: Record<string, string> = {};

	for (const variable of globalVariables) {
		if (variable.enabled) {
			variableMap[variable.key] = variable.value;
		}
	}

	for (const variable of variables) {
		if (variable.enabled) {
			variableMap[variable.key] = variable.value;
		}
	}

	console.log("prepareVariables result keys:", Object.keys(variableMap));
	return variableMap;
}

export async function launchAction(
	action: Action,
	context: LaunchContext,
): Promise<LaunchResult> {
	console.log(`Launching action: ${action.name} (type: ${action.action_type})`);

	try {
		let config: ActionConfig;
		try {
			config = JSON.parse(action.config) as ActionConfig;
		} catch {
			throw new Error(`Invalid action configuration: ${action.config}`);
		}

		const normalized = normalizeActionConfig(
			action.action_type,
			config,
			context,
		);
		if (normalized.type === "tool" || normalized.type === "command") {
			const cfg = normalized.config as CommandActionConfig | ToolActionConfig;
			cfg.detached = action.detached ?? cfg.detached ?? false;
			cfg.track_process = action.track_process;
		}
		let result: LaunchResult;
		switch (normalized.type) {
			case "tool":
				result = await launchToolAction(
					normalized.config as ToolActionConfig,
					context,
					action.id,
				);
				break;
			case "command":
				result = await launchCommandAction(
					normalized.config as CommandActionConfig,
					context,
					action.id,
				);
				break;
			case "url":
				result = await launchURLAction(
					normalized.config as URLActionConfig,
					context,
				);
				break;
			case "delay":
				result = await launchDelayAction(
					normalized.config as DelayActionConfig,
					context,
				);
				break;
			default:
				throw new Error(`Unknown action type: ${normalized.type}`);
		}

		if (result.success && result.processId && action.track_process) {
			trackRunningAction(action, result.processId, context, result.runId);
		}

		return result;
	} catch (error) {
		const message = `Failed to launch action ${action.name}: ${error}`;
		console.error(message);
		return {
			success: false,
			message,
		};
	}
}

export async function launchWorkspace(
	actions: Action[],
	context: LaunchContext,
): Promise<LaunchResult[]> {
	console.log(`Launching workspace with ${actions.length} actions`);

	const results: LaunchResult[] = [];

	const sortedActions = [...actions].sort(
		(a, b) => a.order_index - b.order_index,
	);

	for (const action of sortedActions) {
		const result = await launchAction(action, context);
		results.push(result);

		if (!result.success) {
			console.warn(
				`Action ${action.name} failed, continuing with remaining actions`,
			);
		}
	}

	return results;
}

async function launchCommandAction(
	config: CommandActionConfig,
	context: LaunchContext,
	actionId?: number,
): Promise<LaunchResult> {
	const commandStr = replaceVariables(config.command, context.variables);
	const args =
		config.args?.map((arg) => replaceVariables(arg, context.variables)) || [];
	const detached = config.detached === true;

	console.log(
		`Executing command: ${commandStr} ${args.join(" ")} (detached: ${detached})`,
	);

	if (detached) {
		const { invoke } = await import("@tauri-apps/api/core");
		const workingDir =
			context.variables.TEMP ||
			context.variables.TMP ||
			(isWindows() ? "C:\\Windows\\Temp" : "/tmp");
		const result = (await invoke("launch_action", {
			request: {
				action_id: actionId ?? 0,
				workspace_id: context.workspaceId,
				action_type: "command",
				config: {
					command: commandStr,
					args,
					detached: true,
					working_directory: workingDir,
					track_process: config.track_process,
				},
				variables: context.variables,
			},
		})) as {
			success?: boolean;
			message?: string;
			process_id?: number;
			run_id?: number;
		};
		return {
			success: Boolean(result?.success),
			message: result?.message || `Command launched (detached): ${commandStr}`,
			processId: result?.process_id,
			runId: result?.run_id,
		};
	}

	try {
		const quotedArgs = args.map((arg) => `"${arg}"`).join(" ");
		const fullCommand = quotedArgs ? `${commandStr} ${quotedArgs}` : commandStr;
		const cmdArgs = ["/c", fullCommand];

		const userTemp =
			context.variables.TEMP || context.variables.TMP || "C:\\Windows\\Temp";
		const command = Command.create("cmd", cmdArgs, { cwd: userTemp });
		const child = await command.spawn();

		console.log(`Command launched successfully`);

		return {
			success: true,
			message: `Command executed successfully: ${commandStr}`,
			processId: child.pid,
		};
	} catch (error) {
		throw new Error(`Failed to execute command: ${error}`);
	}
}

async function launchURLAction(
	config: URLActionConfig,
	context: LaunchContext,
): Promise<LaunchResult> {
	const url = replaceVariables(config.url, context.variables);

	console.log(`Opening URL: ${url}`);

	try {
		await openPath(url);

		return {
			success: true,
			message: `URL opened successfully: ${url}`,
		};
	} catch (error) {
		throw new Error(`Failed to open URL: ${error}`);
	}
}

async function launchToolAction(
	config: ToolActionConfig,
	context: LaunchContext,
	actionId?: number,
): Promise<LaunchResult> {
	console.log(
		`Launching tool action: ${config.tool_name} (source: ${config.source})`,
	);

	try {
		if (config.source === "custom") {
			return await launchCustomTool(config, context, actionId);
		}

		return await launchSavedTool(config, context, actionId);
	} catch (error) {
		throw new Error(`Failed to launch tool: ${error}`);
	}
}

function createCliCommand(
	processedCommand: string,
	processedArgs: string[],
	isDetached: boolean,
	cwd?: string,
): Awaited<ReturnType<typeof Command.create>> {
	const workingDir = cwd || (isWindows() ? "C:\\Windows\\Temp" : "/tmp");

	if (!isDetached && isWindows()) {
		const fullCommand = `${processedCommand} ${processedArgs.join(" ")}`;
		return Command.create(
			"powershell",
			[
				"-Command",
				`Start-Process powershell -ArgumentList '-NoExit','-Command','${fullCommand.replace(/'/g, "''")}'`,
			],
			{ cwd: workingDir },
		);
	}

	if (!isDetached && !isWindows()) {
		return Command.create(
			"x-terminal-emulator",
			[
				"-e",
				"sh",
				"-c",
				`${processedCommand} ${processedArgs.join(" ")}; read -p 'Press enter to close'`,
			],
			{ cwd: workingDir },
		);
	}

	if (isDetached && isWindows()) {
		const escapedArgs = processedArgs
			.map((a) => `'${a.replace(/'/g, "''")}'`)
			.join(",");
		const psScript = `
          $proc = Start-Process -FilePath '${processedCommand.replace(/'/g, "''")}' -ArgumentList ${escapedArgs} -WorkingDirectory '${workingDir.replace(/'/g, "''")}' -WindowStyle Hidden -PassThru
          Write-Output $proc.Id
        `
			.trim()
			.replace(/\n\s+/g, "; ");

		return Command.create(
			"powershell",
			["-NoProfile", "-OutputFormat", "Text", "-Command", psScript],
			{
				cwd: workingDir,
			},
		);
	}

	const argsJoined = processedArgs.join(" ");
	const shellCommand = `nohup '${processedCommand}' ${argsJoined} > /dev/null 2>&1 & echo $!`;
	return Command.create("sh", ["-c", shellCommand], { cwd: workingDir });
}

function createBinaryCommand(
	processedBinaryPath: string,
	processedArgs: string[],
	cwd?: string,
): Awaited<ReturnType<typeof Command.create>> {
	const workingDir = cwd || (isWindows() ? "C:\\Windows\\Temp" : "/tmp");

	if (isWindows()) {
		const escapedArgs = processedArgs
			.map((arg) => `'${arg.replace(/'/g, "''")}'`)
			.join(",");
		const argsStr =
			processedArgs.length > 0 ? `-ArgumentList ${escapedArgs}` : "";

		const binaryName =
			processedBinaryPath.split("\\").pop()?.replace(".exe", "") || "";
		const fullCommand = `
   $proc = Start-Process -FilePath '${processedBinaryPath}' ${argsStr} -WorkingDirectory '${workingDir}' -PassThru
   Start-Sleep -Milliseconds 500
   $actualProc = Get-Process -Name '${binaryName}' -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -gt (Get-Date).AddSeconds(-2) } | Select-Object -First 1
   if ($actualProc) { $actualProc.Id } else { $proc.Id }
  `
			.trim()
			.replace(/\n/g, "; ");
		return Command.create("powershell", ["-Command", fullCommand], {
			cwd: workingDir,
		});
	}

	const argsJoined = processedArgs.join(" ");
	const shellCommand = `nohup '${processedBinaryPath}' ${argsJoined} > /dev/null 2>&1 & echo $!`;
	return Command.create("sh", ["-c", shellCommand], { cwd: workingDir });
}

async function launchCustomTool(
	config: Extract<ToolActionConfig, { source: "custom" }>,
	context: LaunchContext,
	actionId?: number,
): Promise<LaunchResult> {
	console.log(`Launching custom tool: ${config.tool_name}`);

	const hasCommand = config.command && config.command.trim() !== "";
	const hasBinaryPath = config.binary_path && config.binary_path.trim() !== "";

	if (!hasCommand && !hasBinaryPath) {
		throw new Error(
			`Custom tool ${config.tool_name} has neither command nor binary_path`,
		);
	}

	const args = config.args || [];
	const processedArgs = args.map((arg: string) =>
		replaceVariables(arg, context.variables),
	);

	const isDetached = config.detached === true;

	const workingDir = config.working_directory
		? replaceVariables(config.working_directory, context.variables)
		: context.variables.TEMP ||
			context.variables.TMP ||
			(isWindows() ? "C:\\Windows\\Temp" : "/tmp");

	if (isDetached) {
		const { invoke } = await import("@tauri-apps/api/core");
		const cfg: Record<string, unknown> = {
			tool_type: hasCommand ? "cli" : "binary",
			detached: true,
			working_directory: workingDir,
			track_process: config.track_process,
		};
		if (hasCommand) {
			cfg.command = replaceVariables(config.command || "", context.variables);
			cfg.args = processedArgs;
		} else {
			cfg.binary_path = replaceVariables(
				config.binary_path || "",
				context.variables,
			);
			cfg.args = processedArgs;
		}
		const result = (await invoke("launch_action", {
			request: {
				action_id: actionId ?? 0,
				workspace_id: context.workspaceId,
				action_type: "tool",
				config: cfg,
				variables: context.variables,
			},
		})) as {
			success?: boolean;
			message?: string;
			process_id?: number;
			run_id?: number;
		};
		return {
			success: Boolean(result?.success),
			message: result?.message || `${config.tool_name} launched (detached)`,
			processId: result?.process_id,
			runId: result?.run_id,
		};
	}

	let cmd: Awaited<ReturnType<typeof Command.create>>;
	if (hasCommand) {
		const commandStr = config.command || "";
		const processedCommand = replaceVariables(commandStr, context.variables);
		console.log(
			`Executing command: ${processedCommand} with args:`,
			processedArgs,
			`in directory: ${workingDir}`,
			`detached: ${isDetached}`,
		);

		cmd = createCliCommand(
			processedCommand,
			processedArgs,
			isDetached,
			workingDir,
		);
	} else {
		const binaryPath = config.binary_path || "";
		const processedBinaryPath = replaceVariables(binaryPath, context.variables);
		console.log(
			`Executing binary: ${processedBinaryPath} with args:`,
			processedArgs,
			`in directory: ${workingDir}`,
		);

		cmd = createBinaryCommand(processedBinaryPath, processedArgs, workingDir);
	}

	if (hasCommand && isDetached && isWindows()) {
		try {
			const output = await cmd.execute();
			const actualPid = Number.parseInt(output.stdout.trim(), 10);
			if (Number.isNaN(actualPid)) {
				console.error("Failed to parse PID from output:", output.stdout);
				throw new Error(
					`Could not determine process ID. Output: ${output.stdout}`,
				);
			}
			console.log(`Custom tool launched with actual PID: ${actualPid}`);

			return {
				success: true,
				message: `${config.tool_name} launched successfully`,
				processId: actualPid,
			};
		} catch (error) {
			console.error("Error launching detached command:", error);
			throw error;
		}
	} else if (hasCommand) {
		let resolvedPid: number | undefined;
		let parentPidForResolve: number | undefined;
		if (isDetached && !isWindows()) {
			const output = await cmd.execute();
			const parsed = Number.parseInt(output.stdout.trim(), 10);
			resolvedPid = Number.isNaN(parsed) ? undefined : parsed;
			console.log(`Custom tool launched with PID: ${resolvedPid}`);
		} else {
			const child = await cmd.spawn();
			parentPidForResolve = (child as { pid: number }).pid;
			resolvedPid = parentPidForResolve;
			console.log(`Custom tool launched with PID: ${resolvedPid}`);
		}

		if (!isDetached && isWindows() && parentPidForResolve) {
			try {
				const { invoke } = await import("@tauri-apps/api/core");
				let expectedName: string | undefined;
				const firstArg = processedArgs[0];
				if (
					firstArg &&
					(firstArg.endsWith(".exe") ||
						firstArg.includes("\\") ||
						firstArg.includes("/"))
				) {
					expectedName = firstArg.split(/[/\\]/).pop();
				} else {
					const cmdCandidate = (config.command || "").trim();
					const localProcessed = cmdCandidate
						? replaceVariables(cmdCandidate, context.variables)
						: "";
					const lowered = localProcessed.toLowerCase();
					if (lowered && lowered !== "powershell" && lowered !== "cmd") {
						expectedName = localProcessed.split(/[/\\]/).pop();
					}
				}
				const exclude = [
					"powershell",
					"cmd",
					"conhost",
					"sh",
					"bash",
					"x-terminal-emulator",
					"npm",
					"npx",
					"yarn",
					"pnpm",
					"bun",
				];
				const result = (await invoke("resolve_descendant_pid", {
					req: {
						parent_pid: parentPidForResolve,
						expected_name: expectedName,
						exclude_names: exclude,
						max_wait_ms: 2000,
					},
				})) as number | null;
				if (typeof result === "number" && result > 0) {
					resolvedPid = result;
					console.log(`Resolved descendant PID: ${resolvedPid}`);
				}
			} catch (e) {
				console.warn("Failed to resolve descendant PID, using wrapper PID", e);
			}
		}

		return {
			success: true,
			message: `${config.tool_name} launched successfully`,
			processId: resolvedPid,
		};
	} else if (isWindows()) {
		const output = await cmd.execute();
		const actualPid = Number.parseInt(output.stdout.trim(), 10);
		console.log(`Custom tool launched with actual PID: ${actualPid}`);

		return {
			success: true,
			message: `${config.tool_name} launched successfully`,
			processId: actualPid,
		};
	} else {
		const output = await cmd.execute();
		const actualPid = Number.parseInt(output.stdout.trim(), 10);
		console.log(`Custom tool launched with PID: ${actualPid}`);

		return {
			success: true,
			message: `${config.tool_name} launched successfully`,
			processId: actualPid,
		};
	}
}

async function launchSavedTool(
	config: Extract<ToolActionConfig, { source: "saved" }>,
	context: LaunchContext,
	actionId?: number,
): Promise<LaunchResult> {
	console.log(
		`Launching saved tool: ${config.tool_name} (ID: ${config.tool_id})`,
	);

	const { invoke } = await import("@tauri-apps/api/core");

	const result = await invoke("launch_action", {
		request: {
			action_id: actionId ?? 0,
			workspace_id: context.workspaceId,
			action_type: "tool",
			config: {
				tool_id: config.tool_id,
				placeholder_values: config.placeholder_values,
				...(config.detached === true ? { detached: true } : {}),
			},
			variables: context.variables,
		},
	});

	const success =
		result && typeof result === "object" && "success" in result
			? (result as { success: boolean }).success
			: false;
	const message =
		result && typeof result === "object" && "message" in result
			? (result as { message: string }).message
			: `${config.tool_name} launched successfully via backend`;
	const processId =
		result && typeof result === "object" && "process_id" in result
			? (result as { process_id?: number }).process_id
			: undefined;
	const runId =
		result && typeof result === "object" && "run_id" in result
			? (result as { run_id?: number }).run_id
			: undefined;

	return {
		success,
		message,
		processId,
		runId,
	};
}

async function launchDelayAction(
	config: DelayActionConfig,
	_context: LaunchContext,
): Promise<LaunchResult> {
	console.log(`Starting delay for ${config.duration_ms} ms`);

	return new Promise((resolve) => {
		setTimeout(() => {
			console.log(`Delay completed: ${config.duration_ms} ms`);
			resolve({
				success: true,
				message: `Delay completed: ${config.duration_ms} ms`,
			});
		}, config.duration_ms);
	});
}
