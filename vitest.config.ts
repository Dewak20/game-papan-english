import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Konfigurasi Vitest untuk Battle Learning Platform.
 * Fokus pada unit test logika murni (tanpa DOM) agar cepat & stabil di CI.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
  },
});
