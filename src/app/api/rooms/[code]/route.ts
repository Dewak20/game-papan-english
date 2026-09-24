import { cleanText, fail, ok, readJson } from "@/lib/http";
import { getView, isHost, mutateRoom, roomOps, toView } from "@/lib/roomStore";

/**
 * GET /api/rooms/[code] — ambil keadaan ruang (untuk polling papan besar & HP).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const view = getView(code);
  if (!view) return fail(404, "Ruang tidak ditemukan (mungkin sudah kedaluwarsa).");
  return ok(view);
}

interface ActionBody {
  action?: string;
  /** Token host untuk operasi yang hanya boleh dilakukan guru. */
  token?: string;
  playerId?: string;
  name?: string;
  value?: number;
  mode?: "set" | "add";
  phase?: "lobby" | "playing" | "ended";
}

/**
 * POST /api/rooms/[code] — aksi pada ruang.
 *
 * Aksi pemain (tanpa token): `join`, `score` (hanya boleh menaikkan skor sendiri).
 * Aksi host (butuh `token`): `remove`, `phase`, `reset`, `score` (bebas).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = await readJson<ActionBody>(request);
  if (!body || !body.action) return fail(400, "Aksi tidak dikenal.");

  const token = cleanText(body.token, 64);
  const host = token ? isHost(code, token) : false;

  switch (body.action) {
    case "join": {
      const id = cleanText(body.playerId, 40) || crypto.randomUUID();
      const name = cleanText(body.name, 24, "Pemain");
      const room = mutateRoom(code, (r) => roomOps.join(r, { id, name }));
      if (!room) return fail(404, "Ruang tidak ditemukan.");
      return ok({ view: toView(room), playerId: id });
    }

    case "score": {
      const playerId = cleanText(body.playerId, 40);
      if (!playerId) return fail(400, "playerId wajib diisi.");
      const value = typeof body.value === "number" ? body.value : Number(body.value);
      if (!Number.isFinite(value)) return fail(400, "Nilai skor tidak valid.");
      // Pemain biasa hanya boleh menambah skor sendiri (bukan menimpa/menurunkan).
      const mode: "set" | "add" = host ? (body.mode ?? "set") : "add";
      if (!host && value < 0) return fail(403, "Hanya guru yang boleh mengurangi skor.");
      const room = mutateRoom(code, (r) => roomOps.score(r, playerId, value, mode));
      if (!room) return fail(404, "Ruang tidak ditemukan.");
      return ok(toView(room));
    }

    case "remove": {
      if (!host) return fail(403, "Butuh token host.");
      const playerId = cleanText(body.playerId, 40);
      const room = mutateRoom(code, (r) => roomOps.remove(r, playerId));
      if (!room) return fail(404, "Ruang tidak ditemukan.");
      return ok(toView(room));
    }

    case "phase": {
      if (!host) return fail(403, "Butuh token host.");
      const phase = body.phase;
      if (phase !== "lobby" && phase !== "playing" && phase !== "ended") {
        return fail(400, "Fase tidak valid.");
      }
      const room = mutateRoom(code, (r) => roomOps.phase(r, phase));
      if (!room) return fail(404, "Ruang tidak ditemukan.");
      return ok(toView(room));
    }

    case "reset": {
      if (!host) return fail(403, "Butuh token host.");
      const room = mutateRoom(code, (r) => roomOps.reset(r));
      if (!room) return fail(404, "Ruang tidak ditemukan.");
      return ok(toView(room));
    }

    default:
      return fail(400, `Aksi "${body.action}" tidak dikenal.`);
  }
}
