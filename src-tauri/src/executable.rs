use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoverExecutableRequest {
    pub command: String,
    pub working_directory: Option<String>,
    pub extra_paths: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoverExecutableResult {
    pub found: bool,
    pub resolved_path: Option<String>,
    pub candidates_tried: Vec<String>,
    pub message: String,
}

fn push_unique(candidates: &mut Vec<String>, seen: &mut HashSet<String>, value: String) {
    let key = value.to_lowercase();
    if seen.insert(key) {
        candidates.push(value);
    }
}

fn file_exists_at(path: &Path) -> bool {
    path.is_file()
}

fn resolve_existing_path(command: &str, working_directory: Option<&str>) -> Option<String> {
    let path = Path::new(command);
    if file_exists_at(path) {
        return path.to_str().map(|s| s.to_string());
    }
    if let Some(wd) = working_directory {
        let joined = PathBuf::from(wd).join(command);
        if file_exists_at(&joined) {
            return joined.to_str().map(|s| s.to_string());
        }
    }
    None
}

pub fn lookup_in_path(name: &str) -> Option<String> {
    let name = name.trim();
    if name.is_empty() {
        return None;
    }

    #[cfg(target_os = "windows")]
    {
        let mut cmd = Command::new("where.exe");
        cmd.arg(name);
        cmd.creation_flags(CREATE_NO_WINDOW);
        if let Ok(output) = cmd.output() {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    let line = line.trim();
                    if !line.is_empty() && Path::new(line).exists() {
                        return Some(line.to_string());
                    }
                }
            }
        }
        None
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(output) = Command::new("which").arg(name).output() {
            if output.status.success() {
                let line = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !line.is_empty() {
                    return Some(line);
                }
            }
        }
        None
    }
}

fn scan_extra_paths(command: &str, extra_paths: &[String], candidates: &mut Vec<String>, seen: &mut HashSet<String>) {
    let base = Path::new(command)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(command);

    for dir in extra_paths {
        let dir = dir.trim();
        if dir.is_empty() {
            continue;
        }
        let direct = PathBuf::from(dir).join(command);
        if file_exists_at(&direct) {
            if let Some(s) = direct.to_str() {
                push_unique(candidates, seen, s.to_string());
            }
        }
        let by_name = PathBuf::from(dir).join(base);
        if file_exists_at(&by_name) {
            if let Some(s) = by_name.to_str() {
                push_unique(candidates, seen, s.to_string());
            }
        }
        #[cfg(target_os = "windows")]
        for ext in [".exe", ".cmd", ".bat", ".com"] {
            if !base.to_lowercase().ends_with(ext) {
                let with_ext = PathBuf::from(dir).join(format!("{base}{ext}"));
                if file_exists_at(&with_ext) {
                    if let Some(s) = with_ext.to_str() {
                        push_unique(candidates, seen, s.to_string());
                    }
                }
            }
        }
    }
}

pub fn build_executable_candidates(
    command: &str,
    working_directory: Option<&str>,
    extra_paths: Option<&[String]>,
) -> Vec<String> {
    let command = command.trim();
    if command.is_empty() {
        return vec![];
    }

    let mut candidates = Vec::new();
    let mut seen = HashSet::new();

    if let Some(existing) = resolve_existing_path(command, working_directory) {
        push_unique(&mut candidates, &mut seen, existing);
    }

    push_unique(&mut candidates, &mut seen, command.to_string());

    if let Some(found) = lookup_in_path(command) {
        push_unique(&mut candidates, &mut seen, found);
    }

    #[cfg(target_os = "windows")]
    {
        let lower = command.to_lowercase();
        for ext in [".exe", ".cmd", ".bat", ".com"] {
            if !lower.ends_with(ext) {
                let with_ext = format!("{command}{ext}");
                push_unique(&mut candidates, &mut seen, with_ext.clone());
                if let Some(found) = lookup_in_path(&with_ext) {
                    push_unique(&mut candidates, &mut seen, found);
                }
            }
        }
    }

    if let Some(paths) = extra_paths {
        scan_extra_paths(command, paths, &mut candidates, &mut seen);
    }

    candidates
}

#[tauri::command]
pub async fn discover_executable(
    req: DiscoverExecutableRequest,
) -> Result<DiscoverExecutableResult, String> {
    let candidates = build_executable_candidates(
        &req.command,
        req.working_directory.as_deref(),
        req.extra_paths.as_deref(),
    );

    let mut resolved: Option<String> = None;
    for c in &candidates {
        if let Some(path) = resolve_existing_path(c, req.working_directory.as_deref()) {
            resolved = Some(path);
            break;
        }
        if Path::new(c).exists() {
            resolved = Some(c.clone());
            break;
        }
    }

    if resolved.is_none() {
        resolved = lookup_in_path(req.command.trim());
    }

    let found = resolved.is_some();
    let message = if found {
        format!("Found: {}", resolved.as_ref().unwrap())
    } else {
        format!(
            "\"{}\" not found on PATH. Use Test discovery or set the full path to the executable.",
            req.command.trim()
        )
    };

    Ok(DiscoverExecutableResult {
        found,
        resolved_path: resolved,
        candidates_tried: candidates,
        message,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_candidates_includes_command() {
        let candidates = build_executable_candidates("npm", None, None);
        assert!(!candidates.is_empty());
        assert!(candidates.iter().any(|c| c == "npm"));
    }

    #[test]
    fn build_candidates_absolute_path() {
        #[cfg(target_os = "windows")]
        let path = "C:\\Windows\\System32\\cmd.exe";
        #[cfg(not(target_os = "windows"))]
        let path = "/bin/sh";

        let candidates = build_executable_candidates(path, None, None);
        assert!(candidates.iter().any(|c| c == path));
    }

    #[tokio::test]
    async fn discover_finds_system_command() {
        #[cfg(target_os = "windows")]
        let command = "cmd.exe";
        #[cfg(not(target_os = "windows"))]
        let command = "sh";

        let result = discover_executable(DiscoverExecutableRequest {
            command: command.to_string(),
            working_directory: None,
            extra_paths: None,
        })
        .await
        .expect("discover_executable failed");

        assert!(result.found, "expected to find {}", command);
        assert!(result.resolved_path.is_some());
    }

    #[tokio::test]
    async fn discover_missing_command() {
        let result = discover_executable(DiscoverExecutableRequest {
            command: "definitely-not-a-real-binary-xyz123".to_string(),
            working_directory: None,
            extra_paths: None,
        })
        .await
        .expect("discover_executable failed");

        assert!(!result.found);
    }
}
