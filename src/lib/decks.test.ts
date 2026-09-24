import { describe, expect, it } from "vitest";
import { buildDecks, sentenceDifficulty, slugify, seedStudents } from "./decks";

describe("slugify", () => {
  it("menghasilkan slug huruf kecil dengan tanda hubung", () => {
    expect(slugify("Kata Benda")).toBe("kata-benda");
    expect(slugify("Noun · Verb")).toBe("noun-verb");
  });

  it("membuang karakter non-alfanumerik di ujung", () => {
    expect(slugify("  Sekolah!  ")).toBe("sekolah");
  });
});

describe("sentenceDifficulty", () => {
  it("menganggap kalimat pendek mudah", () => {
    expect(sentenceDifficulty("I am happy")).toBe("easy");
  });

  it("menaikkan tingkat sesuai jumlah kata", () => {
    expect(sentenceDifficulty("I am happy now")).toBe("easy");
    expect(sentenceDifficulty("She plays the piano today")).toBe("medium");
    expect(
      sentenceDifficulty("I went to the zoo with my family yesterday"),
    ).toBe("hard");
  });
});

describe("buildDecks", () => {
  const decks = buildDecks();

  it("menghasilkan satu deck untuk setiap kategori kosakata", () => {
    const vocabDecks = decks.filter((d) => d.skill === "vocabulary");
    expect(vocabDecks.length).toBeGreaterThanOrEqual(9);
    for (const deck of vocabDecks) {
      expect(deck.id).toMatch(/^deck-vocab-/);
      expect(deck.items.length).toBeGreaterThan(0);
    }
  });

  it("setiap deck punya id unik dan minimal satu item", () => {
    const ids = decks.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const deck of decks) {
      expect(deck.items.length).toBeGreaterThan(0);
      expect(deck.title.length).toBeGreaterThan(0);
    }
  });

  it("setiap item punya prompt & answer yang tidak kosong", () => {
    for (const deck of decks) {
      for (const item of deck.items) {
        expect(item.prompt.trim().length).toBeGreaterThan(0);
        expect(item.answer.trim().length).toBeGreaterThan(0);
        expect(item.type.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("menyertakan deck grammar, sentence, reading, dan listening", () => {
    const skills = new Set(decks.map((d) => d.skill));
    for (const skill of ["grammar", "sentence", "reading", "listening", "spelling"]) {
      expect(skills.has(skill)).toBe(true);
    }
  });

  it("jawaban grammar selalu salah satu dari pilihannya", () => {
    const grammar = decks.find((d) => d.skill === "grammar");
    expect(grammar).toBeDefined();
    for (const item of grammar!.items) {
      expect(item.options).toContain(item.answer);
    }
  });

  it("jawaban reading & listening selalu ada di dalam options", () => {
    for (const skill of ["reading", "listening"]) {
      const deck = decks.find((d) => d.skill === skill)!;
      for (const item of deck.items) {
        expect(item.options).toContain(item.answer);
      }
    }
  });
});

describe("seedStudents", () => {
  it("mengembalikan daftar siswa dengan nisn unik", () => {
    const students = seedStudents();
    expect(students.length).toBeGreaterThan(0);
    const nisn = students.map((s) => s.nisn);
    expect(new Set(nisn).size).toBe(nisn.length);
  });
});
