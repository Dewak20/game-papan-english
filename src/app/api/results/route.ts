import { isDbConfigured, prisma } from "@/lib/db";
import { cleanText, clampInt, fail, noDb, ok, readJson } from "@/lib/http";

interface ResultPayload {
  /** id dari klien → idempoten, retry tidak menghasilkan duplikat. */
  clientId?: string;
  game?: string;
  player?: string;
  score?: number;
}

/**
 * GET /api/results — daftar skor untuk papan peringkat (Fase 1.7).
 * Query: `?game=<slug>&limit=<n>` (opsional).
 *
 * `id` yang dikembalikan = `clientId ?? id` agar penggabungan dengan data
 * lokal (yang memakai id klien) bisa dideduplikasi dengan aman.
 */
export async function GET(request: Request) {
  if (!isDbConfigured() || !prisma) return noDb();

  const { searchParams } = new URL(request.url);
  const game = cleanText(searchParams.get("game"), 60);
  const limit = clampInt(searchParams.get("limit"), 1, 500, 100);

  try {
    const rows = await prisma.result.findMany({
      where: game ? { gameSlug: game } : undefined,
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        clientId: true,
        gameSlug: true,
        playerName: true,
        score: true,
        createdAt: true,
      },
    });

    return ok(
      rows.map((r) => ({
        id: r.clientId ?? r.id,
        game: r.gameSlug,
        player: r.playerName,
        score: r.score,
        date: r.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : "Gagal membaca skor.");
  }
}

/**
 * POST /api/results — simpan satu skor dari perangkat mana pun.
 * Body: { clientId, game, player, score }
 *
 * Idempoten lewat `clientId` (@unique): mengirim ulang entri yang sama
 * tidak menambah baris baru — penting untuk antrian sinkron offline.
 */
export async function POST(request: Request) {
  if (!isDbConfigured() || !prisma) return noDb();

  const body = await readJson<ResultPayload>(request);
  const clientId = cleanText(body?.clientId, 80);
  const game = cleanText(body?.game, 60);
  const player = cleanText(body?.player, 60, "Anonim");
  const score = clampInt(body?.score, 0, 1_000_000);

  if (!clientId) return fail(400, "clientId wajib diisi.");
  if (!game) return fail(400, "game wajib diisi.");

  try {
    const saved = await prisma.result.upsert({
      where: { clientId },
      create: { clientId, gameSlug: game, playerName: player, score },
      update: { score, playerName: player },
      select: { id: true, gameSlug: true, playerName: true, score: true, createdAt: true },
    });

    return ok({
      // id = clientId → sama dengan id entri lokal, sehingga penggabungan
      // lokal+cloud bisa dideduplikasi dengan aman.
      id: clientId,
      game: saved.gameSlug,
      player: saved.playerName,
      score: saved.score,
      date: saved.createdAt.toISOString(),
    });
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : "Gagal menyimpan skor.");
  }
}
