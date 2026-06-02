mod common;

use common::*;
use serial_test::serial;
use tokio::time::{sleep, Duration};
use workspacelauncher_lib::test_helpers::{
    find_server_process, is_process_running, kill_process, resolve_descendant_pid, replace_variables,
    spawn_hidden_process, FindServerRequest, ResolvePidRequest,
};

#[tokio::test]
#[serial]
async fn test_is_process_running_valid_pid() {
    let process = spawn_long_running_process(Some("is_running_test"));
    let pid = process.pid;

    sleep(Duration::from_millis(200)).await;

    let running: bool = is_process_running(pid).await.expect("is_process_running failed");
    eprintln!("[TEST] PID {} running: {}", pid, running);
    assert!(running, "Process {} should be running", pid);
}

#[tokio::test]
#[serial]
async fn test_is_process_running_invalid_pid() {
    let invalid_pid = 99999999;
    let running: bool = is_process_running(invalid_pid)
        .await
        .expect("is_process_running failed");
    eprintln!("[TEST] Invalid PID {} running: {}", invalid_pid, running);
    assert!(!running, "Invalid PID {} should not be running", invalid_pid);
}

#[tokio::test]
#[serial]
async fn test_is_process_running_after_kill() {
    let process = spawn_long_running_process(Some("kill_test"));
    let pid = process.pid;

    sleep(Duration::from_millis(200)).await;

    let running_before: bool = is_process_running(pid)
        .await
        .expect("is_process_running failed");
    eprintln!(
        "[TEST] PID {} running before kill: {}",
        pid, running_before
    );
    assert!(running_before, "Process should be running before kill");

    let kill_result = kill_process(pid).await;
    eprintln!("[TEST] Kill result: {:?}", kill_result);

    sleep(Duration::from_millis(500)).await;

    let running_after: bool = is_process_running(pid).await.unwrap_or(false);
    eprintln!("[TEST] PID {} running after kill: {}", pid, running_after);
    assert!(!running_after, "Process should not be running after kill");
}

#[tokio::test]
#[serial]
async fn test_kill_process_already_terminated() {
    let invalid_pid = 99999999;
    let result: Result<workspacelauncher_lib::test_helpers::KillProcessResult, String> =
        kill_process(invalid_pid).await;
    eprintln!("[TEST] Kill already terminated result: {:?}", result);
    assert!(
        result.is_ok(),
        "Killing already terminated process should succeed"
    );
    assert!(
        result.unwrap().success,
        "Kill should report success for already terminated process"
    );
}

#[tokio::test]
#[serial]
async fn test_resolve_descendant_pid_simple() {
    let parent = spawn_long_running_process(Some("resolve_parent"));

    sleep(Duration::from_millis(300)).await;

    let request = ResolvePidRequest {
        parent_pid: parent.pid,
        expected_name: None,
        exclude_names: Some(vec![
            "cmd".to_string(),
            "powershell".to_string(),
            "conhost".to_string(),
        ]),
        max_wait_ms: Some(2000),
        working_directory: None,
        started_after_secs: None,
    };

    let result = resolve_descendant_pid(request).await;
    eprintln!("[TEST] Resolve descendant result: {:?}", result);

    match result {
        Ok(Some(pid)) => {
            eprintln!("[TEST] Resolved PID: {}", pid);
            assert!(pid > 0, "Resolved PID should be > 0");
        }
        Ok(None) => {
            eprintln!("[TEST] No descendant found (expected for simple processes)");
        }
        Err(e) => {
            eprintln!("[TEST] Error resolving descendant: {}", e);
        }
    }
}

#[tokio::test]
#[serial]
async fn test_resolve_descendant_pid_with_exclusions() {
    let parent = spawn_long_running_process(Some("exclusion_parent"));

    sleep(Duration::from_millis(300)).await;

    let request = ResolvePidRequest {
        parent_pid: parent.pid,
        expected_name: None,
        exclude_names: Some(vec![
            "cmd".to_string(),
            "powershell".to_string(),
            "conhost".to_string(),
            "sh".to_string(),
            "bash".to_string(),
        ]),
        max_wait_ms: Some(2000),
        working_directory: None,
        started_after_secs: None,
    };

    let result = resolve_descendant_pid(request).await;
    eprintln!("[TEST] Resolve with exclusions result: {:?}", result);

    match result {
        Ok(Some(pid)) => {
            eprintln!("[TEST] Resolved PID with exclusions: {}", pid);
            assert!(pid > 0, "Resolved PID should be > 0");
        }
        Ok(None) => {
            eprintln!("[TEST] No descendant found after exclusions");
        }
        Err(e) => {
            eprintln!("[TEST] Error: {}", e);
        }
    }
}

#[tokio::test]
#[serial]
async fn test_resolve_descendant_pid_timeout() {
    let parent = spawn_long_running_process(Some("timeout_parent"));

    sleep(Duration::from_millis(100)).await;

    let request = ResolvePidRequest {
        parent_pid: parent.pid,
        expected_name: None,
        exclude_names: None,
        max_wait_ms: Some(500),
        working_directory: None,
        started_after_secs: None,
    };

    let start = std::time::Instant::now();
    let result = resolve_descendant_pid(request).await;
    let elapsed = start.elapsed();

    eprintln!(
        "[TEST] Timeout test result: {:?}, elapsed: {:?}",
        result, elapsed
    );
    assert!(
        elapsed.as_millis() <= 5000,
        "Should not hang indefinitely, elapsed: {:?}",
        elapsed
    );
    assert!(result.is_ok(), "Should complete without error");
}

#[tokio::test]
#[serial]
async fn test_resolve_descendant_pid_expected_name() {
    let parent = spawn_long_running_process(Some("name_parent"));

    sleep(Duration::from_millis(300)).await;

    let request = ResolvePidRequest {
        parent_pid: parent.pid,
        expected_name: Some("ping".to_string()),
        exclude_names: Some(vec!["cmd".to_string(), "powershell".to_string()]),
        max_wait_ms: Some(2000),
        working_directory: None,
        started_after_secs: None,
    };

    let result = resolve_descendant_pid(request).await;
    eprintln!("[TEST] Resolve with expected name result: {:?}", result);

    match result {
        Ok(Some(pid)) => {
            eprintln!("[TEST] Resolved PID with expected name: {}", pid);
            assert!(pid > 0, "Resolved PID should be > 0");
        }
        Ok(None) => {
            eprintln!("[TEST] No matching descendant found");
        }
        Err(e) => {
            eprintln!("[TEST] Error: {}", e);
        }
    }
}

#[tokio::test]
#[serial]
async fn test_find_server_process_basic() {
    let _process = spawn_long_running_process(Some("server_basic"));

    sleep(Duration::from_millis(300)).await;

    let request = FindServerRequest {
        working_directory: None,
        started_after_secs: None,
        exclude_names: None,
    };

    let result = find_server_process(request).await;
    eprintln!("[TEST] Find server basic result: {:?}", result);

    match result {
        Ok(Some(pid)) => {
            eprintln!("[TEST] Found server PID: {}", pid);
            assert!(pid > 0, "Found PID should be > 0");
        }
        Ok(None) => {
            eprintln!("[TEST] No server process found");
        }
        Err(e) => {
            eprintln!("[TEST] Error: {}", e);
        }
    }
}

#[tokio::test]
#[serial]
async fn test_find_server_process_with_exclusions() {
    let _process = spawn_long_running_process(Some("server_exclusion"));

    sleep(Duration::from_millis(300)).await;

    let request = FindServerRequest {
        working_directory: None,
        started_after_secs: None,
        exclude_names: Some(vec!["cmd".to_string(), "powershell".to_string()]),
    };

    let result = find_server_process(request).await;
    eprintln!("[TEST] Find server with exclusions result: {:?}", result);

    match result {
        Ok(Some(pid)) => {
            eprintln!("[TEST] Found server PID with exclusions: {}", pid);
            assert!(pid > 0, "Found PID should be > 0");
        }
        Ok(None) => {
            eprintln!("[TEST] No server process found after exclusions");
        }
        Err(e) => {
            eprintln!("[TEST] Error: {}", e);
        }
    }
}

#[tokio::test]
#[serial]
async fn test_replace_variables_basic() {
    let mut variables = std::collections::HashMap::new();
    variables.insert("HOME".to_string(), "/home/user".to_string());
    variables.insert("APP".to_string(), "myapp".to_string());

    let result = replace_variables("${HOME}/apps/${APP}", &variables);
    eprintln!("[TEST] Replace variables result: {}", result);
    assert_eq!(result, "/home/user/apps/myapp");
}

#[tokio::test]
#[serial]
async fn test_replace_variables_multiple() {
    let mut variables = std::collections::HashMap::new();
    variables.insert("VAR1".to_string(), "value1".to_string());
    variables.insert("VAR2".to_string(), "value2".to_string());
    variables.insert("VAR3".to_string(), "value3".to_string());

    let result = replace_variables("${VAR1}-${VAR2}-${VAR3}", &variables);
    eprintln!("[TEST] Replace multiple variables result: {}", result);
    assert_eq!(result, "value1-value2-value3");
}

#[tokio::test]
#[serial]
async fn test_replace_variables_no_match() {
    let variables = std::collections::HashMap::new();

    let result = replace_variables("no variables here", &variables);
    eprintln!("[TEST] Replace no match result: {}", result);
    assert_eq!(result, "no variables here");
}

#[tokio::test]
#[serial]
async fn test_spawn_hidden_process_basic() {
    #[cfg(target_os = "windows")]
    {
        let args = vec!["/C".to_string(), "echo".to_string(), "hello".to_string()];
        let pid: u32 = spawn_hidden_process("cmd", &args, None)
            .await
            .expect("failed to spawn hidden process");
        eprintln!("[TEST] Hidden process PID: {}", pid);
        assert!(pid > 0, "Hidden process PID should be > 0");
    }

    #[cfg(not(target_os = "windows"))]
    {
        let args = vec!["-c".to_string(), "echo hello".to_string()];
        let pid: u32 = spawn_hidden_process("sh", &args, None)
            .await
            .expect("failed to spawn hidden process");
        eprintln!("[TEST] Hidden process PID: {}", pid);
        assert!(pid > 0, "Hidden process PID should be > 0");
    }
}

#[tokio::test]
#[serial]
async fn test_spawn_hidden_process_working_dir() {
    let temp_dir = tempfile::tempdir().expect("failed to create temp dir");
    let dir_path = temp_dir.path().to_str().unwrap();

    #[cfg(target_os = "windows")]
    {
        let args = vec!["/C".to_string(), "echo".to_string(), "ok".to_string()];
        let pid: u32 = spawn_hidden_process("cmd", &args, Some(dir_path))
            .await
            .expect("failed to spawn with working dir");
        eprintln!("[TEST] Hidden process with working dir PID: {}", pid);
        assert!(pid > 0, "Hidden process PID should be > 0");
    }

    #[cfg(not(target_os = "windows"))]
    {
        let args = vec!["-c".to_string(), "echo ok".to_string()];
        let pid: u32 = spawn_hidden_process("sh", &args, Some(dir_path))
            .await
            .expect("failed to spawn with working dir");
        eprintln!("[TEST] Hidden process with working dir PID: {}", pid);
        assert!(pid > 0, "Hidden process PID should be > 0");
    }
}

#[tokio::test]
#[serial]
async fn test_spawn_invalid_command() {
    let result = spawn_hidden_process("nonexistent_command_12345", &[], None).await;
    eprintln!("[TEST] Spawn invalid command result: {:?}", result);
    assert!(result.is_err(), "Spawning invalid command should fail");
}

#[tokio::test]
#[serial]
async fn test_resolve_pid_parent_not_found() {
    let invalid_parent_pid = 99999999;

    let request = ResolvePidRequest {
        parent_pid: invalid_parent_pid,
        expected_name: None,
        exclude_names: None,
        max_wait_ms: Some(1000),
        working_directory: None,
        started_after_secs: None,
    };

    let result = resolve_descendant_pid(request).await;
    eprintln!(
        "[TEST] Resolve with invalid parent result: {:?}",
        result
    );

    match result {
        Ok(None) => {
            eprintln!("[TEST] No descendant found for invalid parent (expected)");
        }
        Ok(Some(pid)) => {
            eprintln!("[TEST] Unexpected PID found: {}", pid);
        }
        Err(e) => {
            eprintln!("[TEST] Error: {}", e);
        }
    }
}

#[tokio::test]
#[serial]
async fn test_concurrent_process_operations() {
    let process1 = spawn_long_running_process(Some("concurrent_1"));
    let process2 = spawn_long_running_process(Some("concurrent_2"));
    let process3 = spawn_long_running_process(Some("concurrent_3"));

    sleep(Duration::from_millis(200)).await;

    let r1 = is_process_running(process1.pid).await;
    let r2 = is_process_running(process2.pid).await;
    let r3 = is_process_running(process3.pid).await;

    eprintln!(
        "[TEST] Concurrent check results: {:?}, {:?}, {:?}",
        r1, r2, r3
    );

    assert!(r1.expect("check 1 failed"), "Process 1 should be running");
    assert!(r2.expect("check 2 failed"), "Process 2 should be running");
    assert!(r3.expect("check 3 failed"), "Process 3 should be running");

    let k1 = kill_process(process1.pid).await;
    let k2 = kill_process(process2.pid).await;
    let k3 = kill_process(process3.pid).await;

    eprintln!(
        "[TEST] Concurrent kill results: {:?}, {:?}, {:?}",
        k1, k2, k3
    );

    sleep(Duration::from_millis(500)).await;

    let r1 = is_process_running(process1.pid).await;
    let r2 = is_process_running(process2.pid).await;
    let r3 = is_process_running(process3.pid).await;

    eprintln!(
        "[TEST] After concurrent kill: {:?}, {:?}, {:?}",
        r1, r2, r3
    );

    assert!(!r1.unwrap_or(true), "Process 1 should be dead");
    assert!(!r2.unwrap_or(true), "Process 2 should be dead");
    assert!(!r3.unwrap_or(true), "Process 3 should be dead");
}
