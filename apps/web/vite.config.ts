import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// 從 repo 根載入共享 .env（與 apps/api 同一份）。維持物件式匯出，
// 以免 vitest.config.ts 的 mergeConfig 無法合併函式。
const env = loadEnv(
  process.env.NODE_ENV ?? "development",
  path.resolve(__dirname, "../.."),
  "",
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: Number(env.WEB_PORT ?? 3087),
    proxy: {
      "/api": {
        target: env.API_TARGET ?? "http://localhost:8090",
        changeOrigin: true,
      },
    },
  },
});
