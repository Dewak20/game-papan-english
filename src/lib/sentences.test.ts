import { describe, it, expect } from "vitest";
import { sentencesByDifficulty, defaultSentences } from "./sentences";

describe("sentencesByDifficulty", () => {
  it("easy hanya berisi kalimat ≤4 kata", () => {
    const easy = sentencesByDifficulty(defaultSentences, "easy");
    expect(easy.length).toBeGreaterThan(0);
    for (const s of easy) {
      expect(s.split(" ").length).toBeLessThanOrEqual(4);
    }
  });

  it("medium hanya berisi kalimat 5–7 kata", () => {
    const med = sentencesByDifficulty(defaultSentences, "medium");
    expect(med.length).toBeGreaterThan(0);
    for (const s of med) {
      const n = s.split(" ").length;
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(7);
    }
  });

  it("hard hanya berisi kalimat ≥8 kata", () => {
    const hard = sentencesByDifficulty(defaultSentences, "hard");
    expect(hard.length).toBeGreaterThan(0);
    for (const s of hard) {
      expect(s.split(" ").length).toBeGreaterThanOrEqual(8);
    }
  });

  it("membuang entri kosong", () => {
    const list = sentencesByDifficulty("A|B|| |C", "easy");
    expect(list.every((s) => s.length > 0)).toBe(true);
  });

  it("fallback ke semua kalimat bila hasil filter kosong", () => {
    // Tidak ada kalimat 8+ kata di input ini → harus mengembalikan semua.
    const list = sentencesByDifficulty("I am|You are", "hard");
    expect(list.length).toBe(2);
  });
});
