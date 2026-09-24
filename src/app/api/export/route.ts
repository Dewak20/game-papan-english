import { isTeacher } from "@/lib/auth";
import { isDbConfigured, prisma } from "@/lib/db";
import { fail, noDb } from "@/lib/http";

/**
 * GET /api/export — backup seluruh data sebagai JSON (Fase 1.9).
 * Hanya untuk guru yang sudah login.
 */
export async function GET() {
  if (!isDbConfigured() || !prisma) return noDb();
  if (!(await isTeacher())) return fail(401, "Butuh login guru.");

  try {
    const [classes, students, decks, items, results] = await Promise.all([
      prisma.class.findMany(),
      prisma.student.findMany(),
      prisma.deck.findMany(),
      prisma.item.findMany(),
      prisma.result.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

    return new Response(
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          version: 1,
          classes,
          students,
          decks,
          items,
          results,
        },
        null,
        2,
      ),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="blp-backup-${new Date()
            .toISOString()
            .slice(0, 10)}.json"`,
        },
      },
    );
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : "Gagal membuat backup.");
  }
}
