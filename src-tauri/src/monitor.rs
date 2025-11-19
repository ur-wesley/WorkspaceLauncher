use serde::Serialize;
use sysinfo::{Pid, System};

#[derive(Debug, Serialize)]
pub struct MetricsSnapshot {
    pub cpu_usage: f32,
    pub total_memory: u64,
    pub used_memory: u64,
    pub total_swap: u64,
    pub used_swap: u64,
    pub process: Option<ProcessSnapshot>,
}

#[derive(Debug, Serialize)]
pub struct ProcessSnapshot {
    pub pid: u32,
    pub cpu_usage: f32,
    pub memory: u64,
    pub name: String,
}

#[tauri::command]
pub async fn get_system_metrics(target_pid: Option<u32>) -> Result<MetricsSnapshot, String> {
    let mut sys = System::new_all();

    sys.refresh_all();

    let cpu_usage = sys.global_cpu_usage();
    let total_memory = sys.total_memory();
    let used_memory = sys.used_memory();
    let total_swap = sys.total_swap();
    let used_swap = sys.used_swap();

    let process = target_pid.and_then(|pid| {
        let pid = Pid::from_u32(pid);
        sys.process(pid).map(|p| ProcessSnapshot {
            pid: p.pid().as_u32(),
            cpu_usage: p.cpu_usage(),
            memory: p.memory(),
            name: p.name().to_string_lossy().into_owned(),
        })
    });

    Ok(MetricsSnapshot {
        cpu_usage,
        total_memory,
        used_memory,
        total_swap,
        used_swap,
        process,
    })
}
