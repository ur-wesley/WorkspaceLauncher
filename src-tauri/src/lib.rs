mod database;
mod generic_launcher;
mod launcher;
mod launcher_core;
mod launcher_utils;
mod monitor;
mod process;
mod recovery;

use generic_launcher::{auto_launch_actions, spawn_process};
use launcher::{launch_action, launch_workspace};
use monitor::get_system_metrics;
use process::{is_process_running, kill_process, resolve_descendant_pid};
use tauri::Manager;

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
                let app_local_data_dir = handle.path().app_local_data_dir().expect("failed to get app local data dir");
                if !app_local_data_dir.exists() {
                    std::fs::create_dir_all(&app_local_data_dir).expect("failed to create app local data dir");
                }
                let db_path = app_local_data_dir.join("workspacelauncher.db");
                let marker_path = app_local_data_dir.join(".reset_db_pending");

                println!("App Local Data Dir: {:?}", app_local_data_dir);
                println!("DB Path: {:?}", db_path);

                
                let reset_and_rescue = |app_local_data_dir: std::path::PathBuf, db_path: std::path::PathBuf| async move {
                    println!("Initiating database reset/rescue...");
                    
                    let rescued_data = if db_path.exists() {
                        println!("Attempting to rescue data from corrupted database...");
                        match recovery::rescue_data(&db_path).await {
                            Ok(data) => {
                                println!("Data rescued successfully.");
                                Some(data)
                            }
                            Err(e) => {
                                eprintln!("Failed to rescue data: {}", e);
                                None
                            }
                        }
                    } else {
                        None
                    };

                    
                    std::thread::sleep(std::time::Duration::from_secs(1));

                    
                    if db_path.exists() {
                        let timestamp = chrono::Local::now().format("%Y%m%d%H%M%S").to_string();
                        let new_name = format!("workspacelauncher.db.corrupted.{}", timestamp);
                        let backup_path = app_local_data_dir.join(&new_name);

                        match std::fs::rename(&db_path, &backup_path) {
                            Ok(_) => println!("Database reset successfully. Corrupted DB renamed to: {}", new_name),
                            Err(e) => {
                                eprintln!("Failed to rename corrupted database: {}", e);
                                
                                if let Err(del_err) = std::fs::remove_file(&db_path) {
                                     eprintln!("Failed to delete corrupted database: {}", del_err);
                                }
                            }
                        }
                    }

                    
                    let db_wal_path = app_local_data_dir.join("workspacelauncher.db-wal");
                    let db_shm_path = app_local_data_dir.join("workspacelauncher.db-shm");
                    
                    for path in [&db_wal_path, &db_shm_path] {
                        if let Err(e) = std::fs::remove_file(path) {
                            if e.kind() != std::io::ErrorKind::NotFound {
                                eprintln!("Failed to delete {:?}: {}", path, e);
                            }
                        }
                    }
                    
                    rescued_data
                };

                let mut rescued_data = None;

                
                if marker_path.exists() {
                    println!("Reset marker found.");
                    rescued_data = reset_and_rescue(app_local_data_dir.clone(), db_path.clone()).await;
                    if let Err(e) = std::fs::remove_file(&marker_path) {
                        eprintln!("Failed to remove reset marker: {}", e);
                    }
                }

                
                let db_url = format!("sqlite:{}", db_path.to_string_lossy());
                let init_db = || {
                    let migrations = database::get_migrations();
                    tauri_plugin_sql::Builder::default()
                        .add_migrations(&db_url, migrations)
                        .build()
                };

                
                println!("Initializing database...");
                let init_result = handle.plugin(init_db());

                if let Err(e) = init_result {
                    let err_str = e.to_string();
                    println!("Database initialization failed: {}", err_str);

                    
                    if err_str.contains("migration") && err_str.contains("modified") {
                        println!("Corrupted migration detected. Performing in-process self-healing...");
                        
                        
                        
                        
                        
                        
                        if rescued_data.is_none() {
                             rescued_data = reset_and_rescue(app_local_data_dir.clone(), db_path.clone()).await;
                        } else {
                             
                             println!("Warning: Init failed even after rescue attempt.");
                        }

                        
                        println!("Retrying database initialization...");
                        if let Err(retry_err) = handle.plugin(init_db()) {
                            eprintln!("CRITICAL: Failed to initialize fresh database: {}", retry_err);
                            panic!("Failed to initialize fresh database: {}", retry_err);
                        }
                        println!("Database initialized successfully (after retry).");
                    } else {
                         
                         eprintln!("Failed to initialize database (non-recoverable): {}", e);
                    }
                } else {
                    println!("Database initialized successfully.");
                }

                
                if let Some(data) = rescued_data {
                    println!("Attempting to restore data to new database...");
                    if let Err(restore_err) = recovery::restore_data(&db_path, data).await {
                        eprintln!("Failed to restore data: {}", restore_err);
                    } else {
                        println!("Data restored successfully.");
                    }
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
            get_system_metrics,
            get_system_metrics,
            schedule_db_reset,
            get_db_path
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
