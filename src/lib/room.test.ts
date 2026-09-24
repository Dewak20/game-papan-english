import { describe, expect, it } from "vitest";
import {
  activeCount,
  cleanName,
  createRoom,
  joinRoom,
  makeRoomCode,
  normalizeCode,
  pruneStale,
  ranking,
  removePlayer,
  resetScores,
  setPhase,
  setScore,
  type RoomState,
} from "./room";

const T0 = new Date("2026-01-01T00:00:00.000Z");
const T1 = new Date("2026-01-01T00:05:00.000Z");
const T2 = new Date("2026-01-01T01:00:00.000Z");

describe("makeRoomCode", () => {
  it("membuat kode 4 huruf dari alfabet aman", () => {
    const code = makeRoomCode(() => 0.5);
    expect(code).toHaveLength(4);
    expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/);
  });

  it("tidak memakai karakter membingungkan (0/O/1/I/L)", () => {
    let s = "";
    for (let i = 0; i < 500; i++) s += makeRoomCode();
    expect(s).not.toMatch(/[01OIL]/);
  });
});

describe("normalizeCode / cleanName", () => {
  it("menormalkan kode dari input pengguna", () => {
    expect(normalizeCode(" k7p2 ")).toBe("K7P2");
    expect(normalizeCode("k-7 p2!!")).toBe("K7P2");
    expect(normalizeCode("abcdefg")).toBe("ABCD");
  });

  it("membersihkan nama", () => {
    expect(cleanName("  Tim   Biru ")).toBe("Tim Biru");
    expect(cleanName("")).toBe("");
  });
});

describe("createRoom", () => {
  it("membuat ruang lobby kosong", () => {
    const room = createRoom({ code: "k7p2", title: "Kelas 5A" }, T0);
    expect(room.code).toBe("K7P2");
    expect(room.title).toBe("Kelas 5A");
    expect(room.phase).toBe("lobby");
    expect(room.players).toEqual([]);
    expect(room.createdAt).toBe(T0.toISOString());
  });
});

describe("joinRoom", () => {
  it("menambah pemain baru", () => {
    const room = joinRoom(createRoom({ code: "AAAA" }, T0), { id: "p1", name: "Budi" }, T0);
    expect(room.players).toHaveLength(1);
    expect(room.players[0].name).toBe("Budi");
    expect(room.players[0].score).toBe(0);
  });

  it("menggabungkan nama yang sama (tidak duplikat)", () => {
    let room = createRoom({ code: "AAAA" }, T0);
    room = joinRoom(room, { id: "p1", name: "Budi" }, T0);
    room = joinRoom(room, { id: "p2", name: " budi " }, T1);
    expect(room.players).toHaveLength(1);
    expect(room.players[0].id).toBe("p1");
    expect(room.players[0].lastSeen).toBe(T1.toISOString());
  });

  it("memberi nama default bila kosong", () => {
    const room = joinRoom(createRoom({ code: "AAAA" }, T0), { id: "p1", name: "  " }, T0);
    expect(room.players[0].name).toBe("Pemain");
  });
});

describe("setScore", () => {
  const base = joinRoom(createRoom({ code: "AAAA" }, T0), { id: "p1", name: "Budi" }, T0);

  it("menimpa skor (mode set)", () => {
    const room = setScore(base, "p1", 42, "set", T1);
    expect(room.players[0].score).toBe(42);
  });

  it("menambah skor (mode add)", () => {
    let room = setScore(base, "p1", 10, "add", T1);
    room = setScore(room, "p1", 5, "add", T1);
    expect(room.players[0].score).toBe(15);
  });

  it("tidak turun di bawah 0 & dibatasi 99999", () => {
    expect(setScore(base, "p1", -50, "set", T1).players[0].score).toBe(0);
    expect(setScore(base, "p1", 1e9, "set", T1).players[0].score).toBe(99999);
    expect(setScore(base, "p1", -50, "add", T1).players[0].score).toBe(0);
  });

  it("mengabaikan id tak dikenal", () => {
    const room = setScore(base, "x", 9, "set", T1);
    expect(room.players[0].score).toBe(0);
  });
});

describe("removePlayer / setPhase / resetScores", () => {
  it("menghapus pemain", () => {
    let room = joinRoom(createRoom({ code: "AAAA" }, T0), { id: "p1", name: "A" }, T0);
    room = joinRoom(room, { id: "p2", name: "B" }, T0);
    room = removePlayer(room, "p1", T1);
    expect(room.players.map((p) => p.id)).toEqual(["p2"]);
  });

  it("mengubah fase", () => {
    const room = setPhase(createRoom({ code: "AAAA" }, T0), "playing", T1);
    expect(room.phase).toBe("playing");
  });

  it("mereset semua skor", () => {
    let room = joinRoom(createRoom({ code: "AAAA" }, T0), { id: "p1", name: "A" }, T0);
    room = setScore(room, "p1", 30, "set", T1);
    room = resetScores(room, T2);
    expect(room.players[0].score).toBe(0);
  });
});

describe("pruneStale", () => {
  it("membuang pemain yang sudah lama tidak terlihat", () => {
    let room = joinRoom(createRoom({ code: "AAAA" }, T0), { id: "p1", name: "A" }, T0);
    room = joinRoom(room, { id: "p2", name: "B" }, T0);
    // p1 terlihat di T0; p2 menyentuh skor tepat di T2 → hanya p1 yang basi.
    room = setScore(room, "p2", 5, "set", T2);
    const pruned = pruneStale(room, 10 * 60 * 1000, T2);
    expect(pruned.players.map((p) => p.id)).toEqual(["p2"]);
  });

  it("mempertahankan pemain yang masih aktif", () => {
    const room = joinRoom(createRoom({ code: "AAAA" }, T0), { id: "p1", name: "A" }, T0);
    const pruned = pruneStale(room, 10 * 60 * 1000, T1);
    expect(pruned.players).toHaveLength(1);
  });
});

describe("ranking / activeCount", () => {
  function withScores(): RoomState {
    let room = createRoom({ code: "AAAA" }, T0);
    room = joinRoom(room, { id: "p1", name: "Budi" }, T0);
    room = joinRoom(room, { id: "p2", name: "Ani" }, T0);
    room = joinRoom(room, { id: "p3", name: "Cici" }, T0);
    room = setScore(room, "p1", 50, "set", T1);
    room = setScore(room, "p2", 90, "set", T1);
    return room;
  }

  it("mengurutkan skor menurun", () => {
    const rows = ranking(withScores());
    expect(rows.map((p) => p.name)).toEqual(["Ani", "Budi", "Cici"]);
  });

  it("menghitung pemain berskor > 0", () => {
    expect(activeCount(withScores())).toBe(2);
  });
});
