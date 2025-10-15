#!/usr/bin/env bun
/**
 * Database restore script to import backed up data into new schema
 * Usage: bun run scripts/restore-db.ts
 */

import Database from "bun:sqlite";
import { existsSync } from "node:fs";
import { join } from "node:path";

const DB_PATH = join(
 process.env.APPDATA || "",
 "com.w4y.workspacelauncher",
 "workspacelauncher.db"
);
const EXPORT_PATH = join(
 process.env.APPDATA || "",
 "com.w4y.workspacelauncher",
 "export.json"
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

interface ExportData {
 workspaces: Workspace[];
 actions: Action[];
 variables: Variable[];
 settings: Settings[];
 pinned_workspaces: number[];
}

async function main() {
 console.log("🔍 Checking for export file...");

 if (!existsSync(EXPORT_PATH)) {
  console.log("❌ No export file found at:", EXPORT_PATH);
  console.log("💡 Make sure you ran: bun run scripts/migrate-db.ts first");
  process.exit(1);
 }

 if (!existsSync(DB_PATH)) {
  console.log("❌ No database found at:", DB_PATH);
  console.log("💡 Start the app first to create the new database");
  console.log("   Run: bun run tauri dev");
  process.exit(1);
 }

 console.log("✅ Found export file");
 console.log("✅ Found new database");

 // Load export data
 const exportFile = Bun.file(EXPORT_PATH);
 const exportData: ExportData = await exportFile.json();

 console.log("\n📊 Export contains:");
 console.log(`  - ${exportData.workspaces.length} workspaces`);
 console.log(`  - ${exportData.actions.length} actions`);
 console.log(`  - ${exportData.variables.length} variables`);
 console.log(`  - ${exportData.settings.length} settings`);

 // Open database
 const db = new Database(DB_PATH);

 console.log("\n📥 Restoring data...");

 // Restore workspaces
 const insertWorkspace = db.prepare(`
		INSERT INTO workspaces (id, name, description, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`);

 for (const workspace of exportData.workspaces) {
  insertWorkspace.run(
   workspace.id,
   workspace.name,
   workspace.description,
   workspace.created_at,
   workspace.updated_at
  );
 }
 console.log(`  ✅ Restored ${exportData.workspaces.length} workspaces`);

 // Restore actions
 const insertAction = db.prepare(`
		INSERT INTO actions (
			id, workspace_id, name, action_type, config,
			dependencies, timeout_seconds, detached, os_overrides,
			order_index, created_at, updated_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);

 for (const action of exportData.actions) {
  insertAction.run(
   action.id,
   action.workspace_id,
   action.name,
   action.action_type,
   action.config,
   action.dependencies,
   action.timeout_seconds,
   action.detached,
   action.os_overrides,
   action.order_index,
   action.created_at,
   action.updated_at
  );
 }
 console.log(`  ✅ Restored ${exportData.actions.length} actions`);

 // Restore variables
 const insertVariable = db.prepare(`
		INSERT INTO variables (
			id, workspace_id, key, value, is_secure, enabled,
			created_at, updated_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`);

 for (const variable of exportData.variables) {
  insertVariable.run(
   variable.id,
   variable.workspace_id,
   variable.key,
   variable.value,
   variable.is_secure,
   variable.enabled,
   variable.created_at,
   variable.updated_at
  );
 }
 console.log(`  ✅ Restored ${exportData.variables.length} variables`);

 // Restore settings
 const insertSetting = db.prepare(`
		INSERT INTO settings (id, key, value, value_type, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`);

 for (const setting of exportData.settings) {
  insertSetting.run(
   setting.id,
   setting.key,
   setting.value,
   setting.value_type,
   setting.created_at,
   setting.updated_at
  );
 }
 console.log(`  ✅ Restored ${exportData.settings.length} settings`);

 // Update sequences
 const maxWorkspaceId = Math.max(0, ...exportData.workspaces.map((w) => w.id));
 const maxActionId = Math.max(0, ...exportData.actions.map((a) => a.id));
 const maxVariableId = Math.max(0, ...exportData.variables.map((v) => v.id));
 const maxSettingId = Math.max(0, ...exportData.settings.map((s) => s.id));

 if (maxWorkspaceId > 0) {
  db.exec(
   `UPDATE sqlite_sequence SET seq = ${maxWorkspaceId} WHERE name = 'workspaces'`
  );
 }
 if (maxActionId > 0) {
  db.exec(
   `UPDATE sqlite_sequence SET seq = ${maxActionId} WHERE name = 'actions'`
  );
 }
 if (maxVariableId > 0) {
  db.exec(
   `UPDATE sqlite_sequence SET seq = ${maxVariableId} WHERE name = 'variables'`
  );
 }
 if (maxSettingId > 0) {
  db.exec(
   `UPDATE sqlite_sequence SET seq = ${maxSettingId} WHERE name = 'settings'`
  );
 }

 console.log("  ✅ Updated auto-increment sequences");

 db.close();

 console.log("\n✨ Restore complete!");
 console.log("\n📝 Next steps:");
 console.log("1. Restart the app if it's running");
 console.log("2. Verify your data is restored correctly");
 console.log(
  "3. Check pinned workspaces (they're in localStorage, not affected)"
 );
 console.log("\n💡 The export file is kept at:", EXPORT_PATH);
 console.log("   You can delete it once you've verified everything works");
}

main().catch((error) => {
 console.error("❌ Restore failed:", error);
 process.exit(1);
});
