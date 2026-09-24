"use client";

/**
 * Tema musik latar per game. Semua dibangkitkan secara prosedural lewat
 * Web Audio API (tanpa file audio), jadi tidak menambah ukuran unduhan.
 */
export interface MusicTheme {
  /** frekuensi dasar / root (Hz) */
  root: number;
  /** interval semitone dari root yang dipakai pola */
  scale: number[];
  /** pola melodi — indeks ke `scale`, atau null untuk istirahat */
  pattern: (number | null)[];
  /** jarak antar langkah (ms) — makin kecil makin cepat */
  stepMs: number;
  /** bentuk gelombang */
  wave: OscillatorType;
  /** volume tiap nada (0–1) */
  vol: number;
  /** mainkan nada bas setiap N langkah (opsional) */
  bassEvery?: number;
}

const THEMES: Record<string, MusicTheme> = {
  /** Word Battle — arcade neon, energik, pentatonik minor. */
  "word-battle": {
    root: 220,
    scale: [0, 3, 5, 7, 10],
    pattern: [0, null, 2, null, 4, null, 2, null, 0, null, 2, null, 4, 2, 4, 2],
    stepMs: 145,
    wave: "square",
    vol: 0.035,
    bassEvery: 8,
  },
  /** Spelling Battle — safari hangat, seperti marimba. */
  "spelling-battle": {
    root: 261.63,
    scale: [0, 2, 4, 7, 9],
    pattern: [0, 2, 4, 7, 4, 2, 0, 2, 4, 7, 9, 7, 4, 2, 0, null],
    stepMs: 285,
    wave: "triangle",
    vol: 0.06,
    bassEvery: 8,
  },
  /** Sentence Battle — tarik tambang, cerah & bersemangat. */
  "sentence-battle": {
    root: 293.66,
    scale: [0, 2, 4, 5, 7, 9, 11],
    pattern: [0, 4, 7, 4, 2, 5, 9, 5, 0, 4, 7, 11, 9, 7, 4, 2],
    stepMs: 205,
    wave: "square",
    vol: 0.03,
    bassEvery: 8,
  },
  /** Continuous Battle — lab waktu, misterius (whole-tone). */
  "continuous-battle": {
    root: 196,
    scale: [0, 2, 4, 6, 8, 10],
    pattern: [0, null, 3, null, 2, null, 4, null, 0, null, 3, null, 5, 4, 2, null],
    stepMs: 400,
    wave: "sine",
    vol: 0.07,
  },
  /** Vocabulary Match — kelas tenang, akor sederhana. */
  "vocabulary-match": {
    root: 261.63,
    scale: [0, 4, 7, 12],
    pattern: [0, 2, 1, 3, 2, 1, 0, null],
    stepMs: 460,
    wave: "sine",
    vol: 0.06,
    bassEvery: 4,
  },
  /** Hangman — suram & mencekam, minor alami lambat. */
  hangman: {
    root: 174.61,
    scale: [0, 2, 3, 5, 7, 8, 10],
    pattern: [0, null, null, 2, null, 3, null, null, 5, null, null, 4, null, 3, null, null],
    stepMs: 480,
    wave: "sine",
    vol: 0.07,
  },
  /** Anagram — meja kayu, petikan ringan. */
  anagram: {
    root: 246.94,
    scale: [0, 2, 4, 7, 9],
    pattern: [0, 1, 2, 3, 4, 3, 2, 1],
    stepMs: 190,
    wave: "triangle",
    vol: 0.06,
    bassEvery: 8,
  },
  /** Memory Match — kasino, blues santai. */
  "memory-match": {
    root: 233.08,
    scale: [0, 3, 5, 6, 7, 10],
    pattern: [0, 2, 1, 3, 0, 4, 3, 2, 0, 2, 1, 3, 5, 4, 3, 2],
    stepMs: 300,
    wave: "triangle",
    vol: 0.055,
    bassEvery: 8,
  },
  /** Reading Race — perpustakaan, tenang & mengalir. */
  "reading-race": {
    root: 220,
    scale: [0, 2, 4, 7, 9, 11],
    pattern: [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 4, 5, 4, 2, 1, null],
    stepMs: 330,
    wave: "sine",
    vol: 0.055,
    bassEvery: 8,
  },
  /** Listening Battle — studio audio, nuansa funk elektronik. */
  "listening-battle": {
    root: 261.63,
    scale: [0, 2, 3, 5, 7, 8, 10],
    pattern: [0, 2, 4, 2, 3, 5, 3, 2, 0, 2, 4, 6, 5, 4, 2, 1],
    stepMs: 250,
    wave: "triangle",
    vol: 0.05,
    bassEvery: 4,
  },
  /** Pronounce It — panggung karaoke, ceria & menghentak. */
  "pronounce-it": {
    root: 293.66,
    scale: [0, 2, 4, 5, 7, 9, 11],
    pattern: [0, 2, 4, 5, 4, 2, 0, 4, 5, 7, 5, 4, 2, 4, 2, 0],
    stepMs: 230,
    wave: "triangle",
    vol: 0.05,
    bassEvery: 4,
  },
  /** Tebak Gambar — galeri, ringan & menyenangkan (pentatonik mayor). */
  "tebak-gambar": {
    root: 246.94,
    scale: [0, 2, 4, 7, 9],
    pattern: [0, 2, 4, 2, 3, 4, 2, 0, 0, 2, 4, 7, 4, 2, 4, null],
    stepMs: 270,
    wave: "triangle",
    vol: 0.055,
    bassEvery: 8,
  },
};

/** Ambil tema musik untuk sebuah game (referensi stabil — aman untuk deps). */
export function musicTheme(slug: string): MusicTheme | null {
  return THEMES[slug] ?? null;
}
