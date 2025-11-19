use serde::{Deserialize, Serialize};
use sysinfo::{Pid, Process, ProcessesToUpdate, System};
use tokio::time::{sleep, Duration};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Serialize, Deserialize)]
pub struct KillProcessResult {
    pub success: bool,
    pub message: String,
}

#[tauri::command]
pub async fn kill_process(pid: u32) -> Result<KillProcessResult, String> {
    if !is_process_running(pid).await.unwrap_or(false) {
        return Ok(KillProcessResult {
            success: true,
            message: format!("Process {} already terminated", pid),
        });
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        let try_taskkill = |force: bool| {
            let mut cmd = Command::new("taskkill");
            if force {
                cmd.args(&["/PID", &pid.to_string(), "/F", "/T"]);
            } else {
                cmd.args(&["/PID", &pid.to_string(), "/T"]);
            }
            #[cfg(target_os = "windows")]
            cmd.creation_flags(CREATE_NO_WINDOW);
            cmd.output()
        };

        match try_taskkill(false) {
            Ok(output) if output.status.success() => Ok(KillProcessResult {
                success: true,
                message: format!("Process {} terminated", pid),
            }),
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                match try_taskkill(true) {
                    Ok(force_output) if force_output.status.success() => Ok(KillProcessResult {
                        success: true,
                        message: format!("Process {} killed forcefully", pid),
                    }),
                    Ok(force_output) => {
                        let mut combined =
                            String::from_utf8_lossy(&force_output.stderr).to_string();
                        if combined.trim().is_empty() {
                            combined = stderr;
                        }
                        let lowered = combined.to_lowercase();
                        if lowered.contains("access is denied")
                            || lowered.contains("zugriff verweigert")
                        {
                            Err(format!("Failed to kill process {}: {}. Try running WorkspaceLauncher as Administrator or close it from its parent app.", pid, combined.trim()))
                        } else {
                            Err(format!(
                                "Failed to kill process {}: {}",
                                pid,
                                combined.trim()
                            ))
                        }
                    }
                    Err(e) => Err(format!("Failed to execute taskkill: {}", e)),
                }
            }
            Err(e) => Err(format!("Failed to execute taskkill: {}", e)),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        use nix::sys::signal::{self, Signal};
        use nix::unistd::Pid as UnixPid;

        let mut system = System::new();
        system.refresh_processes(ProcessesToUpdate::All, true);
        let root = Pid::from_u32(pid);
        let mut to_kill: Vec<Pid> = vec![root];
        let mut changed = true;
        while changed {
            changed = false;
            for (p_pid, proc_info) in system.processes() {
                if let Some(parent) = proc_info.parent() {
                    if to_kill.contains(&parent) && !to_kill.contains(p_pid) {
                        to_kill.push(*p_pid);
                        changed = true;
                    }
                }
            }
        }

        for p in to_kill.iter().rev() {
            let upid = UnixPid::from_raw(p.as_u32() as i32);
            let _ = signal::kill(upid, Signal::SIGTERM);
        }
        let mut any_success = false;
        for p in to_kill.iter().rev() {
            let upid = UnixPid::from_raw(p.as_u32() as i32);
            if signal::kill(upid, Signal::SIGKILL).is_ok() {
                any_success = true;
            }
        }

        if any_success {
            Ok(KillProcessResult {
                success: true,
                message: format!("Process {} terminated", pid),
            })
        } else {
            Err(format!("Failed to kill process {}", pid))
        }
    }
}

#[tauri::command]
pub async fn is_process_running(pid: u32) -> Result<bool, String> {
    let mut system = System::new_all();
    system.refresh_processes(ProcessesToUpdate::All, true);
    let target = Pid::from_u32(pid);
    let exists = system.process(target).is_some();
    if !exists {
        println!("DEBUG: is_process_running({}) -> false", pid);
    }
    Ok(exists)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResolvePidRequest {
    pub parent_pid: u32,
    pub expected_name: Option<String>,
    pub exclude_names: Option<Vec<String>>,
    pub max_wait_ms: Option<u64>,
}

#[tauri::command]
pub async fn resolve_descendant_pid(req: ResolvePidRequest) -> Result<Option<u32>, String> {
    let total_wait = req.max_wait_ms.unwrap_or(2000);
    let mut attempts: u32 = (total_wait / 100).max(1) as u32;
    let exclude: Vec<String> = req
        .exclude_names
        .unwrap_or_default()
        .into_iter()
        .map(|s| s.to_lowercase())
        .collect();
    loop {
        let mut system = System::new_all();
        system.refresh_processes(ProcessesToUpdate::All, true);
        let parent = Pid::from_u32(req.parent_pid);
        println!(
            "DEBUG: resolving descendants for parent: {}",
            req.parent_pid
        );

        let mut descendants: Vec<&Process> = Vec::new();
        let mut frontier: Vec<Pid> = vec![parent];
        while let Some(p) = frontier.pop() {
            for (pid, proc_info) in system.processes() {
                if let Some(par) = proc_info.parent() {
                    if par == p {
                        let name_lc = proc_info.name().to_string_lossy().to_lowercase();
                        if !exclude.iter().any(|e| name_lc.contains(e)) {
                            descendants.push(proc_info);
                        }
                        frontier.push(*pid);
                    }
                }
            }
        }

        println!("DEBUG: found {} descendants", descendants.len());
        for d in &descendants {
            println!(
                "DEBUG: descendant: {} ({:?}) parent: {:?}",
                d.pid(),
                d.name(),
                d.parent()
            );
        }

        if descendants.is_empty() {
            if attempts == 0 {
                return Ok(None);
            }
        } else {
            if let Some(ref name) = req.expected_name {
                let needle = name.to_lowercase();
                if let Some(p) = descendants
                    .iter()
                    .find(|pr| pr.name().to_string_lossy().to_lowercase().contains(&needle))
                {
                    return Ok(Some(p.pid().as_u32()));
                }
            }
            use std::collections::HashSet;
            let descendant_pids: HashSet<Pid> = descendants.iter().map(|p| p.pid()).collect();
            let mut root_candidates: Vec<&Process> = descendants
                .iter()
                .copied()
                .filter(|pr| match pr.parent() {
                    Some(par) => !descendant_pids.contains(&par),
                    None => true,
                })
                .collect();

            root_candidates.sort_by_key(|pr| pr.start_time());

            if let Some(p) = root_candidates.first() {
                println!("DEBUG: selected root PID: {} ({:?})", p.pid(), p.name());
                return Ok(Some(p.pid().as_u32()));
            }

            if let Some(p) = descendants.iter().min_by_key(|pr| pr.start_time()) {
                println!(
                    "DEBUG: fallback selected earliest PID: {} ({:?})",
                    p.pid(),
                    p.name()
                );
                return Ok(Some(p.pid().as_u32()));
            }
        }

        if attempts == 0 {
            return Ok(None);
        }
        attempts -= 1;
        sleep(Duration::from_millis(100)).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::process::Command;
    use tokio::time::{sleep, Duration};

    async fn spawn_dummy_long_running() -> u32 {
        #[cfg(target_os = "windows")]
        {
            let mut cmd = Command::new("cmd");
            let child = cmd
                .args(["/C", "ping", "127.0.0.1", "-n", "6", ">", "NUL"])
                .spawn()
                .expect("failed to spawn dummy process");
            return child.id();
        }

        #[cfg(not(target_os = "windows"))]
        {
            let child = Command::new("sleep")
                .arg("5")
                .spawn()
                .expect("failed to spawn dummy process");
            return child.id();
        }
    }

    #[tokio::test]
    async fn test_is_process_running_and_kill() {
        let pid = spawn_dummy_long_running().await;

        sleep(Duration::from_millis(150)).await;

        let running_before = is_process_running(pid)
            .await
            .expect("is_process_running failed");
        assert!(running_before, "process should be running before kill");

        let result = kill_process(pid).await;

        sleep(Duration::from_millis(250)).await;
        let running_after = is_process_running(pid).await.unwrap_or(false);

        assert!(
            !running_after,
            "process should not be running after kill attempt"
        );
        let _ = result;
    }
}
