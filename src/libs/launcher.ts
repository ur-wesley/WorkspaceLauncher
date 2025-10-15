import { openPath } from "@tauri-apps/plugin-opener";
import { Command } from "@tauri-apps/plugin-shell";
import { runningActionsService } from "@/services/runningActions";
import type {
  Action,
  ActionConfig,
  CommandActionConfig,
  DelayActionConfig,
  EclipseActionConfig,
  ToolActionConfig,
  URLActionConfig,
  Variable,
  VSCodeActionConfig,
} from "@/types/database";

export interface LaunchContext {
  workspaceId: number;
  variables: Record<string, string>;
}

export interface LaunchResult {
  success: boolean;
  message: string;
  processId?: number;
}

function trackRunningAction(
  action: Action,
  processId: number,
  context: LaunchContext
): void {
  const runningAction = {
    id: `${action.id}-${Date.now()}`,
    workspace_id: context.workspaceId,
    action_id: action.id,
    action_name: action.name,
    process_id: processId,
    started_at: new Date().toISOString(),
  };

  runningActionsService.add(runningAction);
  console.log(`Tracking running action: ${action.name} (PID: ${processId})`);
}

function isWindows(): boolean {
  return navigator.userAgent.includes("Windows");
}

function replaceVariables(
  input: string,
  variables: Record<string, string>
): string {
  let result = input;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
  }
  return result;
}

export function prepareVariables(
  variables: Variable[]
): Record<string, string> {
  const variableMap: Record<string, string> = {};
  for (const variable of variables) {
    if (variable.enabled) {
      variableMap[variable.key] = variable.value;
    }
  }
  return variableMap;
}

export async function launchAction(
  action: Action,
  context: LaunchContext
): Promise<LaunchResult> {
  console.log(`Launching action: ${action.name} (type: ${action.action_type})`);

  try {
    let config: ActionConfig;
    try {
      config = JSON.parse(action.config) as ActionConfig;
    } catch {
      throw new Error(`Invalid action configuration: ${action.config}`);
    }

    let result: LaunchResult;
    switch (action.action_type) {
      case "tool":
        result = await launchToolAction(config as ToolActionConfig, context);
        break;
      case "vscode":
        result = await launchVSCodeAction(config as VSCodeActionConfig, context);
        break;
      case "eclipse":
        result = await launchEclipseAction(config as EclipseActionConfig, context);
        break;
      case "command":
        result = await launchCommandAction(config as CommandActionConfig, context);
        break;
      case "url":
        result = await launchURLAction(config as URLActionConfig, context);
        break;
      case "delay":
        result = await launchDelayAction(config as DelayActionConfig, context);
        break;
      default:
        throw new Error(`Unknown action type: ${action.action_type}`);
    }

    if (result.success && result.processId && action.track_process) {
      trackRunningAction(action, result.processId, context);
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
  context: LaunchContext
): Promise<LaunchResult[]> {
  console.log(`Launching workspace with ${actions.length} actions`);

  const results: LaunchResult[] = [];

  const sortedActions = [...actions].sort(
    (a, b) => a.order_index - b.order_index
  );

  for (const action of sortedActions) {
    const result = await launchAction(action, context);
    results.push(result);

    if (!result.success) {
      console.warn(
        `Action ${action.name} failed, continuing with remaining actions`
      );
    }
  }

  return results;
}

async function launchVSCodeAction(
  config: VSCodeActionConfig,
  context: LaunchContext
): Promise<LaunchResult> {
  const workspacePath = replaceVariables(
    config.workspace_path,
    context.variables
  );

  console.log(`Launching VS Code with workspace: ${workspacePath}`);

  try {
    const args = [workspacePath];
    if (config.new_window) {
      args.push("--new-window");
    }

    const quotedArgs = args.map((arg) => `"${arg}"`).join(" ");
    const cmdArgs = ["/c", `code ${quotedArgs}`];

    const workspaceDir = workspacePath.substring(
      0,
      workspacePath.lastIndexOf("\\")
    );
    const spawnOptions = workspaceDir
      ? { cwd: workspaceDir }
      : { cwd: context.variables.TEMP || "C:\\Windows\\Temp" };

    const command = Command.create("cmd", cmdArgs, spawnOptions);
    const child = await command.spawn();

    console.log(`VS Code launched successfully`);

    return {
      success: true,
      message: `VS Code launched successfully for workspace: ${workspacePath}`,
      processId: child.pid,
    };
  } catch (error) {
    throw new Error(`Failed to launch VS Code: ${error}`);
  }
}

async function launchEclipseAction(
  config: EclipseActionConfig,
  context: LaunchContext
): Promise<LaunchResult> {
  const workspacePath = replaceVariables(
    config.workspace_path,
    context.variables
  );
  const binaryPath = config.binary_path
    ? replaceVariables(config.binary_path, context.variables)
    : "eclipse";

  console.log(`Launching Eclipse with workspace: ${workspacePath}`);

  try {
    const cmdArgs = ["/c", `"${binaryPath}"`, "-data", `"${workspacePath}"`];

    const workspaceParent = workspacePath.substring(
      0,
      workspacePath.lastIndexOf("\\")
    );
    const spawnOptions = workspaceParent ? { cwd: workspaceParent } : undefined;

    const command = Command.create("cmd", cmdArgs, spawnOptions);
    const child = await command.spawn();

    console.log(`Eclipse launched successfully`);

    return {
      success: true,
      message: `Eclipse launched successfully for workspace: ${workspacePath}`,
      processId: child.pid,
    };
  } catch (error) {
    throw new Error(`Failed to launch Eclipse: ${error}`);
  }
}

async function launchCommandAction(
  config: CommandActionConfig,
  context: LaunchContext
): Promise<LaunchResult> {
  const commandStr = replaceVariables(config.command, context.variables);
  const args =
    config.args?.map((arg) => replaceVariables(arg, context.variables)) || [];

  console.log(`Executing command: ${commandStr} ${args.join(" ")}`);

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
  context: LaunchContext
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
  context: LaunchContext
): Promise<LaunchResult> {
  console.log(
    `Launching tool action: ${config.tool_name} (source: ${config.source})`
  );

  try {
    if (config.source === "custom") {
      return await launchCustomTool(config, context);
    }

    return await launchSavedTool(config, context);
  } catch (error) {
    throw new Error(`Failed to launch tool: ${error}`);
  }
}

function createCliCommand(
  processedCommand: string,
  processedArgs: string[],
  isDetached: boolean,
  cwd?: string
): Awaited<ReturnType<typeof Command.create>> {
  const workingDir = cwd || (isWindows() ? "C:\\Windows\\Temp" : "/tmp");

  if (!isDetached && isWindows()) {
    const fullCommand = `${processedCommand} ${processedArgs.join(" ")}`;
    return Command.create(
      "powershell",
      [
        "-Command",
        `Start-Process powershell -ArgumentList '-NoExit','-Command','${fullCommand.replace(
          /'/g,
          "''"
        )}'`,
      ],
      { cwd: workingDir }
    );
  }

  if (!isDetached) {
    return Command.create(
      "x-terminal-emulator",
      [
        "-e",
        "sh",
        "-c",
        `${processedCommand} ${processedArgs.join(
          " "
        )}; read -p 'Press enter to close'`,
      ],
      { cwd: workingDir }
    );
  }

  if (isWindows()) {
    return Command.create(
      "powershell",
      ["-Command", processedCommand, ...processedArgs],
      { cwd: workingDir }
    );
  }

  return Command.create("sh", ["-c", processedCommand, ...processedArgs], {
    cwd: workingDir,
  });
}

function createBinaryCommand(
  processedBinaryPath: string,
  processedArgs: string[],
  cwd?: string
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
  context: LaunchContext
): Promise<LaunchResult> {
  console.log(`Launching custom tool: ${config.tool_name}`);

  const hasCommand = config.command && config.command.trim() !== "";
  const hasBinaryPath = config.binary_path && config.binary_path.trim() !== "";

  if (!hasCommand && !hasBinaryPath) {
    throw new Error(
      `Custom tool ${config.tool_name} has neither command nor binary_path`
    );
  }

  const args = config.args || [];
  const processedArgs = args.map((arg: string) =>
    replaceVariables(arg, context.variables)
  );

  const isDetached = config.detached !== false;

  const workingDir =
    context.variables.TEMP ||
    context.variables.TMP ||
    (isWindows() ? "C:\\Windows\\Temp" : "/tmp");

  let cmd: Awaited<ReturnType<typeof Command.create>>;
  if (hasCommand) {
    const commandStr = config.command || "";
    const processedCommand = replaceVariables(commandStr, context.variables);
    console.log(
      `Executing command: ${processedCommand} with args:`,
      processedArgs
    );

    cmd = createCliCommand(
      processedCommand,
      processedArgs,
      isDetached,
      workingDir
    );
  } else {
    const binaryPath = config.binary_path || "";
    const processedBinaryPath = replaceVariables(binaryPath, context.variables);
    console.log(
      `Executing binary: ${processedBinaryPath} with args:`,
      processedArgs
    );

    cmd = createBinaryCommand(processedBinaryPath, processedArgs, workingDir);
  }

  if (hasCommand) {
    const child = await cmd.spawn();
    console.log(`Custom tool launched with PID: ${child.pid}`);

    return {
      success: true,
      message: `${config.tool_name} launched successfully`,
      processId: child.pid,
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
  context: LaunchContext
): Promise<LaunchResult> {
  console.log(
    `Launching saved tool: ${config.tool_name} (ID: ${config.tool_id})`
  );

  const { invoke } = await import("@tauri-apps/api/core");

  const result = await invoke("launch_action", {
    request: {
      action_id: 0,
      workspace_id: context.workspaceId,
      action_type: "tool",
      config: {
        tool_id: config.tool_id,
        placeholder_values: config.placeholder_values,
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

  return {
    success,
    message,
    processId,
  };
}

async function launchDelayAction(
  config: DelayActionConfig,
  _context: LaunchContext
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
