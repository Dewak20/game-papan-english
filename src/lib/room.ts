/**
 * Logika "Ruang Kelas" (multiplayer lintas perangkat) — murni & bisa diuji.
 *
 * Alur pakai di kelas:
 * 1. Guru membuka `/live` di papan besar → ruang dibuat, muncul **kode** (mis. `K7P2`).
 * 2. Siswa membuka `/live` di HP → masukkan kode + nama → masuk ke daftar.
 * 3. Skor tiap tim dikirim dari HP dan disinkronkan ke papan besar (polling).
 *
 * Modul ini hanya berisi fungsi murni atas objek state; penyimpanan (in-memory
 * di server) ada di `roomStore.ts`. Dengan begitu logika bisa diuji tanpa
 * server/DB (lihat `room.test.ts`).
 */

export interface RoomPlayer {
  id: string;
  name: string;
  score: number;
  /** ISO time saat pemain masuk. */
  joinedAt: string;
  /** ISO time terakhir pemain terlihat (untuk pembersihan pemain pasif). */
  lastSeen: string;
}

export interface RoomState {
  code: string;
  title: string;
  /** Slug game yang sedang dimainkan (boleh `"bebas"`). */
  gameSlug: string;
  phase: "lobby" | "playing" | "ended";
  players: RoomPlayer[];
  createdAt: string;
  updatedAt: string;
}

/** Huruf/angka yang mudah dibaca (tanpa 0/O/1/I/L). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Buat kode ruang acak 4 huruf. */
export function makeRoomCode(rand: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  }
  return out;
}

/** Normalisasi kode dari input pengguna (huruf besar, buang spasi). */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

/** Nama pemain dibersihkan & dibatasi. */
export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 24);
}

export function createRoom(
  opts: { code: string; title?: string; gameSlug?: string },
  now: Date = new Date(),
): RoomState {
  const iso = now.toISOString();
  return {
    code: normalizeCode(opts.code),
    title: (opts.title ?? "Turnamen Kelas").slice(0, 60),
    gameSlug: opts.gameSlug ?? "bebas",
    phase: "lobby",
    players: [],
    createdAt: iso,
    updatedAt: iso,
  };
}

/** Tambah pemain. Bila nama sudah ada, pemain itu dipakai kembali (id sama). */
export function joinRoom(
  room: RoomState,
  player: { id: string; name: string },
  now: Date = new Date(),
): RoomState {
  const iso = now.toISOString();
  const name = cleanName(player.name) || "Pemain";
  const existing = room.players.find(
    (p) => p.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) {
    return {
      ...room,
      players: room.players.map((p) =>
        p.id === existing.id ? { ...p, lastSeen: iso } : p,
      ),
      updatedAt: iso,
    };
  }
  const next: RoomPlayer = {
    id: player.id,
    name,
    score: 0,
    joinedAt: iso,
    lastSeen: iso,
  };
  return { ...room, players: [...room.players, next], updatedAt: iso };
}

/**
 * Atur skor seorang pemain. `mode: "set"` menimpa, `mode: "add"` menambah.
 * Skor dikurung pada 0..99999.
 */
export function setScore(
  room: RoomState,
  playerId: string,
  value: number,
  mode: "set" | "add" = "set",
  now: Date = new Date(),
): RoomState {
  const iso = now.toISOString();
  const clamp = (n: number) => Math.max(0, Math.min(99999, Math.floor(n) || 0));
  return {
    ...room,
    players: room.players.map((p) => {
      if (p.id !== playerId) return p;
      const score = mode === "add" ? clamp(p.score + value) : clamp(value);
      return { ...p, score, lastSeen: iso };
    }),
    updatedAt: iso,
  };
}

/** Hapus pemain (mis. guru mengeluarkan tim). */
export function removePlayer(
  room: RoomState,
  playerId: string,
  now: Date = new Date(),
): RoomState {
  return {
    ...room,
    players: room.players.filter((p) => p.id !== playerId),
    updatedAt: now.toISOString(),
  };
}

/** Ubah fase ruang (lobby → playing → ended). */
export function setPhase(
  room: RoomState,
  phase: RoomState["phase"],
  now: Date = new Date(),
): RoomState {
  return { ...room, phase, updatedAt: now.toISOString() };
}

/** Reset semua skor (ronde baru). */
export function resetScores(room: RoomState, now: Date = new Date()): RoomState {
  return {
    ...room,
    players: room.players.map((p) => ({ ...p, score: 0 })),
    updatedAt: now.toISOString(),
  };
}

/** Buang pemain yang tidak terlihat > `ttlMs` (mis. HP terputus). */
export function pruneStale(
  room: RoomState,
  ttlMs = 10 * 60 * 1000,
  now: Date = new Date(),
): RoomState {
  const cutoff = now.getTime() - ttlMs;
  return {
    ...room,
    players: room.players.filter((p) => new Date(p.lastSeen).getTime() >= cutoff),
  };
}

/** Klasemen pemain (skor menurun, lalu nama). */
export function ranking(room: RoomState): RoomPlayer[] {
  return [...room.players].sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name),
  );
}

/** Berapa pemain yang sudah punya skor > 0 (indikator progres). */
export function activeCount(room: RoomState): number {
  return room.players.filter((p) => p.score > 0).length;
}
