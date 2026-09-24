import { isDbConfigured, prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";

/**
 * GET /api/health — status kesiapan cloud.
 * Dipakai halaman /admin untuk menampilkan apakah database tersambung.
 */
export async function GET() {
  if (!isDbConfigured() || !prisma) {
    return ok({ db: false, reachable: false, message: "DATABASE_URL belum diisi." });
  }

  try {
    const [students, results] = await Promise.all([
      prisma.student.count(),
      prisma.result.count(),
    ]);
    return ok({
      db: true,
      reachable: true,
      students,
      results,
      message: "Database tersambung.",
    });
  } catch (error) {
    return fail(
      500,
      `Database terkonfigurasi tetapi tidak bisa diakses: ${
        error instanceof Error ? error.message : "unknown"
      }`,
    );
  }
}
