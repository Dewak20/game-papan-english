import { describe, it, expect } from "vitest";
import { vocabPairs, vocabCategories, buildVocabQuestion } from "./vocabulary";

describe("bank kosakata", () => {
  it("punya banyak kata", () => {
    expect(vocabPairs.length).toBeGreaterThan(250);
  });

  it("setiap kata Inggris unik (tidak ada soal ambigu)", () => {
    const seen = new Set<string>();
    for (const p of vocabPairs) {
      const key = p.en.toLowerCase();
      expect(seen.has(key), `duplikat kata: ${p.en}`).toBe(false);
      seen.add(key);
    }
  });

  it("setiap pasangan punya kategori", () => {
    for (const p of vocabPairs) {
      expect(p.category.length).toBeGreaterThan(0);
      expect(p.id.length).toBeGreaterThan(0);
    }
  });

  it("daftar kategori dimulai dengan 'Semua'", () => {
    expect(vocabCategories[0]).toBe("Semua");
    expect(vocabCategories.length).toBeGreaterThan(5);
  });
});

describe("buildVocabQuestion", () => {
  it("selalu menyertakan jawaban benar di antara opsi", () => {
    for (let i = 0; i < 200; i++) {
      const q = buildVocabQuestion(vocabPairs);
      expect(q.options).toContain(q.answer);
      expect(q.options).toHaveLength(2);
      expect(q.options[0]).not.toBe(q.options[1]);
    }
  });

  it("prompt adalah kata Inggris yang ada di bank", () => {
    const q = buildVocabQuestion(vocabPairs);
    expect(vocabPairs.some((p) => p.en === q.prompt)).toBe(true);
  });

  it("menghindari mengulang prompt sebelumnya", () => {
    const prev = buildVocabQuestion(vocabPairs);
    for (let i = 0; i < 30; i++) {
      const next = buildVocabQuestion(vocabPairs, prev);
      expect(next.prompt).not.toBe(prev.prompt);
    }
  });

  it("tetap bekerja pada pool kecil (kategori minim)", () => {
    const tiny = vocabPairs.slice(0, 1);
    const q = buildVocabQuestion(tiny);
    expect(q.options).toContain(q.answer);
  });
});
