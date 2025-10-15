#!/usr/bin/env bun
/**
 * Fix script to add missing error_message column to runs table
 */
import Database from "bun:sqlite";
import { join } from "node:path";

const DB_PATH = join(
 process.env.APPDATA || "",
 "com.w4y.workspacelauncher",
 "workspacelauncher.db"
);

async function main() {
 console.log("🔧 Fixing runs table schema...");

 const db = new Database(DB_PATH);

 // Check if error_message column exists
 const columns = db.query("PRAGMA table_info(runs)").all() as Array<{
  name: string;
 }>;
 const hasErrorMessage = columns.some((col) => col.name === "error_message");

 if (hasErrorMessage) {
  console.log("✅ error_message column already exists!");
  db.close();
  return;
 }

 console.log("📝 Adding error_message column to runs table...");

 try {
  // SQLite doesn't support adding columns with constraints directly
  // But we can add a nullable column
  db.exec("ALTER TABLE runs ADD COLUMN error_message TEXT");
  console.log("✅ Added error_message column");

  // Verify
  const updatedColumns = db.query("PRAGMA table_info(runs)").all() as Array<{
   name: string;
  }>;
  const now = updatedColumns.some((col) => col.name === "error_message");

  if (now) {
   console.log("✅ Verification successful!");
  } else {
   console.log("❌ Verification failed - column not found");
  }
 } catch (error) {
  console.error("❌ Failed to add column:", error);
  throw error;
 } finally {
  db.close();
 }

 console.log("\n✨ Fix complete! You can now restart the app.");
}

main().catch((error) => {
 console.error("❌ Fix failed:", error);
 process.exit(1);
});
