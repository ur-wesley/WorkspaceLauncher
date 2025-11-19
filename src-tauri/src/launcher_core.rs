use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Clone, Debug)]
pub struct AttachedSpawnRequest {
    pub action_id: Option<i64>,
    pub workspace_id: Option<i64>,
    pub run_id: i64,
    pub command: String,
    pub args: Vec<String>,
    pub working_directory: Option<String>,
    pub track_process: bool,
}

#[derive(Clone, Debug)]
pub struct DetachedSpawnRequest {
    pub action_id: Option<i64>,
    pub workspace_id: Option<i64>,
    pub run_id: i64,
    pub command: String,
    pub args: Vec<String>,
    pub working_directory: Option<String>,
    pub track_process: bool,
}

pub async fn spawn_attached_with_logs(
    app: &AppHandle,
    req: AttachedSpawnRequest,
) -> Result<u32, String> {
    let mut cmd = TokioCommand::new(&req.command);
    if !req.args.is_empty() {
        cmd.args(&req.args);
    }
    if let Some(dir) = &req.working_directory {
        cmd.current_dir(dir);
    }
    #[cfg(windows)]
    {
        #[allow(unused_imports)]
        use std::os::windows::process::CommandExt;
        let _ = cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn: {}", e))?;
    let pid = child.id().unwrap_or(0);

    if let Some(stdout) = child.stdout.take() {
        let app_clone = app.clone();
        let action_id = req.action_id;
        let workspace_id = req.workspace_id;
        let run_id = req.run_id;
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app_clone.emit(
                    "action-log",
                    serde_json::json!({
                        "action_id": action_id,
                        "workspace_id": workspace_id,
                        "run_id": run_id,
                        "level": "info",
                        "message": line,
                    }),
                );
            }
        });
    }
    if let Some(stderr) = child.stderr.take() {
        let app_clone = app.clone();
        let action_id = req.action_id;
        let workspace_id = req.workspace_id;
        let run_id = req.run_id;
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app_clone.emit(
                    "action-log",
                    serde_json::json!({
                        "action_id": action_id,
                        "workspace_id": workspace_id,
                        "run_id": run_id,
                        "level": "error",
                        "message": line,
                    }),
                );
            }
        });
    }

    if req.track_process {
        let resolved = resolve_pid_for_tracking(pid, &req.command, &req.args).await;
        Ok(resolved.unwrap_or(pid))
    } else {
        Ok(pid)
    }
}

fn get_wrapper_exclude_list() -> Vec<String> {
    vec![
        "powershell".to_string(),
        "cmd".to_string(),
        "conhost".to_string(),
        "bash".to_string(),
        "sh".to_string(),
        "x-terminal-emulator".to_string(),
        "npm".to_string(),
        "npx".to_string(),
        "yarn".to_string(),
        "pnpm".to_string(),
    ]
}

async fn resolve_pid_for_tracking(parent_pid: u32, command: &str, args: &[String]) -> Option<u32> {
    println!(
        "DEBUG: resolve_pid_for_tracking parent={} cmd={}",
        parent_pid, command
    );
    let expected_name = args
        .get(0)
        .filter(|s| s.ends_with(".exe") || s.contains('/') || s.contains('\\'))
        .map(|s| s.to_string())
        .or_else(|| Some(command.to_string()));

    crate::process::resolve_descendant_pid(crate::process::ResolvePidRequest {
        parent_pid,
        expected_name,
        exclude_names: Some(get_wrapper_exclude_list()),
        max_wait_ms: Some(2000),
    })
    .await
    .ok()
    .flatten()
}

pub async fn spawn_detached(app: &AppHandle, req: DetachedSpawnRequest) -> Result<u32, String> {
    let mut cmd = TokioCommand::new(&req.command);
    if !req.args.is_empty() {
        cmd.args(&req.args);
    }
    if let Some(dir) = &req.working_directory {
        cmd.current_dir(dir);
    }
    #[cfg(windows)]
    {
        #[allow(unused_imports)]
        use std::os::windows::process::CommandExt;
        const DETACHED_PROCESS: u32 = 0x00000008;
        const CREATE_BREAKAWAY_FROM_JOB: u32 = 0x00000200;
        let _ = cmd.creation_flags(CREATE_NO_WINDOW | DETACHED_PROCESS | CREATE_BREAKAWAY_FROM_JOB);
    }

    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());
    cmd.stdin(std::process::Stdio::null());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn: {}", e))?;
    let pid = child.id().unwrap_or(0);
    println!(
        "DEBUG: spawn_detached pid={} track_process={}",
        pid, req.track_process
    );

    if let Some(stdout) = child.stdout.take() {
        let app_clone = app.clone();
        let action_id = req.action_id;
        let workspace_id = req.workspace_id;
        let run_id = req.run_id;
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app_clone.emit(
                    "action-log",
                    serde_json::json!({
                        "action_id": action_id,
                        "workspace_id": workspace_id,
                        "run_id": run_id,
                        "level": "info",
                        "message": line,
                    }),
                );
            }
        });
    }
    if let Some(stderr) = child.stderr.take() {
        let app_clone = app.clone();
        let action_id = req.action_id;
        let workspace_id = req.workspace_id;
        let run_id = req.run_id;
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app_clone.emit(
                    "action-log",
                    serde_json::json!({
                        "action_id": action_id,
                        "workspace_id": workspace_id,
                        "run_id": run_id,
                        "level": "error",
                        "message": line,
                    }),
                );
            }
        });
    }

    if req.track_process {
        let resolved = resolve_pid_for_tracking(pid, &req.command, &req.args).await;
        Ok(resolved.unwrap_or(pid))
    } else {
        Ok(pid)
    }
}
