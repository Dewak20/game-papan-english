import { isDbConfigured, prisma } from "@/lib/db";
import { cleanText, fail, noDb, ok, readJson } from "@/lib/http";

interface ClassPayload {
  name?: string;
  grade?: string;
  homeroom?: string;
}

/** GET /api/classes — daftar kelas. POST — buat kelas baru. */
export async function GET() {
  if (!isDbConfigured() || !prisma) return noDb();

  try {
    const rows = await prisma.class.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        grade: true,
        homeroom: true,
        _count: { select: { students: true } },
      },
    });
    return ok(
      rows.map((c) => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
        homeroom: c.homeroom,
        studentCount: c._count.students,
      })),
    );
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : "Gagal membaca kelas.");
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured() || !prisma) return noDb();

  const body = await readJson<ClassPayload>(request);
  const name = cleanText(body?.name, 80);
  if (!name) return fail(400, "Nama kelas wajib diisi.");

  try {
    const created = await prisma.class.create({
      data: {
        name,
        grade: cleanText(body?.grade, 20) || null,
        homeroom: cleanText(body?.homeroom, 120) || null,
      },
      select: { id: true, name: true, grade: true, homeroom: true },
    });
    return ok(created, { status: 201 });
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : "Gagal membuat kelas.");
  }
}
