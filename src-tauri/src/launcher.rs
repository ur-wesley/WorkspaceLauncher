use crate::launcher_utils::replace_variables;
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

#[derive(Debug, Clone, Serialize)]
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

use crate::launcher_core::{
    spawn_attached_with_logs, spawn_detached, AttachedSpawnRequest, DetachedSpawnRequest,
};

async fn spawn_with_candidates(
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
    let detached = request
        .config
        .get("detached")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let track_process = request
        .config
        .get("track_process")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let working_directory = request
        .config
        .get("working_directory")
        .and_then(|v| v.as_str())
        .map(|s| replace_variables(s, &request.variables));

    for program in candidates {
        if detached {
            match spawn_detached(
                app,
                DetachedSpawnRequest {
                    action_id: Some(request.action_id),
                    workspace_id: Some(request.workspace_id),
                    run_id,
                    command: program.clone(),
                    args: args.to_vec(),
                    working_directory: working_directory.clone(),
                    track_process,
                },
            )
            .await
            {
                Ok(pid) => return Ok((program.clone(), pid)),
                Err(error) => {
                    let message =
                        format!("Failed to launch {} via {}: {}", tool_name, program, error);
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
        } else {
            match spawn_attached_with_logs(
                app,
                AttachedSpawnRequest {
                    action_id: Some(request.action_id),
                    workspace_id: Some(request.workspace_id),
                    run_id,
                    command: program.clone(),
                    args: args.to_vec(),
                    working_directory: working_directory.clone(),
                    track_process,
                },
            )
            .await
            {
                Ok(pid) => return Ok((program.clone(), pid)),
                Err(error) => {
                    let message =
                        format!("Failed to launch {} via {}: {}", tool_name, program, error);
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

    let keep_terminal_open = config
        .get("keep_terminal_open")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);

    let command_str = replace_variables(command_str, &request.variables);
    let args: Vec<String> = args
        .iter()
        .map(|arg| replace_variables(arg, &request.variables))
        .collect();

    let working_directory_resolved =
        working_directory.map(|dir| replace_variables(dir, &request.variables));

    emit_log(
        &app,
        request.action_id,
        request.workspace_id,
        run_id,
        "info",
        &format!("Executing command: {} {:?}", command_str, args),
    );

    let detached_cfg = config
        .get("detached")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);

    let process_id = if keep_terminal_open {
        let mut full_command = command_str.clone();
        if !args.is_empty() {
            full_command.push_str(&format!(" {}", args.join(" ")));
        }
        full_command.push_str(" & pause");

        let mut cmd = app.shell().command("cmd");
        cmd = cmd.args(["/k", &full_command]);

        if let Some(dir) = &working_directory_resolved {
            cmd = cmd.current_dir(dir);
        }

        match cmd.spawn() {
            Ok((_rx, child)) => child.pid(),
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
                return Err(format!("Failed to execute command: {}", error));
            }
        }
    } else {
        match crate::generic_launcher::spawn_process(
            app.clone(),
            crate::generic_launcher::SpawnRequest {
                command: command_str.clone(),
                args: Some(args.clone()),
                working_directory: working_directory_resolved.clone(),
                keep_terminal_open: Some(false),
                detached: Some(detached_cfg),
                action_id: Some(request.action_id),
                workspace_id: Some(request.workspace_id),
            },
        )
        .await
        {
            Ok(res) => res.process_id.unwrap_or(0),
            Err(error) => {
                emit_log(
                    &app,
                    request.action_id,
                    request.workspace_id,
                    run_id,
                    "error",
                    &error,
                );
                emit_completed(
                    &app,
                    request.action_id,
                    request.workspace_id,
                    run_id,
                    None,
                    false,
                );
                return Err(error);
            }
        }
    };

    let detached = detached_cfg;

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

    Ok(LaunchResult {
        success: true,
        message: format!("Command started: {}", command_str),
        process_id: Some(process_id),
        run_id: Some(run_id),
    })
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

    let default_tool_name = "Tool";
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

    let plan = if config.get("tool_id").is_some() {
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

        let binary_path = resolved
            .get("binary_path")
            .cloned()
            .ok_or("Missing binary_path placeholder for tool")?;
        let args: Vec<String> = resolved
            .get("args")
            .map(|v| v.to_string())
            .map(|s| {
                if s.is_empty() {
                    vec![]
                } else {
                    s.split_whitespace().map(|x| x.to_string()).collect()
                }
            })
            .unwrap_or_default();

        ToolCommandPlan {
            tool_name: tool_name.clone(),
            description: format!("Launching {}", tool_name),
            success_message: format!("{} launched", tool_name),
            candidates: vec![binary_path],
            args,
        }
    } else {
        let tool_type = config
            .get("tool_type")
            .and_then(|value| value.as_str())
            .unwrap_or("binary");

        let (binary_path, args) = if tool_type == "cli" {
            let command = config
                .get("command")
                .and_then(|value| value.as_str())
                .ok_or("Missing command in custom CLI tool action config")?;

            let args: Vec<String> = config
                .get("args")
                .and_then(|value| value.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str())
                        .map(|s| replace_variables(s, &request.variables))
                        .collect()
                })
                .unwrap_or_default();

            (command.to_string(), args)
        } else {
            let binary_path = config
                .get("binary_path")
                .and_then(|value| value.as_str())
                .ok_or("Missing binary_path in custom binary tool action config")?;

            let args: Vec<String> = config
                .get("args")
                .and_then(|value| value.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str())
                        .map(|s| replace_variables(s, &request.variables))
                        .collect()
                })
                .unwrap_or_default();

            (binary_path.to_string(), args)
        };

        ToolCommandPlan {
            tool_name: tool_name.clone(),
            description: format!("Launching {}", tool_name),
            success_message: format!("{} launched", tool_name),
            candidates: vec![binary_path],
            args,
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
    )
    .await
    {
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

    let _ = app.emit(
        "action-started",
        ActionStartedEvent {
            action_id: request.action_id,
            workspace_id: request.workspace_id,
            run_id,
            process_id: Some(process_id),
        },
    );

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

#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_spawn_hidden_process_echo() {
        #[cfg(target_os = "windows")]
        {
            let args = vec!["/C".to_string(), "echo".to_string(), "hello".to_string()];
            let pid = crate::launcher_utils::spawn_hidden_process("cmd", &args, None)
                .await
                .expect("failed to spawn hidden process");
            assert!(pid > 0);
        }

        #[cfg(not(target_os = "windows"))]
        {
            let args = vec!["-c".to_string(), "echo hello".to_string()];
            let pid = crate::launcher_utils::spawn_hidden_process("sh", &args, None)
                .await
                .expect("failed to spawn hidden process");
            assert!(pid > 0);
        }
    }

    #[tokio::test]
    async fn test_spawn_hidden_process_working_dir() {
        let (cmd, args): (&str, Vec<String>) = if cfg!(target_os = "windows") {
            (
                "cmd",
                vec!["/C".to_string(), "echo".to_string(), "ok".to_string()],
            )
        } else {
            ("sh", vec!["-c".to_string(), "echo ok".to_string()])
        };
        let pid = crate::launcher_utils::spawn_hidden_process(cmd, &args, Some("."))
            .await
            .expect("failed to spawn with working dir");
        assert!(pid > 0);
    }
}
