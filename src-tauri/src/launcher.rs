use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use tauri::{AppHandle, Emitter};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_shell::ShellExt;
use tokio::time::{sleep, Duration};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchActionRequest {
    pub workspace_id: i64,
    pub action_id: i64,
    pub action_type: String,
    pub config: Value,
    pub variables: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchWorkspaceRequest {
    pub workspace_id: i64,
    pub actions: Vec<LaunchActionRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchResult {
    pub success: bool,
    pub message: String,
    pub process_id: Option<u32>,
    pub run_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ActionStartedEvent {
    pub action_id: i64,
    pub workspace_id: i64,
    pub run_id: i64,
    pub process_id: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ActionCompletedEvent {
    pub action_id: i64,
    pub workspace_id: i64,
    pub run_id: i64,
    pub exit_code: Option<i32>,
    pub success: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct ActionLogEvent {
    pub action_id: i64,
    pub workspace_id: i64,
    pub run_id: i64,
    pub level: String,
    pub message: String,
}

fn replace_variables(input: &str, variables: &HashMap<String, String>) -> String {
    let mut result = input.to_string();
    for (key, value) in variables {
        let placeholder = format!("${{{}}}", key);
        result = result.replace(&placeholder, value);
    }
    result
}

fn vscode_candidates() -> Vec<String> {
    let mut candidates = vec![
        "code".to_string(),
        "code.cmd".to_string(),
        "code.exe".to_string(),
    ];
    if let Ok(userprofile) = std::env::var("USERPROFILE") {
        candidates.push(format!(
            "{}\\AppData\\Local\\Programs\\Microsoft VS Code\\bin\\code.cmd",
            userprofile
        ));
    }
    candidates.push("C:\\Program Files\\Microsoft VS Code\\bin\\code.cmd".to_string());
    candidates.push("C:\\Program Files (x86)\\Microsoft VS Code\\bin\\code.cmd".to_string());
    candidates
}

fn cursor_candidates() -> Vec<String> {
    let mut candidates = vec!["cursor".to_string(), "cursor.exe".to_string()];
    if let Ok(userprofile) = std::env::var("USERPROFILE") {
        candidates.push(format!(
            "{}\\AppData\\Local\\Programs\\Cursor\\Cursor.exe",
            userprofile
        ));
    }
    candidates
}

fn spawn_with_candidates(
    app: &AppHandle,
    request: &LaunchActionRequest,
    run_id: i64,
    tool_name: &str,
    candidates: &[String],
    args: &[String],
) -> Result<(String, u32), String> {
    if candidates.is_empty() {
        return Err(format!("No command candidates provided for {}", tool_name));
    }

    let mut last_error: Option<String> = None;

    for program in candidates {
        let mut command = app.shell().command(program);
        if !args.is_empty() {
            command = command.args(args.to_vec());
        }

        match command.spawn() {
            Ok((_rx, child)) => return Ok((program.clone(), child.pid())),
            Err(error) => {
                let message = format!("Failed to launch {} via {}: {}", tool_name, program, error);
                emit_log(
                    app,
                    request.action_id,
                    request.workspace_id,
                    run_id,
                    "warn",
                    &message,
                );
                last_error = Some(message);
            }
        }
    }

    Err(last_error.unwrap_or_else(|| {
        format!(
            "Failed to launch {}: no command candidates succeeded",
            tool_name
        )
    }))
}

#[tauri::command]
pub async fn launch_action(
    app: AppHandle,
    request: LaunchActionRequest,
) -> Result<LaunchResult, String> {
    let run_id = Utc::now().timestamp_millis();

    app.emit(
        "action-started",
        ActionStartedEvent {
            action_id: request.action_id,
            workspace_id: request.workspace_id,
            run_id,
            process_id: None,
        },
    )
    .map_err(|error| format!("Failed to emit action-started event: {}", error))?;

    match request.action_type.as_str() {
        "vscode" => launch_vscode_action(app.clone(), &request, run_id).await,
        "eclipse" => launch_eclipse_action(app.clone(), &request, run_id).await,
        "command" => launch_command_action(app.clone(), &request, run_id).await,
        "url" => launch_url_action(app.clone(), &request, run_id).await,
        "delay" => launch_delay_action(app.clone(), &request, run_id).await,
        "tool" => launch_tool_action(app.clone(), &request, run_id).await,
        unknown => Err(format!("Unknown action type: {}", unknown)),
    }
}

#[tauri::command]
pub async fn launch_workspace(
    app: AppHandle,
    mut request: LaunchWorkspaceRequest,
) -> Result<Vec<LaunchResult>, String> {
    request.actions.sort_by_key(|action| action.action_id);

    let mut results = Vec::with_capacity(request.actions.len());

    for action in request.actions {
        match launch_action(app.clone(), action).await {
            Ok(result) => results.push(result),
            Err(error) => results.push(LaunchResult {
                success: false,
                message: error,
                process_id: None,
                run_id: None,
            }),
        }
    }

    Ok(results)
}

async fn launch_vscode_action(
    app: AppHandle,
    request: &LaunchActionRequest,
    run_id: i64,
) -> Result<LaunchResult, String> {
    let config = &request.config;
    let workspace_path = config
        .get("workspace_path")
        .and_then(|value| value.as_str())
        .ok_or("Missing workspace_path in VS Code action config")?;
    let workspace_path = replace_variables(workspace_path, &request.variables);

    let new_window = config
        .get("new_window")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);

    let mut args = Vec::new();
    if new_window {
        args.push("--new-window".to_string());
    }
    args.push(workspace_path.clone());

    let candidates = vscode_candidates();

    emit_log(
        &app,
        request.action_id,
        request.workspace_id,
        run_id,
        "info",
        &format!("Launching VS Code with workspace: {}", workspace_path),
    );

    let (program_used, process_id) =
        match spawn_with_candidates(&app, request, run_id, "VS Code", &candidates, &args) {
            Ok(result) => result,
            Err(error_message) => {
                emit_log(
                    &app,
                    request.action_id,
                    request.workspace_id,
                    run_id,
                    "error",
                    &error_message,
                );
                emit_completed(
                    &app,
                    request.action_id,
                    request.workspace_id,
                    run_id,
                    None,
                    false,
                );
                return Err(error_message);
            }
        };

    emit_log(
        &app,
        request.action_id,
        request.workspace_id,
        run_id,
        "info",
        &format!(
            "VS Code launched via {} (workspace: {})",
            program_used, workspace_path
        ),
    );
    emit_completed(
        &app,
        request.action_id,
        request.workspace_id,
        run_id,
        Some(0),
        true,
    );

    Ok(LaunchResult {
        success: true,
        message: format!(
            "VS Code launched successfully for workspace: {}",
            workspace_path
        ),
        process_id: Some(process_id),
        run_id: Some(run_id),
    })
}

async fn launch_eclipse_action(
    app: AppHandle,
    request: &LaunchActionRequest,
    run_id: i64,
) -> Result<LaunchResult, String> {
    let config = &request.config;
    let workspace_path = config
        .get("workspace_path")
        .and_then(|value| value.as_str())
        .ok_or("Missing workspace_path in Eclipse action config")?;
    let binary_path = config
        .get("binary_path")
        .and_then(|value| value.as_str())
        .unwrap_or("eclipse");

    let workspace_path = replace_variables(workspace_path, &request.variables);
    let binary_path = replace_variables(binary_path, &request.variables);

    let mut args = Vec::new();
    args.push("-data".to_string());
    args.push(workspace_path.clone());

    let candidates = vec![binary_path.clone()];

    emit_log(
        &app,
        request.action_id,
        request.workspace_id,
        run_id,
        "info",
        &format!(
            "Launching Eclipse with workspace: {} using {}",
            workspace_path, binary_path
        ),
    );

    let (_, process_id) =
        match spawn_with_candidates(&app, request, run_id, "Eclipse", &candidates, &args) {
            Ok(result) => result,
            Err(error_message) => {
                emit_log(
                    &app,
                    request.action_id,
                    request.workspace_id,
                    run_id,
                    "error",
                    &error_message,
                );
                emit_completed(
                    &app,
                    request.action_id,
                    request.workspace_id,
                    run_id,
                    None,
                    false,
                );
                return Err(error_message);
            }
        };

    emit_completed(
        &app,
        request.action_id,
        request.workspace_id,
        run_id,
        Some(0),
        true,
    );

    Ok(LaunchResult {
        success: true,
        message: format!(
            "Eclipse launched successfully for workspace: {}",
            workspace_path
        ),
        process_id: Some(process_id),
        run_id: Some(run_id),
    })
}

async fn launch_command_action(
    app: AppHandle,
    request: &LaunchActionRequest,
    run_id: i64,
) -> Result<LaunchResult, String> {
    let config = &request.config;
    let command_str = config
        .get("command")
        .and_then(|value| value.as_str())
        .ok_or("Missing command in command action config")?;
    let args = config
        .get("args")
        .and_then(|value| value.as_array())
        .map(|values| {
            values
                .iter()
                .filter_map(|value| value.as_str())
                .map(|value| value.to_string())
                .collect::<Vec<String>>()
        })
        .unwrap_or_default();

    let working_directory = config
        .get("working_directory")
        .and_then(|value| value.as_str());

    let command_str = replace_variables(command_str, &request.variables);
    let args: Vec<String> = args
        .iter()
        .map(|arg| replace_variables(arg, &request.variables))
        .collect();

    let mut command = app.shell().command(&command_str);
    if !args.is_empty() {
        command = command.args(args.clone());
    }
    if let Some(dir) = working_directory {
        let resolved = replace_variables(dir, &request.variables);
        command = command.current_dir(&resolved);
    }

    emit_log(
        &app,
        request.action_id,
        request.workspace_id,
        run_id,
        "info",
        &format!("Executing command: {} {:?}", command_str, args),
    );

    match command.spawn() {
        Ok((_rx, child)) => {
            let process_id = child.pid();
            let detached = config
                .get("detached")
                .and_then(|value| value.as_bool())
                .unwrap_or(false);

            if detached {
                emit_completed(
                    &app,
                    request.action_id,
                    request.workspace_id,
                    run_id,
                    Some(0),
                    true,
                );
                return Ok(LaunchResult {
                    success: true,
                    message: format!("Command launched successfully (detached): {}", command_str),
                    process_id: Some(process_id),
                    run_id: Some(run_id),
                });
            }

            emit_completed(
                &app,
                request.action_id,
                request.workspace_id,
                run_id,
                Some(0),
                true,
            );

            Ok(LaunchResult {
                success: true,
                message: format!("Command started: {}", command_str),
                process_id: Some(process_id),
                run_id: Some(run_id),
            })
        }
        Err(error) => {
            emit_log(
                &app,
                request.action_id,
                request.workspace_id,
                run_id,
                "error",
                &format!("Failed to execute command: {}", error),
            );
            emit_completed(
                &app,
                request.action_id,
                request.workspace_id,
                run_id,
                None,
                false,
            );

            Err(format!("Failed to execute command: {}", error))
        }
    }
}

async fn launch_url_action(
    app: AppHandle,
    request: &LaunchActionRequest,
    run_id: i64,
) -> Result<LaunchResult, String> {
    let config = &request.config;
    let url = config
        .get("url")
        .and_then(|value| value.as_str())
        .ok_or("Missing url in URL action config")?;
    let url = replace_variables(url, &request.variables);

    emit_log(
        &app,
        request.action_id,
        request.workspace_id,
        run_id,
        "info",
        &format!("Opening URL: {}", url),
    );

    match app.opener().open_url(&url, None::<&str>) {
        Ok(_) => {
            emit_completed(
                &app,
                request.action_id,
                request.workspace_id,
                run_id,
                Some(0),
                true,
            );

            Ok(LaunchResult {
                success: true,
                message: format!("URL opened successfully: {}", url),
                process_id: None,
                run_id: Some(run_id),
            })
        }
        Err(error) => {
            emit_log(
                &app,
                request.action_id,
                request.workspace_id,
                run_id,
                "error",
                &format!("Failed to open URL: {}", error),
            );
            emit_completed(
                &app,
                request.action_id,
                request.workspace_id,
                run_id,
                None,
                false,
            );

            Err(format!("Failed to open URL: {}", error))
        }
    }
}

async fn launch_delay_action(
    app: AppHandle,
    request: &LaunchActionRequest,
    run_id: i64,
) -> Result<LaunchResult, String> {
    let config = &request.config;
    let duration_ms = config
        .get("duration_ms")
        .and_then(|value| value.as_u64())
        .ok_or("Missing duration_ms in delay action config")?;

    emit_log(
        &app,
        request.action_id,
        request.workspace_id,
        run_id,
        "info",
        &format!("Starting delay for {} ms", duration_ms),
    );

    sleep(Duration::from_millis(duration_ms)).await;

    emit_log(
        &app,
        request.action_id,
        request.workspace_id,
        run_id,
        "info",
        &format!("Delay completed: {} ms", duration_ms),
    );
    emit_completed(
        &app,
        request.action_id,
        request.workspace_id,
        run_id,
        Some(0),
        true,
    );

    Ok(LaunchResult {
        success: true,
        message: format!("Delay completed: {} ms", duration_ms),
        process_id: None,
        run_id: Some(run_id),
    })
}

async fn launch_tool_action(
    app: AppHandle,
    request: &LaunchActionRequest,
    run_id: i64,
) -> Result<LaunchResult, String> {
    let config = &request.config;
    let tool_id = config
        .get("tool_id")
        .and_then(|value| value.as_i64())
        .ok_or("Missing tool_id in tool action config")?;

    let placeholder_values = config
        .get("placeholder_values")
        .and_then(|value| value.as_object())
        .ok_or("Missing placeholder_values in tool action config")?;

    let mut resolved = HashMap::new();
    for (name, value) in placeholder_values {
        let value_str = value
            .as_str()
            .ok_or_else(|| format!("Placeholder {} must be a string", name))?;
        let resolved_value = replace_variables(value_str, &request.variables);
        resolved.insert(name.clone(), resolved_value);
    }

    let default_tool_name = match tool_id {
        1 => "VS Code",
        4 => "Explorer",
        8 => "Eclipse",
        9 => "Cursor",
        _ => "Tool",
    };

    let tool_name = config
        .get("tool_name")
        .and_then(|value| value.as_str())
        .unwrap_or(default_tool_name)
        .to_string();

    struct ToolCommandPlan {
        tool_name: String,
        description: String,
        success_message: String,
        candidates: Vec<String>,
        args: Vec<String>,
    }

    let plan = match tool_id {
        1 => {
            let workspace_path = resolved
                .get("workspace_path")
                .ok_or("Missing workspace_path placeholder for VS Code tool")?
                .clone();
            ToolCommandPlan {
                tool_name: tool_name.clone(),
                description: format!("Launching VS Code with workspace: {}", workspace_path),
                success_message: format!(
                    "VS Code launched successfully for workspace: {}",
                    workspace_path
                ),
                candidates: vscode_candidates(),
                args: vec![workspace_path],
            }
        }
        4 => {
            let path = resolved
                .get("path")
                .cloned()
                .filter(|value| !value.is_empty())
                .unwrap_or_else(|| ".".to_string());
            ToolCommandPlan {
                tool_name: tool_name.clone(),
                description: format!("Opening Explorer at: {}", path),
                success_message: format!("File Explorer opened successfully at {}", path),
                candidates: vec!["explorer".to_string()],
                args: vec![path],
            }
        }
        8 => {
            let eclipse_path = resolved
                .get("eclipse_path")
                .ok_or("Missing eclipse_path placeholder for Eclipse tool")?
                .clone();
            let workspace_path = resolved
                .get("workspace_path")
                .ok_or("Missing workspace_path placeholder for Eclipse tool")?
                .clone();
            ToolCommandPlan {
                tool_name: tool_name.clone(),
                description: format!("Launching Eclipse with workspace: {}", workspace_path),
                success_message: format!(
                    "Eclipse launched successfully for workspace: {}",
                    workspace_path
                ),
                candidates: vec![eclipse_path],
                args: vec!["-data".to_string(), workspace_path],
            }
        }
        9 => {
            let project_path = resolved
                .get("project_path")
                .ok_or("Missing project_path placeholder for Cursor tool")?
                .clone();
            ToolCommandPlan {
                tool_name: tool_name.clone(),
                description: format!("Launching Cursor for project: {}", project_path),
                success_message: format!(
                    "Cursor launched successfully for project: {}",
                    project_path
                ),
                candidates: cursor_candidates(),
                args: vec![project_path],
            }
        }
        _ => {
            return Err(format!(
                "Tool with ID {} is not supported by the launcher",
                tool_id
            ));
        }
    };

    emit_log(
        &app,
        request.action_id,
        request.workspace_id,
        run_id,
        "info",
        &plan.description,
    );

    let (program_used, process_id) = match spawn_with_candidates(
        &app,
        request,
        run_id,
        &plan.tool_name,
        &plan.candidates,
        &plan.args,
    ) {
        Ok(result) => result,
        Err(error_message) => {
            emit_log(
                &app,
                request.action_id,
                request.workspace_id,
                run_id,
                "error",
                &error_message,
            );
            emit_completed(
                &app,
                request.action_id,
                request.workspace_id,
                run_id,
                None,
                false,
            );
            return Err(error_message);
        }
    };

    emit_log(
        &app,
        request.action_id,
        request.workspace_id,
        run_id,
        "info",
        &format!(
            "{} launched via {} with args {:?}",
            plan.tool_name, program_used, plan.args
        ),
    );
    emit_completed(
        &app,
        request.action_id,
        request.workspace_id,
        run_id,
        Some(0),
        true,
    );

    Ok(LaunchResult {
        success: true,
        message: plan.success_message,
        process_id: Some(process_id),
        run_id: Some(run_id),
    })
}

fn emit_log(
    app: &AppHandle,
    action_id: i64,
    workspace_id: i64,
    run_id: i64,
    level: &str,
    message: &str,
) {
    let _ = app.emit(
        "action-log",
        ActionLogEvent {
            action_id,
            workspace_id,
            run_id,
            level: level.to_string(),
            message: message.to_string(),
        },
    );
}

fn emit_completed(
    app: &AppHandle,
    action_id: i64,
    workspace_id: i64,
    run_id: i64,
    exit_code: Option<i32>,
    success: bool,
) {
    let _ = app.emit(
        "action-completed",
        ActionCompletedEvent {
            action_id,
            workspace_id,
            run_id,
            exit_code,
            success,
        },
    );
}
