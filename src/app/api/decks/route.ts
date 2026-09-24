import { isDbConfigured, prisma } from "@/lib/db";
import { cleanText, fail, noDb, ok, readJson } from "@/lib/http";

interface DeckPayload {
  title?: string;
  skill?: string;
  level?: string;
  tags?: string[];
  isPublic?: boolean;
}

/** GET /api/decks — daftar deck. POST — buat deck baru (Fase 4.2). */
export async function GET() {
  if (!isDbConfigured() || !prisma) return noDb();

  try {
    const rows = await prisma.deck.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        skill: true,
        level: true,
        tags: true,
        isPublic: true,
        _count: { select: { items: true } },
      },
    });
    return ok(
      rows.map((d) => ({
        id: d.id,
        title: d.title,
        skill: d.skill,
        level: d.level,
        tags: d.tags,
        isPublic: d.isPublic,
        itemCount: d._count.items,
      })),
    );
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : "Gagal membaca deck.");
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured() || !prisma) return noDb();

  const body = await readJson<DeckPayload>(request);
  const title = cleanText(body?.title, 120);
  const skill = cleanText(body?.skill, 40);
  if (!title || !skill) return fail(400, "Judul dan skill wajib diisi.");

  const tags = Array.isArray(body?.tags)
    ? body.tags.filter((t): t is string => typeof t === "string").slice(0, 12)
    : [];

  try {
    const created = await prisma.deck.create({
      data: {
        title,
        skill,
        level: cleanText(body?.level, 20) || null,
        tags,
        isPublic: Boolean(body?.isPublic),
      },
      select: { id: true, title: true, skill: true, level: true, tags: true },
    });
    return ok(created, { status: 201 });
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : "Gagal membuat deck.");
  }
}
