use std::env;
use std::fs;
use std::io::Write;
use std::path::Path;

fn main() {
    let out_dir = env::var("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("migrations.rs");
    let mut f = fs::File::create(&dest_path).unwrap();

    let migrations_dir = Path::new("migrations");
    println!("cargo:rerun-if-changed=migrations");

    let mut migrations = fs::read_dir(migrations_dir)
        .expect("Failed to read migrations directory")
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("sql") {
                Some(path)
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

    migrations.sort();

    writeln!(
        f,
        "pub fn get_migrations() -> Vec<tauri_plugin_sql::Migration> {{"
    )
    .unwrap();
    writeln!(f, "    vec![").unwrap();

    for path in migrations {
        let filename = path.file_name().unwrap().to_str().unwrap();
        let parts: Vec<&str> = filename.splitn(2, '_').collect();
        if parts.len() < 2 {
            continue;
        }

        let version: i64 = parts[0].parse().expect("Failed to parse migration version");

        let abs_path = fs::canonicalize(&path).expect("Failed to canonicalize path");
        let path_str = abs_path.to_string_lossy().replace("\\", "/");

        let content = fs::read_to_string(&path).expect("Failed to read migration file");
        let description = if let Some(first_line) = content.lines().next() {
            if first_line.starts_with("--") {
                first_line.trim_start_matches('-').trim().to_string()
            } else {
                parts[1].replace(".sql", "").replace("_", " ")
            }
        } else {
            parts[1].replace(".sql", "").replace("_", " ")
        };

        writeln!(f, "        tauri_plugin_sql::Migration {{").unwrap();
        writeln!(f, "            version: {},", version).unwrap();
        writeln!(f, "            description: \"{}\",", description).unwrap();
        writeln!(f, "            sql: include_str!(\"{}\"),", path_str).unwrap();
        writeln!(f, "            kind: tauri_plugin_sql::MigrationKind::Up,").unwrap();
        writeln!(f, "        }},").unwrap();
    }

    writeln!(f, "    ]").unwrap();
    writeln!(f, "}}").unwrap();

    tauri_build::build()
}
