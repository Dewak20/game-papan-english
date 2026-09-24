import { describe, it, expect } from "vitest";
import { readingPassages, readingByLevel, buildReadingRound } from "./reading";

describe("bank bacaan", () => {
  it("punya cukup bacaan untuk tiap level", () => {
    expect(readingPassages.length).toBeGreaterThanOrEqual(9);
    expect(readingByLevel("easy").length).toBeGreaterThan(0);
    expect(readingByLevel("medium").length).toBeGreaterThan(0);
    expect(readingByLevel("hard").length).toBeGreaterThan(0);
  });

  it("setiap bacaan punya id unik, teks, dan pertanyaan", () => {
    const ids = new Set<string>();
    for (const p of readingPassages) {
      expect(ids.has(p.id), `id duplikat: ${p.id}`).toBe(false);
      ids.add(p.id);
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.text.length).toBeGreaterThan(20);
      expect(p.questions.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("setiap pertanyaan punya 3 opsi unik dan indeks jawaban valid", () => {
    for (const p of readingPassages) {
      for (const q of p.questions) {
        expect(q.options).toHaveLength(3);
        expect(new Set(q.options).size).toBe(3);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThanOrEqual(2);
        expect(q.q.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("buildReadingRound", () => {
  it("mengembalikan bacaan + pertanyaan dari pool", () => {
    const pool = readingByLevel("easy");
    const round = buildReadingRound(pool);
    expect(pool.some((p) => p.id === round.passage.id)).toBe(true);
    expect(round.passage.questions).toContain(round.question);
  });

  it("menghindari bacaan yang sama dua kali berturut-turut", () => {
    const pool = readingByLevel("medium");
    const prev = buildReadingRound(pool);
    for (let i = 0; i < 20; i++) {
      const next = buildReadingRound(pool, prev);
      expect(next.passage.id).not.toBe(prev.passage.id);
    }
  });

  it("aman saat pool kosong (fallback ke seluruh bank)", () => {
    const round = buildReadingRound([]);
    expect(round.passage).toBeTruthy();
    expect(round.question).toBeTruthy();
  });
});
