import "server-only";

import {
  createRoom,
  joinRoom,
  makeRoomCode,
  normalizeCode,
  pruneStale,
  removePlayer,
  resetScores,
  setPhase,
  setScore,
  type RoomState,
} from "@/lib/room";

/**
 * Penyimpanan ruang "multiplayer lintas perangkat" **di memori server**.
 *
 * Cocok untuk pemakaian kelas di LAN: satu proses `next start` di laptop guru
 * melayani papan besar + HP siswa. Tanpa database, jadi tetap jalan walau
 * `DATABASE_URL` belum diisi.
 *
 * Catatan: data hilang saat server dimulai ulang, dan tidak dibagikan antar
 * instance (serverless multi-instance). Untuk kelas (1 server) ini memadai.
 */

interface Stored {
  room: RoomState;
  /** Token rahasia pemilik ruang (hanya dipakai untuk operasi host). */
  hostToken: string;
}

const TTL_MS = 6 * 60 * 60 * 1000; // 6 jam
const PLAYER_TTL_MS = 15 * 60 * 1000; // 15 menit tanpa kabar → dibuang

const globalForRooms = globalThis as unknown as {
  blpRooms?: Map<string, Stored>;
};

const rooms: Map<string, Stored> = globalForRooms.blpRooms ?? new Map();
globalForRooms.blpRooms = rooms;

function sweep(now = new Date()) {
  const cutoff = now.getTime() - TTL_MS;
  for (const [code, stored] of rooms) {
    if (new Date(stored.room.updatedAt).getTime() < cutoff) {
      rooms.delete(code);
    } else {
      const pruned = pruneStale(stored.room, PLAYER_TTL_MS, now);
      if (pruned.players.length !== stored.room.players.length) {
        stored.room = pruned;
      }
    }
  }
}

export interface RoomView {
  code: string;
  title: string;
  gameSlug: string;
  phase: RoomState["phase"];
  players: { id: string; name: string; score: number }[];
  updatedAt: string;
}

/** Tampilan publik ruang (tanpa token host). */
export function toView(room: RoomState): RoomView {
  return {
    code: room.code,
    title: room.title,
    gameSlug: room.gameSlug,
    phase: room.phase,
    players: room.players.map((p) => ({ id: p.id, name: p.name, score: p.score })),
    updatedAt: room.updatedAt,
  };
}

export function createRoomWithHost(opts: {
  title?: string;
  gameSlug?: string;
}): { view: RoomView; hostToken: string } {
  sweep();
  let code = makeRoomCode();
  let guard = 0;
  while (rooms.has(code) && guard < 50) {
    code = makeRoomCode();
    guard++;
  }
  const room = createRoom({ code, title: opts.title, gameSlug: opts.gameSlug });
  const hostToken = makeRoomCode() + makeRoomCode();
  rooms.set(room.code, { room, hostToken });
  return { view: toView(room), hostToken };
}

export function getRoom(code: string): RoomState | null {
  sweep();
  return rooms.get(normalizeCode(code))?.room ?? null;
}

export function getView(code: string): RoomView | null {
  const room = getRoom(code);
  return room ? toView(room) : null;
}

export function isHost(code: string, token: string): boolean {
  const stored = rooms.get(normalizeCode(code));
  return !!stored && stored.hostToken === token;
}

/** Mutasi umum: baca → ubah → simpan. `fn` boleh mengembalikan null untuk batal. */
export function mutateRoom(
  code: string,
  fn: (room: RoomState) => RoomState | null,
): RoomState | null {
  sweep();
  const key = normalizeCode(code);
  const stored = rooms.get(key);
  if (!stored) return null;
  const next = fn(stored.room);
  if (!next) return stored.room;
  stored.room = next;
  return next;
}

export const roomOps = {
  join: (room: RoomState, player: { id: string; name: string }) => joinRoom(room, player),
  score: (room: RoomState, playerId: string, value: number, mode: "set" | "add") =>
    setScore(room, playerId, value, mode),
  remove: (room: RoomState, playerId: string) => removePlayer(room, playerId),
  phase: (room: RoomState, phase: RoomState["phase"]) => setPhase(room, phase),
  reset: (room: RoomState) => resetScores(room),
};
