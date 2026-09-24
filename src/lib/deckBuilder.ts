/**
 * Pembuat "deck" (kumpulan soal) untuk guru — murni & tanpa DOM.
 *
 * Deck dibangun dari bank konten yang ada di store (kosakata, kata, kalimat,
 * soal grammar). Hasilnya bisa diekspor ke JSON (untuk dibagikan/diimpor ulang)
 * atau CSV (dibuka di Excel). Bentuk objeknya meniru tabel `Deck`/`Item` di
 * Prisma agar mudah disinkronkan ke database bila cloud aktif.
 */

import type { PlatformData } from "./store";
import { imageUrlFor } from "./words";

export interface DeckItem {
  type: string;
  prompt: string;
  answer: string;
  options: string[];
  media?: string;
  hint?: string;
  difficulty?: string;
}

export interface BuiltDeck {
  title: string;
  skill: string;
  level?: string;
  tags: string[];
  items: DeckItem[];
  createdAt: string;
}

export type DeckSkill =
  | "vocabulary"
  | "spelling"
  | "picture"
  | "sentence"
  | "grammar"
  | "word-class";

export interface DeckOptions {
  title: string;
  skill: DeckSkill;
  /** Batasi jumlah item (0 / undefined = semua). */
  limit?: number;
  /** Filter kategori kosakata (opsional). */
  category?: string;
  /** Sertakan URL gambar (Pollinations) untuk skill spelling/picture. */
  withImages?: boolean;
}

/** Skill → daftar kata (untuk word-class / spelling). */
function wordsForSkill(data: PlatformData, skill: DeckSkill): DeckItem[] {
  if (skill === "spelling") {
    return data.animals.map((w) => ({
      type: "spelling",
      prompt: w,
      answer: w,
      options: [],
      media: imageUrlFor(w),
    }));
  }
  // word-class
  const classes: { label: string; words: string[] }[] = [
    { label: "Noun", words: data.nouns },
    { label: "Verb", words: data.verbs },
    { label: "Adjective", words: data.adjectives },
  ];
  return classes.flatMap(({ label, words }) =>
    words.map((w) => ({
      type: "word-class",
      prompt: w,
      answer: label,
      options: ["Noun", "Verb", "Adjective"],
    })),
  );
}

/**
 * Bangun satu deck dari data platform sesuai opsi.
 * Selalu mengembalikan deck yang valid (items bisa kosong bila bank kosong).
 */
export function buildDeck(data: PlatformData, opts: DeckOptions): BuiltDeck {
  let items: DeckItem[] = [];
  const tags: string[] = [];

  switch (opts.skill) {
    case "vocabulary": {
      const pool = opts.category
        ? data.vocab.filter((v) => v.category === opts.category)
        : data.vocab;
      items = pool.map((v) => ({
        type: "vocab",
        prompt: v.en,
        answer: v.id,
        options: [v.id],
        hint: v.category,
      }));
      if (opts.category) tags.push(opts.category);
      break;
    }
    case "picture": {
      const pool = opts.category
        ? data.vocab.filter((v) => v.category === opts.category)
        : data.vocab;
      items = pool.map((v) => ({
        type: "picture",
        prompt: v.en,
        answer: v.en,
        options: [v.en],
        media: imageUrlFor(v.en),
        hint: v.category,
      }));
      if (opts.category) tags.push(opts.category);
      break;
    }
    case "sentence": {
      items = data.sentences
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => ({
          type: "sentence",
          prompt: s,
          answer: s,
          options: [],
          difficulty: sentenceDifficulty(s),
        }));
      break;
    }
    case "grammar": {
      items = data.questions.map((q) => ({
        type: "grammar",
        prompt: q.q,
        answer: q.opts[q.ans],
        options: [...q.opts],
      }));
      break;
    }
    case "spelling":
    case "word-class": {
      items = wordsForSkill(data, opts.skill);
      break;
    }
  }

  if (opts.limit && opts.limit > 0) items = items.slice(0, opts.limit);
  tags.unshift(opts.skill);

  return {
    title: opts.title.trim() || `Deck ${opts.skill}`,
    skill: opts.skill,
    tags,
    items,
    createdAt: new Date().toISOString(),
  };
}

/** Tingkat kesulitan kalimat dari jumlah kata (sama seperti `decks.ts`). */
export function sentenceDifficulty(sentence: string): "easy" | "medium" | "hard" {
  const words = sentence.split(/\s+/).filter(Boolean).length;
  if (words <= 4) return "easy";
  if (words <= 8) return "medium";
  return "hard";
}

/** Serialisasi deck ke JSON rapi (untuk diunduh/diimpor). */
export function deckToJson(deck: BuiltDeck): string {
  return JSON.stringify(deck, null, 2);
}

/** Validasi & parse deck dari JSON. Mengembalikan `null` bila tidak valid. */
export function parseDeck(json: string): BuiltDeck | null {
  try {
    const obj = JSON.parse(json) as Partial<BuiltDeck>;
    if (!obj || typeof obj.title !== "string" || typeof obj.skill !== "string") {
      return null;
    }
    const items = Array.isArray(obj.items) ? obj.items : [];
    const cleanItems: DeckItem[] = items
      .filter(
        (it): it is DeckItem =>
          !!it &&
          typeof it.prompt === "string" &&
          typeof it.answer === "string",
      )
      .map((it) => ({
        type: typeof it.type === "string" ? it.type : "vocab",
        prompt: it.prompt,
        answer: it.answer,
        options: Array.isArray(it.options)
          ? it.options.filter((o): o is string => typeof o === "string")
          : [],
        media: typeof it.media === "string" ? it.media : undefined,
        hint: typeof it.hint === "string" ? it.hint : undefined,
        difficulty: typeof it.difficulty === "string" ? it.difficulty : undefined,
      }));

    return {
      title: obj.title,
      skill: obj.skill,
      level: typeof obj.level === "string" ? obj.level : undefined,
      tags: Array.isArray(obj.tags)
        ? obj.tags.filter((t): t is string => typeof t === "string")
        : [],
      items: cleanItems,
      createdAt: typeof obj.createdAt === "string" ? obj.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Ekspor deck ke CSV (kolom: type, prompt, answer, options, media, hint). */
export function deckToCsv(deck: BuiltDeck): string {
  const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = ["type", "prompt", "answer", "options", "media", "hint", "difficulty"];
  const lines = [header.join(",")];
  for (const it of deck.items) {
    lines.push(
      [
        it.type,
        it.prompt,
        it.answer,
        it.options.join(" | "),
        it.media ?? "",
        it.hint ?? "",
        it.difficulty ?? "",
      ]
        .map((c) => esc(String(c)))
        .join(","),
    );
  }
  return lines.join("\r\n");
}
