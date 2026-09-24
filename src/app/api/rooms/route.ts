import { cleanText, fail, ok, readJson } from "@/lib/http";
import { createRoomWithHost } from "@/lib/roomStore";

/**
 * POST /api/rooms — buat ruang kelas baru (multiplayer lintas perangkat).
 * Body: { title?, gameSlug? }
 * Balasan: { view, hostToken }
 *
 * Disimpan di memori server (lihat `roomStore.ts`) sehingga tetap jalan
 * tanpa database — cocok untuk kelas di LAN (satu laptop guru sebagai server).
 */
export async function POST(request: Request) {
  const body = await readJson<{ title?: string; gameSlug?: string }>(request);
  if (!body) return fail(400, "Body JSON tidak valid.");

  const { view, hostToken } = createRoomWithHost({
    title: cleanText(body.title, 60, "Turnamen Kelas"),
    gameSlug: cleanText(body.gameSlug, 40, "bebas"),
  });

  return ok({ view, hostToken });
}
