use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub struct TestProcess {
    pub pid: u32,
    #[allow(dead_code)]
    pub command: String,
}

impl Drop for TestProcess {
    fn drop(&mut self) {
        let _ = self.kill();
    }
}

impl TestProcess {
    pub fn kill(&self) -> Result<(), String> {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;
            let mut cmd = Command::new("taskkill");
            cmd.args(&["/PID", &self.pid.to_string(), "/F", "/T"]);
            cmd.creation_flags(CREATE_NO_WINDOW);
            let _ = cmd.output();
            Ok(())
        }

        #[cfg(not(target_os = "windows"))]
        {
            use nix::sys::signal::{self, Signal};
            use nix::unistd::Pid;
            let _ = signal::kill(Pid::from_raw(self.pid as i32), Signal::SIGKILL);
            Ok(())
        }
    }
}

pub fn spawn_long_running_process(name: Option<&str>) -> TestProcess {
    let display_name = name.unwrap_or("test_process");

    #[cfg(target_os = "windows")]
    {
        let mut cmd = Command::new("cmd");
        cmd.args(["/C", "ping", "127.0.0.1", "-n", "6", ">", "NUL"]);
        cmd.creation_flags(CREATE_NO_WINDOW);
        let child = cmd.spawn().expect("failed to spawn long-running process");
        let pid = child.id();
        eprintln!("[TEST] Spawned {} with PID: {}", display_name, pid);
        TestProcess {
            pid,
            command: display_name.to_string(),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let child = Command::new("sleep")
            .arg("5")
            .spawn()
            .expect("failed to spawn long-running process");
        let pid = child.id();
        eprintln!("[TEST] Spawned {} with PID: {}", display_name, pid);
        TestProcess {
            pid,
            command: display_name.to_string(),
        }
    }
}


