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
    #[serde(default)]
    pub denied: bool,
}

#[tauri::command]
pub async fn kill_process(pid: u32) -> Result<KillProcessResult, String> {
    if !is_process_running(pid).await.unwrap_or(false) {
        return Ok(KillProcessResult {
            success: true,
            message: format!("Process {} already terminated", pid),
            denied: false,
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
                denied: false,
            }),
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                match try_taskkill(true) {
                    Ok(force_output) if force_output.status.success() => Ok(KillProcessResult {
                        success: true,
                        message: format!("Process {} killed forcefully", pid),
                        denied: false,
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
                            Ok(KillProcessResult {
                                success: false,
                                denied: true,
                                message: format!(
                                    "Failed to kill process {}: {}. Try running WorkspaceLauncher as Administrator or close it from its parent app.",
                                    pid,
                                    combined.trim()
                                ),
                            })
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
                denied: false,
            })
        } else {
            Ok(KillProcessResult {
                success: false,
                denied: true,
                message: format!(
                    "Failed to kill process {}. The process may require elevated permissions.",
                    pid
                ),
            })
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
    pub working_directory: Option<String>,
    pub started_after_secs: Option<u64>,
}

fn collect_filtered_descendants<'a>(
    system: &'a System,
    root: Pid,
    exclude: &[String],
) -> Vec<&'a Process> {
    let mut descendants = Vec::new();
    let mut frontier = vec![root];
    while let Some(p) = frontier.pop() {
        for (pid, proc_info) in system.processes() {
            if proc_info.parent() == Some(p) {
                let name_lc = proc_info.name().to_string_lossy().to_lowercase();
                if !exclude.iter().any(|e| name_lc.contains(e)) {
                    descendants.push(proc_info);
                }
                frontier.push(*pid);
            }
        }
    }
    descendants
}

async fn find_server_after_build(
    req: &ResolvePidRequest,
    build_pids: &[u32],
    exclude: &[String],
) -> Result<Option<u32>, String> {
    println!("DEBUG: Phase 4 — all initial processes exited (build phase). Searching for server.");

    // Give the server a moment to finish starting up.
    sleep(Duration::from_millis(1500)).await;

    let mut system = System::new_all();
    system.refresh_processes(ProcessesToUpdate::All, true);

    let build_set: std::collections::HashSet<u32> = build_pids.iter().copied().collect();
    let threshold = req.started_after_secs.unwrap_or(0);

    let wdir_normalized = req.working_directory.as_deref().map(|w| {
        w.to_lowercase().replace('\\', "/").trim_end_matches('/').to_string()
    });

    let mut candidates: Vec<(u32, u64)> = Vec::new();
    for (pid, proc_info) in system.processes() {
        let pid_u32 = pid.as_u32();
        if build_set.contains(&pid_u32) {
            continue;
        }
        if proc_info.start_time() <= threshold {
            continue;
        }
        let name_lc = proc_info.name().to_string_lossy().to_lowercase();
        if exclude.iter().any(|e| name_lc.contains(e)) {
            continue;
        }

        // When a working directory is provided, filter by cwd if the OS returns it.
        // If cwd() is unavailable (None), keep the candidate — don't discard it.
        if let Some(ref wdir) = wdir_normalized {
            if let Some(cwd) = proc_info.cwd() {
                let cwd_norm = cwd
                    .to_string_lossy()
                    .to_lowercase()
                    .replace('\\', "/")
                    .trim_end_matches('/')
                    .to_string();
                if !cwd_norm.starts_with(wdir.as_str()) {
                    continue;
                }
            }
            // cwd() returned None — keep candidate; we can't verify but won't discard
        }

        candidates.push((pid_u32, proc_info.start_time()));
    }

    if candidates.is_empty() {
        println!("DEBUG: Phase 4 — no server process found");
        return Ok(None);
    }

    // Pick the most recently started candidate (just-launched server)
    candidates.sort_by_key(|&(_, t)| std::cmp::Reverse(t));
    let best_pid = candidates[0].0;
    if let Some(proc_info) = system.process(Pid::from_u32(best_pid)) {
        println!(
            "DEBUG: Phase 4 — selected server PID: {} ({:?})",
            best_pid,
            proc_info.name()
        );
    }
    Ok(Some(best_pid))
}

#[tauri::command]
pub async fn resolve_descendant_pid(req: ResolvePidRequest) -> Result<Option<u32>, String> {
    let poll_budget_ms = req.max_wait_ms.unwrap_or(3000).min(1000);
    let stabilize_ms = 2000u64;
    let mut poll_attempts = (poll_budget_ms / 100).max(1) as u32;
    let exclude: Vec<String> = req
        .exclude_names
        .clone()
        .unwrap_or_default()
        .into_iter()
        .map(|s| s.to_lowercase())
        .collect();

    // Phase 1: poll until at least one descendant appears (tree is being built)
    let mut initial_pids: Vec<u32> = Vec::new();
    loop {
        let mut system = System::new_all();
        system.refresh_processes(ProcessesToUpdate::All, true);
        let parent = Pid::from_u32(req.parent_pid);
        let descendants = collect_filtered_descendants(&system, parent, &exclude);

        println!(
            "DEBUG: resolving descendants for parent: {} — found {}",
            req.parent_pid,
            descendants.len()
        );
        for d in &descendants {
            println!(
                "DEBUG: descendant: {} ({:?}) parent: {:?}",
                d.pid(),
                d.name(),
                d.parent()
            );
        }

        if !descendants.is_empty() {
            initial_pids = descendants.iter().map(|p| p.pid().as_u32()).collect();
            break;
        }

        if poll_attempts == 0 {
            break;
        }
        poll_attempts -= 1;
        sleep(Duration::from_millis(100)).await;
    }

    if initial_pids.is_empty() {
        return Ok(None);
    }

    // Phase 2: wait for the tree to stabilize so short-lived launchers can exit
    sleep(Duration::from_millis(stabilize_ms)).await;

    // Phase 3: of the originally captured descendants, keep only those still alive
    let mut system = System::new_all();
    system.refresh_processes(ProcessesToUpdate::All, true);

    let alive_pids: Vec<u32> = initial_pids
        .iter()
        .copied()
        .filter(|&pid| system.process(Pid::from_u32(pid)).is_some())
        .collect();

    println!(
        "DEBUG: after {}ms stabilization: {}/{} descendants still alive",
        stabilize_ms,
        alive_pids.len(),
        initial_pids.len()
    );

    if alive_pids.is_empty() {
        // Phase 4: the entire initial tree was a build/setup phase that exited.
        // Wait for the actual server process to start, then find it.
        return find_server_after_build(&req, &initial_pids, &exclude).await;
    }

    // Match by expected name first
    if let Some(ref name) = req.expected_name {
        let needle = name.to_lowercase();
        for &pid in &alive_pids {
            if let Some(proc_info) = system.process(Pid::from_u32(pid)) {
                if proc_info
                    .name()
                    .to_string_lossy()
                    .to_lowercase()
                    .contains(&needle)
                {
                    println!(
                        "DEBUG: matched expected_name PID: {} ({:?})",
                        pid,
                        proc_info.name()
                    );
                    return Ok(Some(pid));
                }
            }
        }
    }

    // Prefer leaf: an alive process with no alive children
    for &pid in &alive_pids {
        let has_alive_child = alive_pids.iter().any(|&other| {
            system
                .process(Pid::from_u32(other))
                .and_then(|p| p.parent())
                .map(|par| par.as_u32() == pid)
                .unwrap_or(false)
        });
        if !has_alive_child {
            if let Some(proc_info) = system.process(Pid::from_u32(pid)) {
                println!(
                    "DEBUG: selected alive leaf PID: {} ({:?})",
                    pid,
                    proc_info.name()
                );
            }
            return Ok(Some(pid));
        }
    }

    Ok(alive_pids.first().copied())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FindServerRequest {
    pub working_directory: Option<String>,
    pub started_after_secs: Option<u64>,
    pub exclude_names: Option<Vec<String>>,
}

#[tauri::command]
pub async fn find_server_process(req: FindServerRequest) -> Result<Option<u32>, String> {
    let exclude: Vec<String> = req
        .exclude_names
        .unwrap_or_default()
        .into_iter()
        .map(|s| s.to_lowercase())
        .collect();

    let mut system = System::new_all();
    system.refresh_processes(ProcessesToUpdate::All, true);

    let threshold = req.started_after_secs.unwrap_or(0);
    let wdir_normalized = req.working_directory.as_deref().map(|w| {
        w.to_lowercase()
            .replace('\\', "/")
            .trim_end_matches('/')
            .to_string()
    });

    let mut candidates: Vec<(u32, u64)> = Vec::new();
    for (pid, proc_info) in system.processes() {
        let pid_u32 = pid.as_u32();
        if proc_info.start_time() <= threshold {
            continue;
        }
        let name_lc = proc_info.name().to_string_lossy().to_lowercase();
        if exclude.iter().any(|e| name_lc.contains(e)) {
            continue;
        }
        if let Some(ref wdir) = wdir_normalized {
            if let Some(cwd) = proc_info.cwd() {
                let cwd_norm = cwd
                    .to_string_lossy()
                    .to_lowercase()
                    .replace('\\', "/")
                    .trim_end_matches('/')
                    .to_string();
                if !cwd_norm.starts_with(wdir.as_str()) {
                    continue;
                }
            }
        }
        candidates.push((pid_u32, proc_info.start_time()));
    }

    candidates.sort_by_key(|&(_, t)| std::cmp::Reverse(t));
    let result = candidates.first().map(|&(pid, _)| pid);
    if let Some(pid) = result {
        if let Some(proc_info) = system.process(Pid::from_u32(pid)) {
            println!(
                "DEBUG: find_server_process found PID: {} ({:?})",
                pid,
                proc_info.name()
            );
        }
    }
    Ok(result)
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
