mod database;
mod executable;
mod generic_launcher;
mod launcher;
mod launcher_core;
mod launcher_utils;
mod monitor;
mod process;
mod recovery;

pub mod test_helpers;

use generic_launcher::{auto_launch_actions, spawn_process};
use launcher::{launch_action, launch_workspace};
use monitor::get_system_metrics;
use executable::discover_executable;
use process::{find_server_process, is_process_running, kill_process, resolve_descendant_pid};
use recovery::AllData;
use std::path::{Path, PathBuf};
use std::time::Duration;
use tauri::Manager;
use tokio::sync::Mutex;

#[derive(Default)]
struct DbInitState(Mutex<Option<String>>);

async fn delete_db_sidecars(app_local_data_dir: &Path) {
    for suffix in ["-wal", "-shm"] {
        let path = app_local_data_dir.join(format!("workspacelauncher.db{suffix}"));
        if let Err(e) = std::fs::remove_file(&path) {
            if e.kind() != std::io::ErrorKind::NotFound {
                eprintln!("Failed to delete {:?}: {}", path, e);
            }
        }
    }
}

async fn remove_db_file(app_local_data_dir: &Path, db_path: &Path) -> bool {
    delete_db_sidecars(app_local_data_dir).await;

    for attempt in 0..5 {
        if !db_path.exists() {
            return true;
        }

        let timestamp = chrono::Local::now().format("%Y%m%d%H%M%S").to_string();
        let new_name = format!("workspacelauncher.db.corrupted.{timestamp}");
        let backup_path = app_local_data_dir.join(&new_name);

        match std::fs::rename(db_path, &backup_path) {
            Ok(_) => {
                println!("Database reset successfully. Corrupted DB renamed to: {new_name}");
                return true;
            }
            Err(e) => {
                eprintln!(
                    "Failed to rename database (attempt {}): {}",
                    attempt + 1,
                    e
                );
                if let Err(del_err) = std::fs::remove_file(db_path) {
                    eprintln!("Failed to delete database file: {del_err}");
                }
                tokio::time::sleep(Duration::from_millis(200 * (attempt as u64 + 1))).await;
            }
        }
    }

    if db_path.exists() {
        eprintln!("CRITICAL: Could not remove database file at {:?}", db_path);
        false
    } else {
        true
    }
}

async fn reset_and_rescue(
    app_local_data_dir: PathBuf,
    db_path: PathBuf,
) -> Option<AllData> {
    println!("Initiating database reset/rescue...");

    let rescued_data = if db_path.exists() {
        println!("Attempting to rescue data from database...");
        match recovery::rescue_data(&db_path).await {
            Ok(data) => {
                println!("Data rescued successfully.");
                Some(data)
            }
            Err(e) => {
                eprintln!("Failed to rescue data: {e}");
                None
            }
        }
    } else {
        None
    };

    tokio::time::sleep(Duration::from_secs(1)).await;

    if !remove_db_file(&app_local_data_dir, &db_path).await {
        eprintln!("Database file could not be removed; migration repair may fail.");
    }

    rescued_data
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[tauri::command]
fn schedule_db_reset(app_handle: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    let app_local_data_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?;
    let marker_path = app_local_data_dir.join(".reset_db_pending");
    std::fs::File::create(&marker_path).map_err(|e| e.to_string())?;
    println!(
        "Database reset scheduled. Marker created at: {:?}",
        marker_path
    );
    Ok(())
}

#[tauri::command]
async fn get_db_init_error(
    state: tauri::State<'_, DbInitState>,
) -> Result<Option<String>, String> {
    Ok(state.0.lock().await.clone())
}

#[tauri::command]
async fn repair_database(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, DbInitState>,
) -> Result<(), String> {
    let app_local_data_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?;
    let db_path = app_local_data_dir.join("workspacelauncher.db");

    let rescued_data = reset_and_rescue(app_local_data_dir.clone(), db_path.clone()).await;

    database::run_migrations(&db_path)
        .await
        .map_err(|e| format!("Failed to run migrations after repair: {e}"))?;

    if let Some(data) = rescued_data {
        recovery::restore_data(&db_path, data)
            .await
            .map_err(|e| format!("Failed to restore data after repair: {e}"))?;
    }

    *state.0.lock().await = None;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name("workspacelauncher")
                .build(),
        )
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let app_local_data_dir = handle
                    .path()
                    .app_local_data_dir()
                    .expect("failed to get app local data dir");
                if !app_local_data_dir.exists() {
                    std::fs::create_dir_all(&app_local_data_dir)
                        .expect("failed to create app local data dir");
                }
                let db_path = app_local_data_dir.join("workspacelauncher.db");
                let marker_path = app_local_data_dir.join(".reset_db_pending");

                println!("App Local Data Dir: {:?}", app_local_data_dir);
                println!("DB Path: {:?}", db_path);

                let db_init_state = DbInitState::default();
                let mut rescued_data: Option<AllData> = None;

                if marker_path.exists() {
                    println!("Reset marker found.");
                    rescued_data =
                        reset_and_rescue(app_local_data_dir.clone(), db_path.clone()).await;
                    if let Err(e) = std::fs::remove_file(&marker_path) {
                        eprintln!("Failed to remove reset marker: {e}");
                    }
                }

                let mut migration_ok = false;

                match database::run_migrations(&db_path).await {
                    Ok(()) => {
                        migration_ok = true;
                        println!("Database migrations applied successfully.");
                    }
                    Err(ref e) if database::is_migration_checksum_error(e) => {
                        println!("Migration checksum mismatch: {e}");
                        let has_data = database::has_user_data(&db_path).await.unwrap_or(false);

                        if has_data {
                            *db_init_state.0.lock().await = Some(format!(
                                "Database needs migration repair after an app update. Your workspaces are preserved. Click Repair Database to fix this. ({e})"
                            ));
                        } else {
                            println!("No user data found; resetting database and retrying migrations.");
                            rescued_data = reset_and_rescue(
                                app_local_data_dir.clone(),
                                db_path.clone(),
                            )
                            .await
                            .or(rescued_data);

                            match database::run_migrations(&db_path).await {
                                Ok(()) => {
                                    migration_ok = true;
                                    println!("Database migrations applied after reset.");
                                }
                                Err(retry_err) => {
                                    eprintln!("Migration retry failed: {retry_err}");
                                    *db_init_state.0.lock().await = Some(retry_err);
                                }
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Database migration failed: {e}");
                        *db_init_state.0.lock().await = Some(e);
                    }
                }

                if migration_ok {
                    if let Some(data) = rescued_data {
                        println!("Attempting to restore rescued data...");
                        if let Err(restore_err) =
                            recovery::restore_data(&db_path, data).await
                        {
                            eprintln!("Failed to restore data: {restore_err}");
                        } else {
                            println!("Data restored successfully.");
                        }
                    }
                }

                handle.manage(db_init_state);

                println!("Initializing SQL plugin...");
                if let Err(e) = handle.plugin(tauri_plugin_sql::Builder::default().build()) {
                    eprintln!("Failed to initialize SQL plugin: {e}");
                } else {
                    println!("SQL plugin initialized successfully.");
                }

                println!("Setup async block completed.");
            });
            println!("Setup finished successfully.");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            launch_action,
            launch_workspace,
            spawn_process,
            auto_launch_actions,
            kill_process,
            is_process_running,
            resolve_descendant_pid,
            find_server_process,
            discover_executable,
            get_system_metrics,
            get_system_metrics,
            schedule_db_reset,
            get_db_path,
            get_db_init_error,
            repair_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_db_path(app_handle: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;
    let app_local_data_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?;
    let db_path = app_local_data_dir.join("workspacelauncher.db");
    Ok(db_path.to_string_lossy().to_string())
}
