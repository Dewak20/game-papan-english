import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Konfigurasi Prisma CLI (Prisma 7).
 *
 * - `DIRECT_URL` dipakai untuk migrasi (koneksi langsung ke Postgres).
 * - `DATABASE_URL` dipakai runtime aplikasi (boleh lewat connection pooler Supabase).
 * - Fallback placeholder hanya supaya `prisma generate` bisa jalan tanpa .env;
 *   perintah yang benar-benar menyentuh database tetap butuh URL asli.
 */
const url =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url,
  },
});
