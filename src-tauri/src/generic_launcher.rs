use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::ShellExt;

use crate::launcher_core::{
    spawn_attached_with_logs, spawn_detached, AttachedSpawnRequest, DetachedSpawnRequest,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpawnRequest {
    pub command: String,
    pub args: Option<Vec<String>>,
    pub working_directory: Option<String>,
    pub keep_terminal_open: Option<bool>,
    pub detached: Option<bool>,
    pub action_id: Option<i64>,
    pub workspace_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SpawnResult {
    pub success: bool,
    pub message: String,
    pub process_id: Option<u32>,
    pub run_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SpawnLogEvent {
    pub action_id: Option<i64>,
    pub workspace_id: Option<i64>,
    pub run_id: i64,
    pub level: String,
    pub message: String,
}

fn emit_log(
    app: &AppHandle,
    action_id: Option<i64>,
    workspace_id: Option<i64>,
    run_id: i64,
    level: &str,
    message: &str,
) {
    let _ = app.emit(
        "action-log",
        SpawnLogEvent {
            action_id,
            workspace_id,
            run_id,
            level: level.to_string(),
            message: message.to_string(),
        },
    );
}

#[tauri::command]
pub async fn spawn_process(app: AppHandle, request: SpawnRequest) -> Result<SpawnResult, String> {
    let run_id = Utc::now().timestamp_millis();
    let args = request.args.unwrap_or_default();
    let keep_open = request.keep_terminal_open.unwrap_or(false);
    let detached = request.detached.unwrap_or(false);

    emit_log(
        &app,
        request.action_id,
        request.workspace_id,
        run_id,
        "info",
        &format!("Spawning: {} {:?}", request.command, args),
    );

    let pid = if keep_open {
        let mut full_command = request.command.clone();
        if !args.is_empty() {
            full_command.push_str(&format!(" {}", args.join(" ")));
        }
        full_command.push_str(" & pause");

        let mut cmd = app.shell().command("cmd");
        cmd = cmd.args(["/k", &full_command]);
        if let Some(dir) = &request.working_directory {
            cmd = cmd.current_dir(dir);
        }
        match cmd.spawn() {
            Ok((_rx, child)) => child.pid(),
            Err(e) => return Err(format!("Failed to spawn: {}", e)),
        }
    } else if detached {
        let track_process = true;
        spawn_detached(
            &app,
            DetachedSpawnRequest {
                action_id: request.action_id,
                workspace_id: request.workspace_id,
                run_id,
                command: request.command.clone(),
                args: args.clone(),
                working_directory: request.working_directory.clone(),
                track_process,
            },
        )
        .await?
    } else {
        let pid = spawn_attached_with_logs(
            &app,
            AttachedSpawnRequest {
                action_id: request.action_id,
                workspace_id: request.workspace_id,
                run_id,
                command: request.command.clone(),
                args: args.clone(),
                working_directory: request.working_directory.clone(),
                track_process: false,
            },
        )
        .await?;
        pid
    };

    if detached {
        return Ok(SpawnResult {
            success: true,
            message: format!("Spawned (detached): {}", request.command),
            process_id: Some(pid),
            run_id: Some(run_id),
        });
    }

    Ok(SpawnResult {
        success: true,
        message: format!("Spawned: {}", request.command),
        process_id: Some(pid),
        run_id: Some(run_id),
    })
}

#[tauri::command]
pub async fn auto_launch_actions(
    app: AppHandle,
    requests: Vec<SpawnRequest>,
) -> Result<Vec<SpawnResult>, String> {
    let mut results = Vec::with_capacity(requests.len());
    for req in requests {
        let mut effective = req;
        if effective.detached.is_none() {
            effective.detached = Some(true);
        }
        match spawn_process(app.clone(), effective).await {
            Ok(res) => results.push(res),
            Err(err) => results.push(SpawnResult {
                success: false,
                message: err,
                process_id: None,
                run_id: None,
            }),
        }
    }
    Ok(results)
}
