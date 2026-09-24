import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Klien Prisma (server-only).
 *
 * Prisma 7 memakai **driver adapter** (`@prisma/adapter-pg`) untuk PostgreSQL.
 * Bila `DATABASE_URL` belum diisi, `prisma` bernilai `null` dan seluruh API
 * mengembalikan 503 — aplikasi tetap jalan penuh secara offline (localStorage).
 */

const globalForPrisma = globalThis as unknown as {
  blpPrisma?: PrismaClient | null;
};

function createClient(): PrismaClient | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;

  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  const adapter = new PrismaPg({
    connectionString: url,
    // Supabase memakai sertifikat yang tidak selalu ada di trust store Node.
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });

  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient | null =
  globalForPrisma.blpPrisma !== undefined
    ? globalForPrisma.blpPrisma
    : createClient();

// Simpan singleton agar hot-reload dev tidak membuka pool baru tiap request.
globalForPrisma.blpPrisma = prisma;

/** Apakah database sudah dikonfigurasi (DATABASE_URL tersedia)? */
export function isDbConfigured(): boolean {
  return prisma !== null;
}
