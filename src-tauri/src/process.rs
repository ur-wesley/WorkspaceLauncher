use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct KillProcessResult {
    pub success: bool,
    pub message: String,
}

#[tauri::command]
pub async fn kill_process(pid: u32) -> Result<KillProcessResult, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        let output = Command::new("taskkill")
            .args(&["/PID", &pid.to_string(), "/F", "/T"])
            .output()
            .map_err(|e| format!("Failed to execute taskkill: {}", e))?;

        if output.status.success() {
            Ok(KillProcessResult {
                success: true,
                message: format!("Process {} killed successfully", pid),
            })
        } else {
            let error = String::from_utf8_lossy(&output.stderr);
            Err(format!("Failed to kill process {}: {}", pid, error))
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        use nix::sys::signal::{self, Signal};
        use nix::unistd::Pid;

        let pid = Pid::from_raw(pid as i32);

        match signal::kill(pid, Signal::SIGTERM) {
            Ok(_) => Ok(KillProcessResult {
                success: true,
                message: format!("Process {} sent SIGTERM", pid),
            }),
            Err(e) => match signal::kill(pid, Signal::SIGKILL) {
                Ok(_) => Ok(KillProcessResult {
                    success: true,
                    message: format!("Process {} killed with SIGKILL", pid),
                }),
                Err(e2) => Err(format!(
                    "Failed to kill process {}: SIGTERM: {}, SIGKILL: {}",
                    pid, e, e2
                )),
            },
        }
    }
}

#[tauri::command]
pub async fn is_process_running(pid: u32) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        let output = Command::new("tasklist")
            .args(&["/FI", &format!("PID eq {}", pid), "/FO", "CSV", "/NH"])
            .output()
            .map_err(|e| format!("Failed to execute tasklist: {}", e))?;

        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            Ok(stdout.contains(&pid.to_string()))
        } else {
            Ok(false)
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        use nix::sys::signal::{self, Signal};
        use nix::unistd::Pid;

        let pid = Pid::from_raw(pid as i32);

        match signal::kill(pid, Signal::from_c_int(0).unwrap()) {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }
}
