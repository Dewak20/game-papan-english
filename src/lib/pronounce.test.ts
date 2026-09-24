import { describe, it, expect } from "vitest";
import {
  normalizeText,
  levenshtein,
  judgePronunciation,
  buildPronounceWord,
  OK_THRESHOLD,
  PARTIAL_THRESHOLD,
} from "./pronounce";
import { vocabPairs } from "./vocabulary";

describe("normalizeText", () => {
  it("huruf kecil & buang tanda baca", () => {
    expect(normalizeText("Elephant!")).toBe("elephant");
    expect(normalizeText("  Hello,   World. ")).toBe("hello world");
  });

  it("mempertahankan apostrof", () => {
    expect(normalizeText("don't")).toBe("don't");
  });
});

describe("levenshtein", () => {
  it("0 untuk string identik", () => {
    expect(levenshtein("cat", "cat")).toBe(0);
  });

  it("menghitung substitusi/insersi/deletion", () => {
    expect(levenshtein("cat", "cut")).toBe(1);
    expect(levenshtein("cat", "cats")).toBe(1);
    expect(levenshtein("cat", "at")).toBe(1);
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });

  it("menangani string kosong", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
    expect(levenshtein("", "")).toBe(0);
  });
});

describe("judgePronunciation", () => {
  it("tepat sempurna → ok", () => {
    const v = judgePronunciation("elephant", "elephant");
    expect(v.ratio).toBe(1);
    expect(v.ok).toBe(true);
  });

  it("toleran terhadap huruf kecil/tanda baca", () => {
    const v = judgePronunciation("Elephant!", "elephant");
    expect(v.ok).toBe(true);
  });

  it("salah dengar kecil (1 huruf) → masih ok", () => {
    // "elepant" = "elephant" tanpa 'h' → jarak 1 dari 8 → ratio 0.875
    const v = judgePronunciation("elephant", "elepant");
    expect(v.ratio).toBeGreaterThanOrEqual(OK_THRESHOLD);
    expect(v.ok).toBe(true);
  });

  it("agak mirip (2 huruf) → partial, bukan ok", () => {
    // "elefant" = "elephant" dengan 'p'→'f' dan tanpa 'h' → jarak 2 dari 8 → ratio 0.75
    const v = judgePronunciation("elephant", "elefant");
    expect(v.ratio).toBeLessThan(OK_THRESHOLD);
    expect(v.ratio).toBeGreaterThanOrEqual(PARTIAL_THRESHOLD);
    expect(v.partial).toBe(true);
    expect(v.ok).toBe(false);
  });

  it("sangat berbeda → tidak lulus", () => {
    const v = judgePronunciation("elephant", "banana");
    expect(v.ok).toBe(false);
    expect(v.partial).toBe(false);
  });

  it("teks kosong → 0", () => {
    expect(judgePronunciation("cat", "")).toEqual({ ratio: 0, ok: false, partial: false });
    expect(judgePronunciation("", "cat")).toEqual({ ratio: 0, ok: false, partial: false });
  });
});

describe("buildPronounceWord", () => {
  it("mengembalikan kata dari pool", () => {
    const word = buildPronounceWord(vocabPairs);
    expect(vocabPairs.some((p) => p.en === word.en)).toBe(true);
  });

  it("menghindari mengulang kata sebelumnya", () => {
    const prev = buildPronounceWord(vocabPairs);
    for (let i = 0; i < 20; i++) {
      const next = buildPronounceWord(vocabPairs, prev);
      expect(next.en).not.toBe(prev.en);
    }
  });

  it("punya fallback saat pool kosong", () => {
    const word = buildPronounceWord([]);
    expect(word.en.length).toBeGreaterThan(0);
    expect(word.id.length).toBeGreaterThan(0);
  });
});
