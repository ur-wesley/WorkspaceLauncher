#!/usr/bin/env bun
import Database from "bun:sqlite";
import { join } from "node:path";

const DB_PATH = join(
 process.env.APPDATA || "",
 "com.w4y.workspacelauncher",
 "workspacelauncher.db"
);

const db = new Database(DB_PATH);
console.log("Applied migrations:");
const migrations = db.query("SELECT * FROM _sqlx_migrations").all();
console.log(JSON.stringify(migrations, null, 2));

console.log("\nAll tables:");
const tables = db
 .query("SELECT name FROM sqlite_master WHERE type='table'")
 .all();
console.log(JSON.stringify(tables, null, 2));

db.close();
