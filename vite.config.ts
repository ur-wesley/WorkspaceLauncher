import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import solidPlugin from "vite-plugin-solid";
import UnocssPlugin from "@unocss/vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [solidPlugin(), UnocssPlugin()],
  clearScreen: false,
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
      ignored: ["**/src-tauri/**"],
    },
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
