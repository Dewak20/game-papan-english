/**
 * Logika penilaian pengucapan untuk game **Pronounce It**.
 *
 * Memakai kembali bank kata dari `vocabulary.ts` (301 pasangan EN ↔ ID), lalu
 * membandingkan apa yang *didengar* browser (Speech Recognition) dengan kata
 * target memakai jarak edit (Levenshtein) agar toleran terhadap salah dengar
 * kecil (mis. "elefant" vs "elephant").
 */

import type { VocabPair } from "./vocabulary";

/** Bersihkan teks: huruf kecil, buang tanda baca, rapikan spasi. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Jarak edit Levenshtein (iteratif, hemat memori). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[b.length];
}

export interface PronounceVerdict {
  /** kemiripan 0–1 */
  ratio: number;
  /** lulus (dianggap benar) */
  ok: boolean;
  /** mendekati benar (dapat poin sebagian) */
  partial: boolean;
}

/** Ambang batas: ≥0.85 = benar, ≥0.6 = hampir benar. */
export const OK_THRESHOLD = 0.85;
export const PARTIAL_THRESHOLD = 0.6;

export function judgePronunciation(target: string, heard: string): PronounceVerdict {
  const t = normalizeText(target);
  const h = normalizeText(heard);
  if (!t || !h) return { ratio: 0, ok: false, partial: false };
  if (t === h) return { ratio: 1, ok: true, partial: true };

  const dist = levenshtein(t, h);
  const max = Math.max(t.length, h.length);
  const ratio = max === 0 ? 1 : 1 - dist / max;
  return { ratio, ok: ratio >= OK_THRESHOLD, partial: ratio >= PARTIAL_THRESHOLD };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const FALLBACK: VocabPair = { en: "cat", id: "Kucing", category: "Hewan" };

/** Ambil kata acak untuk diucapkan (hindari mengulang kata sebelumnya). */
export function buildPronounceWord(
  pool: VocabPair[],
  prev?: VocabPair | null,
): VocabPair {
  const source = pool.length > 0 ? pool : [];
  if (source.length === 0) return FALLBACK;

  let word = pick(source);
  let guard = 0;
  while (prev && word.en === prev.en && source.length > 1 && guard < 8) {
    word = pick(source);
    guard++;
  }
  return word;
}
