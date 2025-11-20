import { defineConfig } from "bumpp";

export default defineConfig({
  files: [
    "package.json",
    "landing/package.json",
    "src-tauri/Cargo.toml",
    "src-tauri/tauri.conf.json",
  ],
});
