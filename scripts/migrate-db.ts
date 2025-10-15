#!/usr/bin/env bun
/**
 * Database migration script to backup existing data and recreate with new schema
 * Usage: bun run scripts/migrate-db.ts
 */

import Database from "bun:sqlite";
import { existsSync } from "node:fs";
import { join } from "node:path";

const DB_PATH = join(
 process.env.APPDATA || "",
 "com.w4y.workspacelauncher",
 "workspacelauncher.db"
);
const BACKUP_PATH = join(
 process.env.APPDATA || "",
 "com.w4y.workspacelauncher",
 `workspacelauncher_backup_${Date.now()}.db`
);

interface Workspace {
 id: number;
 name: string;
 description: string | null;
 created_at: string;
 updated_at: string;
}

interface Action {
 id: number;
 workspace_id: number;
 name: string;
 action_type: string;
 config: string;
 dependencies: string | null;
 timeout_seconds: number | null;
 detached: number;
 os_overrides: string | null;
 order_index: number;
 created_at: string;
 updated_at: string;
}

interface Variable {
 id: number;
 workspace_id: number;
 key: string;
 value: string;
 is_secure: number;
 enabled: number;
 created_at: string;
 updated_at: string;
}

interface Settings {
 id: number;
 key: string;
 value: string;
 value_type: string;
 created_at: string;
 updated_at: string;
}

async function main() {
 console.log("🔍 Checking for existing database...");

 if (!existsSync(DB_PATH)) {
  console.log("❌ No database found at:", DB_PATH);
  console.log(
   "✅ Nothing to migrate - new database will be created on app start"
  );
  process.exit(0);
 }

 console.log("✅ Found database at:", DB_PATH);
 console.log("💾 Creating backup...");

 // Copy the database file
 await Bun.write(BACKUP_PATH, Bun.file(DB_PATH));
 console.log("✅ Backup created at:", BACKUP_PATH);

 // Open the database and export data
 console.log("📤 Exporting existing data...");
 const db = new Database(DB_PATH);

 // Check if tables exist
 const tables = db
  .query<{ name: string }, []>(
   "SELECT name FROM sqlite_master WHERE type='table'"
  )
  .all();
 const tableNames = tables.map((t: { name: string }) => t.name);

 console.log("📋 Found tables:", tableNames.join(", "));

 const exportData: {
  workspaces: Workspace[];
  actions: Action[];
  variables: Variable[];
  settings: Settings[];
  pinned_workspaces: number[];
 } = {
  workspaces: [],
  actions: [],
  variables: [],
  settings: [],
  pinned_workspaces: [],
 };

 // Export workspaces
 if (tableNames.includes("workspaces")) {
  exportData.workspaces = db
   .query<Workspace, []>("SELECT * FROM workspaces")
   .all();
  console.log(`  ✅ Exported ${exportData.workspaces.length} workspaces`);
 }

 // Export actions
 if (tableNames.includes("actions")) {
  exportData.actions = db.query<Action, []>("SELECT * FROM actions").all();
  console.log(`  ✅ Exported ${exportData.actions.length} actions`);
 }

 // Export variables
 if (tableNames.includes("variables")) {
  exportData.variables = db
   .query<Variable, []>("SELECT * FROM variables")
   .all();
  console.log(`  ✅ Exported ${exportData.variables.length} variables`);
 }

 // Export settings (excluding defaults that will be re-created)
 if (tableNames.includes("settings")) {
  const allSettings = db.query<Settings, []>("SELECT * FROM settings").all();
  exportData.settings = allSettings.filter(
   (s: Settings) => !["default_shell", "theme", "auto_save"].includes(s.key)
  );
  console.log(`  ✅ Exported ${exportData.settings.length} custom settings`);
 }

 // Check for pinned workspaces in localStorage format
 console.log(
  `  ℹ️  Note: Pinned workspaces are stored in localStorage, not database`
 );

 db.close();

 // Save export to JSON
 const exportPath = join(
  process.env.APPDATA || "",
  "com.w4y.workspacelauncher",
  "export.json"
 );
 await Bun.write(exportPath, JSON.stringify(exportData, null, 2));
 console.log("✅ Data exported to:", exportPath);

 // Rename the old database instead of deleting (in case it's locked)
 console.log("� Renaming old database...");
 const renamedPath = join(
  process.env.APPDATA || "",
  "com.w4y.workspacelauncher",
  "workspacelauncher_old.db"
 );
 const fs = await import("node:fs/promises");
 try {
  await fs.rename(DB_PATH, renamedPath);
  console.log("✅ Old database renamed to: workspacelauncher_old.db");
 } catch (error: unknown) {
  console.log("⚠️  Could not rename database (it might be in use)");
  console.log("   Error:", error);
  console.log("   Please close the app and manually delete:");
  console.log(`   ${DB_PATH}`);
  console.log("\n   Or run this command:");
  console.log(`   Remove-Item -Path "${DB_PATH}" -Force`);
 }

 console.log("\n✨ Migration prepared!");
 console.log("\n📝 Next steps:");
 console.log("1. Start the app with: bun run tauri dev");
 console.log("2. The new database will be created with the correct schema");
 console.log("3. Run: bun run scripts/restore-db.ts");
 console.log("\n💡 Your data is safely backed up at:");
 console.log(`   - ${BACKUP_PATH}`);
 console.log(`   - ${exportPath}`);
}

main().catch((error) => {
 console.error("❌ Migration failed:", error);
 process.exit(1);
});
