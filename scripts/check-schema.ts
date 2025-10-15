#!/usr/bin/env bun
import Database from "bun:sqlite";
import { join } from "node:path";

const DB_PATH = join(
 process.env.APPDATA || "",
 "com.w4y.workspacelauncher",
 "workspacelauncher.db"
);

const db = new Database(DB_PATH);
const info = db.query("PRAGMA table_info(runs)").all();
console.log("Runs table schema:");
console.log(JSON.stringify(info, null, 2));
db.close();
