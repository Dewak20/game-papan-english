import { describe, expect, it } from "vitest";
import {
  champion,
  clearMatchScore,
  isComplete,
  makeMatches,
  makeTournament,
  nextMatch,
  progress,
  setMatchScore,
  standings,
  type TournamentConfig,
  type TournamentTeam,
} from "./tournament";

const teams: TournamentTeam[] = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Bravo" },
  { id: "c", name: "Charlie" },
];

function config(overrides: Partial<TournamentConfig> = {}): TournamentConfig {
  return {
    title: "Turnamen Kelas",
    teams,
    games: ["tebak-gambar", "spelling-battle"],
    rounds: 1,
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    ...overrides,
  };
}

describe("makeMatches", () => {
  it("membuat satu laga per pasangan (round-robin)", () => {
    const matches = makeMatches(teams, ["g"], 1);
    // 3 tim → 3 pasangan: a-b, a-c, b-c
    expect(matches).toHaveLength(3);
    expect(matches.map((m) => `${m.homeId}${m.awayId}`)).toEqual(["ab", "ac", "bc"]);
  });

  it("mengulang tiap pasangan sesuai jumlah ronde", () => {
    const matches = makeMatches(teams, ["g"], 2);
    expect(matches).toHaveLength(6);
    expect(matches.filter((m) => m.round === 2)).toHaveLength(3);
  });

  it("merotasi game antar laga", () => {
    const matches = makeMatches(teams, ["g1", "g2"], 1);
    expect(matches.map((m) => m.gameSlug)).toEqual(["g1", "g2", "g1"]);
  });

  it("memakai game fallback bila daftar kosong", () => {
    const matches = makeMatches(teams, [], 1);
    expect(matches[0].gameSlug).toBe("tebak-gambar");
  });

  it("membatasi jumlah ronde minimal 1", () => {
    expect(makeMatches(teams, ["g"], 0)).toHaveLength(3);
    expect(makeMatches(teams, ["g"], -5)).toHaveLength(3);
  });

  it("menandai semua laga belum dimainkan", () => {
    const matches = makeMatches(teams, ["g"], 1);
    expect(matches.every((m) => m.homeScore === null && m.awayScore === null)).toBe(true);
  });
});

describe("setMatchScore / clearMatchScore", () => {
  it("mengisi skor satu laga secara imutabel", () => {
    const state = makeTournament(config());
    const id = state.matches[0].id;
    const next = setMatchScore(state, id, 10, 4);
    expect(next.matches[0].homeScore).toBe(10);
    expect(next.matches[0].awayScore).toBe(4);
    // state lama tidak berubah
    expect(state.matches[0].homeScore).toBeNull();
  });

  it("membulatkan dan mengurung skor pada rentang 0..999", () => {
    const state = makeTournament(config());
    const id = state.matches[0].id;
    const next = setMatchScore(state, id, 5.9, -3);
    expect(next.matches[0].homeScore).toBe(5);
    expect(next.matches[0].awayScore).toBe(0);
    const big = setMatchScore(state, id, 5000, 0);
    expect(big.matches[0].homeScore).toBe(999);
  });

  it("mengabaikan id yang tidak ada", () => {
    const state = makeTournament(config());
    const next = setMatchScore(state, "tidak-ada", 1, 1);
    expect(next.matches).toEqual(state.matches);
  });

  it("mengosongkan skor kembali", () => {
    const state = makeTournament(config());
    const id = state.matches[0].id;
    const filled = setMatchScore(state, id, 7, 2);
    const cleared = clearMatchScore(filled, id);
    expect(cleared.matches[0].homeScore).toBeNull();
  });
});

describe("standings", () => {
  it("menghitung poin menang/kalah", () => {
    let state = makeTournament(config());
    state = setMatchScore(state, state.matches[0].id, 10, 5); // a menang
    state = setMatchScore(state, state.matches[1].id, 3, 8); // c menang
    const rows = standings(state);
    const a = rows.find((r) => r.teamId === "a")!;
    const c = rows.find((r) => r.teamId === "c")!;
    expect(a.points).toBe(3);
    expect(a.wins).toBe(1);
    expect(c.points).toBe(3);
  });

  it("memberi poin imbang untuk kedua tim", () => {
    let state = makeTournament(config());
    state = setMatchScore(state, state.matches[0].id, 6, 6);
    const rows = standings(state);
    expect(rows.find((r) => r.teamId === "a")!.points).toBe(1);
    expect(rows.find((r) => r.teamId === "b")!.points).toBe(1);
  });

  it("mengurutkan berdasarkan poin lalu selisih skor", () => {
    let state = makeTournament(config());
    // a mengalahkan b besar, c mengalahkan b kecil
    state = setMatchScore(state, state.matches[0].id, 20, 1); // a vs b
    state = setMatchScore(state, state.matches[2].id, 5, 4); // b vs c
    const rows = standings(state);
    expect(rows[0].teamId).toBe("a");
  });

  it("mengurutkan tim dengan poin sama berdasarkan selisih", () => {
    let state = makeTournament(config());
    // a vs b imbang, a vs c menang besar, b vs c menang kecil
    state = setMatchScore(state, state.matches[0].id, 5, 5); // a vs b
    state = setMatchScore(state, state.matches[1].id, 30, 0); // a vs c
    state = setMatchScore(state, state.matches[2].id, 6, 5); // b vs c
    const rows = standings(state);
    // a: 1 imbang + 1 menang = 4 poin; b: 1 imbang + 1 menang = 4 poin; selisih a lebih besar
    expect(rows[0].teamId).toBe("a");
    expect(rows[0].diff).toBeGreaterThan(rows[1].diff);
  });

  it("mengabaikan laga yang belum dimainkan", () => {
    const state = makeTournament(config());
    const rows = standings(state);
    expect(rows.every((r) => r.played === 0 && r.points === 0)).toBe(true);
  });

  it("selisih skor dihitung dari for-against", () => {
    let state = makeTournament(config());
    state = setMatchScore(state, state.matches[0].id, 10, 2);
    const a = standings(state).find((r) => r.teamId === "a")!;
    expect(a.scoreFor).toBe(10);
    expect(a.scoreAgainst).toBe(2);
    expect(a.diff).toBe(8);
  });
});

describe("nextMatch / progress / isComplete", () => {
  it("mengembalikan laga pertama yang belum dimainkan", () => {
    const state = makeTournament(config());
    expect(nextMatch(state)!.id).toBe(state.matches[0].id);
  });

  it("berpindah ke laga berikutnya setelah diisi", () => {
    let state = makeTournament(config());
    state = setMatchScore(state, state.matches[0].id, 1, 0);
    expect(nextMatch(state)!.id).toBe(state.matches[1].id);
  });

  it("menghitung progres", () => {
    let state = makeTournament(config());
    expect(progress(state)).toEqual({ done: 0, total: 3 });
    state = setMatchScore(state, state.matches[0].id, 1, 0);
    expect(progress(state)).toEqual({ done: 1, total: 3 });
  });

  it("menyatakan selesai hanya bila semua laga terisi", () => {
    let state = makeTournament(config());
    expect(isComplete(state)).toBe(false);
    for (const m of state.matches) {
      state = setMatchScore(state, m.id, 1, 0);
    }
    expect(isComplete(state)).toBe(true);
    expect(nextMatch(state)).toBeNull();
  });
});

describe("champion", () => {
  it("null sebelum ada laga selesai", () => {
    expect(champion(makeTournament(config()))).toBeNull();
  });

  it("memilih pemuncak klasemen", () => {
    let state = makeTournament(config());
    state = setMatchScore(state, state.matches[0].id, 10, 0); // a menang
    state = setMatchScore(state, state.matches[1].id, 10, 0); // a menang
    expect(champion(state)!.teamId).toBe("a");
  });
});
