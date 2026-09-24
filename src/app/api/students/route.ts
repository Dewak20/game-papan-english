import { isTeacher } from "@/lib/auth";
import { isDbConfigured, prisma } from "@/lib/db";
import { cleanText, clampInt, fail, noDb, ok, readJson } from "@/lib/http";

export interface StudentPayload {
  nisn?: string;
  nama?: string;
  total_nilai?: number;
}

/**
 * GET /api/students — daftar siswa.
 * POST /api/students — ganti seluruh daftar (dipakai Panel Guru saat simpan).
 *   Body: { students: StudentPayload[] }
 */
export async function GET() {
  if (!isDbConfigured() || !prisma) return noDb();

  try {
    const rows = await prisma.student.findMany({
      orderBy: { name: "asc" },
      select: { nisn: true, name: true, legacyScore: true },
    });
    return ok(
      rows.map((r) => ({ nisn: r.nisn, nama: r.name, total_nilai: r.legacyScore })),
    );
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : "Gagal membaca siswa.");
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured() || !prisma) return noDb();
  if (!(await isTeacher())) return fail(401, "Butuh login guru.");

  const body = await readJson<{ students?: StudentPayload[] }>(request);
  const list = Array.isArray(body?.students) ? body.students : null;
  if (!list) return fail(400, "Format data siswa tidak valid.");

  const clean = list
    .map((s) => ({
      nisn: cleanText(s.nisn, 32),
      name: cleanText(s.nama, 120),
      legacyScore: clampInt(s.total_nilai, 0, 1_000_000),
    }))
    .filter((s) => s.nisn && s.name);

  try {
    // Ganti seluruh daftar dalam satu transaksi.
    await prisma.$transaction([
      prisma.student.deleteMany({}),
      prisma.student.createMany({ data: clean, skipDuplicates: true }),
    ]);
    return ok({ count: clean.length });
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : "Gagal menyimpan siswa.");
  }
}
