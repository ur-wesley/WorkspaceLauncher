import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { fileURLToPath } from "node:url";

import UnocssPlugin from "@unocss/vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
 plugins: [solidPlugin(), UnocssPlugin()],
 clearScreen: false,
 // 2. tauri expects a fixed port, fail if that port is not available
 server: {
  port: 1420,
  strictPort: true,
  host: host || false,
  hmr: host
   ? {
      protocol: "ws",
      host,
      port: 1421,
     }
   : undefined,
  watch: {
   // 3. tell Vite to ignore watching `src-tauri`
   ignored: ["**/src-tauri/**"],
  },
 },

 resolve: {
  alias: {
   "@": resolve(__dirname, "./src"),
  },
 },
});
