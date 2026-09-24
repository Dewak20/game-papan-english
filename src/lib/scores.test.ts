import { describe, expect, it } from "vitest";
import { mergeScores, topScores, type ScoreEntry } from "./scores";

function entry(id: string, game: string, player: string, score: number): ScoreEntry {
  return { id, game, player, score, date: "2026-01-01T00:00:00.000Z" };
}

describe("mergeScores", () => {
  it("menggabungkan skor lokal dan cloud", () => {
    const local = [entry("a", "word-battle", "Ani", 100)];
    const cloud = [entry("b", "hangman", "Budi", 200)];
    const merged = mergeScores(local, cloud);
    expect(merged).toHaveLength(2);
  });

  it("mendeduplikasi entri dengan id sama (lokal menang)", () => {
    const local = [entry("x", "word-battle", "Ani", 100)];
    const cloud = [entry("x", "word-battle", "Ani", 100)];
    const merged = mergeScores(local, cloud);
    expect(merged).toHaveLength(1);
    expect(merged[0].player).toBe("Ani");
  });

  it("mengurutkan menurun berdasarkan skor", () => {
    const merged = mergeScores(
      [entry("a", "g", "A", 50)],
      [entry("b", "g", "B", 300), entry("c", "g", "C", 150)],
    );
    expect(merged.map((s) => s.score)).toEqual([300, 150, 50]);
  });
});

describe("topScores", () => {
  it("memfilter per game", () => {
    const list = [
      entry("a", "word-battle", "A", 10),
      entry("b", "hangman", "B", 20),
    ];
    expect(topScores(list, "hangman")).toHaveLength(1);
    expect(topScores(list, undefined)).toHaveLength(2);
  });

  it("membatasi jumlah hasil", () => {
    const list = Array.from({ length: 40 }, (_, i) =>
      entry(`id-${i}`, "g", `P${i}`, i),
    );
    expect(topScores(list, undefined, 5)).toHaveLength(5);
    expect(topScores(list, undefined, 5)[0].score).toBe(39);
  });
});
