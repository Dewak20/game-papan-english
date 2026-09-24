import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
};

/**
 * Konfigurasi Vitest untuk Battle Learning Platform.
 *
 * Dua "project":
 *  - `logic`: unit test logika murni (lingkungan node) — cepat & stabil di CI.
 *  - `ui`:    tes komponen React (lingkungan jsdom) memakai Testing Library.
 */
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "logic",
          environment: "node",
          include: ["src/**/*.test.ts"],
          globals: true,
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          globals: true,
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
