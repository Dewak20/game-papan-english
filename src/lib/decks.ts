/**
 * Pembuat struktur Deck + Item dari bank data lokal (Fase 1.3).
 *
 * Modul ini **murni** (tanpa database / tanpa React) sehingga bisa dipakai
 * oleh `prisma/seed.ts` maupun unit test. Bentuknya sengaja meniru tabel
 * `Deck` & `Item` agar pemetaan ke Postgres tinggal salin bidang.
 */

import { students } from "./students";
import { vocabPairs } from "./vocabulary";
import { readingPassages } from "./reading";
import { listeningItems } from "./listening";
import { pictureItems } from "./picture";
import { defaultSentences } from "./sentences";
import { continuousQuestions } from "./questions";
import { nouns, verbs, adjectives, animalWords, imageUrlFor } from "./words";

export interface SeedItem {
  type: string;
  prompt: string;
  answer: string;
  options?: string[];
  media?: string;
  hint?: string;
  difficulty?: string;
}

export interface SeedDeck {
  id: string;
  title: string;
  skill: string;
  level?: string;
  tags: string[];
  items: SeedItem[];
}

/** Nama tabel deck untuk tiap kategori vocab (dipakai juga oleh test). */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Perkiraan tingkat kesulitan kalimat dari jumlah kata. */
export function sentenceDifficulty(sentence: string): "easy" | "medium" | "hard" {
  const words = sentence.split(/\s+/).filter(Boolean).length;
  if (words <= 4) return "easy";
  if (words <= 8) return "medium";
  return "hard";
}

/** Daftar siswa awal (dari bank lokal) — dipakai seed. */
export function seedStudents() {
  return students;
}

/** Bangun semua deck dari bank data lokal. */
export function buildDecks(): SeedDeck[] {
  const decks: SeedDeck[] = [];

  /* ---------------- Kosakata (Vocabulary Match / Memory Match / Hangman) ---------------- */
  const vocabByCategory = new Map<string, SeedItem[]>();
  for (const pair of vocabPairs) {
    const list = vocabByCategory.get(pair.category) ?? [];
    list.push({
      type: "vocab",
      prompt: pair.en,
      answer: pair.id,
      options: [pair.id],
      hint: pair.category,
    });
    vocabByCategory.set(pair.category, list);
  }
  for (const [category, items] of vocabByCategory) {
    decks.push({
      id: `deck-vocab-${slugify(category)}`,
      title: `Kosakata · ${category}`,
      skill: "vocabulary",
      level: "easy",
      tags: [category, "vocab"],
      items,
    });
  }

  /* ---------------- Klasifikasi kata (Word Battle) ---------------- */
  const wordClasses: { label: string; words: string[] }[] = [
    { label: "Noun", words: nouns },
    { label: "Verb", words: verbs },
    { label: "Adjective", words: adjectives },
  ];
  decks.push({
    id: "deck-word-class",
    title: "Klasifikasi Kata (Noun · Verb · Adjective)",
    skill: "word-class",
    level: "easy",
    tags: ["part-of-speech", "vocabulary"],
    items: wordClasses.flatMap(({ label, words }) =>
      words.map((word) => ({
        type: "word-class",
        prompt: word,
        answer: label,
        options: ["Noun", "Verb", "Adjective"],
      })),
    ),
  });

  /* ---------------- Ejaan dari gambar (Spelling Battle) ---------------- */
  decks.push({
    id: "deck-animals",
    title: "Animals (Ejaan dari Gambar)",
    skill: "spelling",
    level: "easy",
    tags: ["animals", "spelling"],
    items: animalWords.map((word) => ({
      type: "spelling",
      prompt: word,
      answer: word,
      media: imageUrlFor(word),
    })),
  });

  /* ---------------- Grammar: Present Continuous ---------------- */
  decks.push({
    id: "deck-grammar-continuous",
    title: "Present Continuous (am / is / are + -ing)",
    skill: "grammar",
    level: "medium",
    tags: ["tenses", "grammar"],
    items: continuousQuestions.map((q) => ({
      type: "grammar",
      prompt: q.q,
      answer: q.opts[q.ans],
      options: [...q.opts],
    })),
  });

  /* ---------------- Susun kalimat (Sentence Battle) ---------------- */
  decks.push({
    id: "deck-sentences",
    title: "Susun Kalimat",
    skill: "sentence",
    tags: ["sentence-structure", "grammar"],
    items: defaultSentences
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((sentence) => ({
        type: "sentence",
        prompt: sentence,
        answer: sentence,
        difficulty: sentenceDifficulty(sentence),
      })),
  });

  /* ---------------- Reading comprehension ---------------- */
  decks.push({
    id: "deck-reading",
    title: "Reading Comprehension",
    skill: "reading",
    tags: ["reading", "comprehension"],
    items: readingPassages.flatMap((passage) =>
      passage.questions.map((question) => ({
        type: "reading",
        prompt: question.q,
        answer: question.options[question.answer],
        options: [...question.options],
        media: passage.text,
        hint: passage.title,
        difficulty: passage.level,
      })),
    ),
  });

  /* ---------------- Listening ---------------- */
  decks.push({
    id: "deck-listening",
    title: "Listening (Dengar & Pilih Arti)",
    skill: "listening",
    tags: ["listening", "vocabulary"],
    items: listeningItems.map((item) => ({
      type: "listening",
      prompt: item.speak,
      answer: item.options[item.answer],
      options: [...item.options],
      media: item.kind,
      hint: item.prompt,
      difficulty: item.level,
    })),
  });

  /* ---------------- Tebak Gambar (Vocabulary · Visual) ---------------- */
  decks.push({
    id: "deck-pictures",
    title: "Tebak Gambar (Lihat Foto, Pilih Kata)",
    skill: "picture",
    level: "easy",
    tags: ["vocabulary", "visual"],
    items: pictureItems.map((item) => ({
      type: "picture",
      prompt: item.image,
      answer: item.en,
      options: [item.en],
      media: item.image,
      hint: item.category,
    })),
  });

  return decks;
}
