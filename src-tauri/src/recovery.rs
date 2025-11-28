use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::sqlite::{SqlitePoolOptions, SqliteRow};
use sqlx::{Column, Row, ValueRef};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct TableData {
    pub name: String,
    pub columns: Vec<String>,
    pub rows: Vec<Vec<Value>>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct AllData {
    pub tables: Vec<TableData>,
}

pub async fn rescue_data(db_path: &Path) -> Result<AllData, String> {
    if !db_path.exists() {
        return Err("Database file does not exist".to_string());
    }

    let conn_str = format!("sqlite://{}", db_path.to_string_lossy());
    let pool = SqlitePoolOptions::new()
        .connect(&conn_str)
        .await
        .map_err(|e| format!("Failed to connect to corrupted DB: {}", e))?;

    let mut all_data = AllData::default();

    let tables: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to fetch table names: {}", e))?;

    for (table_name,) in tables {
        let query = format!("SELECT * FROM {}", table_name);
        let rows = match sqlx::query(&query).fetch_all(&pool).await {
            Ok(rows) => rows,
            Err(e) => {
                println!("Failed to read table {}: {}", table_name, e);
                continue;
            }
        };

        if rows.is_empty() {
            continue;
        }

        let columns: Vec<String> = rows[0]
            .columns()
            .iter()
            .map(|c| c.name().to_string())
            .collect();
        let mut table_rows = vec![];

        for row in rows {
            let mut row_values = vec![];
            for (i, _) in columns.iter().enumerate() {
                let val = extract_value(&row, i);
                row_values.push(val);
            }
            table_rows.push(row_values);
        }

        all_data.tables.push(TableData {
            name: table_name,
            columns,
            rows: table_rows,
        });
    }

    pool.close().await;
    Ok(all_data)
}

fn extract_value(row: &SqliteRow, index: usize) -> Value {
    let val_ref = row.try_get_raw(index).unwrap();
    if val_ref.is_null() {
        return Value::Null;
    }

    if let Ok(v) = row.try_get::<i64, _>(index) {
        return Value::Number(v.into());
    }

    if let Ok(v) = row.try_get::<f64, _>(index) {
        if let Some(n) = serde_json::Number::from_f64(v) {
            return Value::Number(n);
        }
    }

    if let Ok(v) = row.try_get::<String, _>(index) {
        return Value::String(v);
    }

    if let Ok(v) = row.try_get::<String, _>(index) {
        return Value::String(v);
    }

    Value::Null
}

pub async fn restore_data(db_path: &Path, data: AllData) -> Result<(), String> {
    if !db_path.exists() {
        return Err("Target database file does not exist".to_string());
    }

    let conn_str = format!("sqlite://{}", db_path.to_string_lossy());
    let pool = SqlitePoolOptions::new()
        .connect(&conn_str)
        .await
        .map_err(|e| format!("Failed to connect to new DB: {}", e))?;

    sqlx::query("PRAGMA foreign_keys = OFF")
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to disable foreign keys: {}", e))?;

    for table in data.tables {
        if table.rows.is_empty() {
            continue;
        }

        println!("Restoring table: {}", table.name);

        let cols = table.columns.join(", ");
        let placeholders = table
            .columns
            .iter()
            .map(|_| "?")
            .collect::<Vec<_>>()
            .join(", ");
        let query = format!(
            "INSERT INTO {} ({}) VALUES ({})",
            table.name, cols, placeholders
        );

        for row in table.rows {
            let mut query_builder = sqlx::query(&query);
            for val in row {
                match val {
                    Value::Null => query_builder = query_builder.bind(Option::<String>::None),
                    Value::Number(n) => {
                        if n.is_i64() {
                            query_builder = query_builder.bind(n.as_i64());
                        } else if n.is_f64() {
                            query_builder = query_builder.bind(n.as_f64());
                        } else {
                            query_builder = query_builder.bind(n.to_string());
                        }
                    }
                    Value::String(s) => query_builder = query_builder.bind(s),
                    Value::Bool(b) => query_builder = query_builder.bind(b),
                    Value::Array(_) | Value::Object(_) => {
                        query_builder = query_builder.bind(val.to_string())
                    }
                }
            }

            if let Err(e) = query_builder.execute(&pool).await {
                println!("Failed to restore row in {}: {}", table.name, e);
            }
        }
    }

    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;

    pool.close().await;
    Ok(())
}
