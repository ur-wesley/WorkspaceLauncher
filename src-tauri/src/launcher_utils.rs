#![allow(dead_code)]
use tauri::AppHandle;
use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub fn replace_variables(
    input: &str,
    variables: &std::collections::HashMap<String, String>,
) -> String {
    let mut result = input.to_string();
    for (key, value) in variables {
        let placeholder = format!("${{{}}}", key);
        result = result.replace(&placeholder, value);
    }
    result
}

pub async fn spawn_hidden_process(
    command: &str,
    args: &[String],
    working_dir: Option<&str>,
) -> Result<u32, String> {
    let mut cmd = TokioCommand::new(command);

    if !args.is_empty() {
        cmd.args(args);
    }

    if let Some(dir) = working_dir {
        cmd.current_dir(dir);
    }

    #[cfg(windows)]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    cmd.stdin(std::process::Stdio::null());
    cmd.stdout(std::process::Stdio::null());
    cmd.stderr(std::process::Stdio::null());

    match cmd.spawn() {
        Ok(child) => Ok(child.id().unwrap_or(0)),
        Err(e) => Err(format!("Failed to spawn process: {}", e)),
    }
}

pub async fn spawn_with_output_forwarding(
    app: &AppHandle,
    event_name: &str,
    command: &str,
    args: &[String],
    working_dir: Option<&str>,
    metadata: serde_json::Value,
) -> Result<u32, String> {
    let mut cmd = TokioCommand::new(command);
    if !args.is_empty() {
        cmd.args(args);
    }
    if let Some(dir) = working_dir {
        cmd.current_dir(dir);
    }
    #[cfg(windows)]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn: {}", e))?;
    let pid = child.id().unwrap_or(0);

    if let Some(stdout) = child.stdout.take() {
        let app_clone = app.clone();
        let event = event_name.to_string();
        let meta = metadata.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app_clone.emit(
                    &event,
                    serde_json::json!({
                        "stream": "stdout",
                        "pid": pid,
                        "message": line,
                        "meta": meta,
                    }),
                );
            }
        });
    }

    if let Some(stderr) = child.stderr.take() {
        let app_clone = app.clone();
        let event = event_name.to_string();
        let meta = metadata;
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app_clone.emit(
                    &event,
                    serde_json::json!({
                        "stream": "stderr",
                        "pid": pid,
                        "message": line,
                        "meta": meta,
                    }),
                );
            }
        });
    }

    Ok(pid)
}

pub async fn spawn_with_action_log_forwarding(
    app: &AppHandle,
    action_id: Option<i64>,
    workspace_id: Option<i64>,
    run_id: i64,
    command: &str,
    args: &[String],
    working_dir: Option<&str>,
) -> Result<u32, String> {
    let mut cmd = TokioCommand::new(command);
    if !args.is_empty() {
        cmd.args(args);
    }
    if let Some(dir) = working_dir {
        cmd.current_dir(dir);
    }
    #[cfg(windows)]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn: {}", e))?;
    let pid = child.id().unwrap_or(0);

    if let Some(stdout) = child.stdout.take() {
        let app_clone = app.clone();
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

    Ok(pid)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_spawn_hidden_process_basic() {
        #[cfg(target_os = "windows")]
        {
            let args = vec!["/C".to_string(), "echo".to_string(), "hello".to_string()];
            let pid = spawn_hidden_process("cmd", &args, None)
                .await
                .expect("spawn failed");
            assert!(pid > 0);
        }

        #[cfg(not(target_os = "windows"))]
        {
            let args = vec!["-c".to_string(), "echo hello".to_string()];
            let pid = spawn_hidden_process("sh", &args, None)
                .await
                .expect("spawn failed");
            assert!(pid > 0);
        }
    }
}
