import { describe, expect, it } from "vitest";
import { buildDeck, deckToCsv, deckToJson, parseDeck, sentenceDifficulty } from "./deckBuilder";
import { defaultData, type PlatformData } from "./store";

const data: PlatformData = {
  ...defaultData,
  vocab: [
    { en: "cat", id: "Kucing", category: "Hewan" },
    { en: "dog", id: "Anjing", category: "Hewan" },
    { en: "apple", id: "Apel", category: "Buah" },
  ],
  sentences: "I like apples|The cat runs fast in the garden",
  questions: [{ q: "She ___ reading", opts: ["is", "are"], ans: 0 }],
  nouns: ["table", "chair"],
  verbs: ["run"],
  adjectives: ["happy"],
  animals: ["Cat", "Dog"],
};

describe("buildDeck", () => {
  it("membangun deck kosakata dari data", () => {
    const deck = buildDeck(data, { title: "Kosakata Dasar", skill: "vocabulary" });
    expect(deck.skill).toBe("vocabulary");
    expect(deck.items).toHaveLength(3);
    expect(deck.items[0]).toMatchObject({ type: "vocab", prompt: "cat", answer: "Kucing" });
    expect(deck.tags).toContain("vocabulary");
  });

  it("memfilter kosakata per kategori", () => {
    const deck = buildDeck(data, { title: "Hewan", skill: "vocabulary", category: "Hewan" });
    expect(deck.items).toHaveLength(2);
    expect(deck.items.every((i) => i.hint === "Hewan")).toBe(true);
    expect(deck.tags).toContain("Hewan");
  });

  it("menghormati batas jumlah item", () => {
    const deck = buildDeck(data, { title: "Dua saja", skill: "vocabulary", limit: 2 });
    expect(deck.items).toHaveLength(2);
  });

  it("membangun deck kalimat dengan tingkat kesulitan", () => {
    const deck = buildDeck(data, { title: "Kalimat", skill: "sentence" });
    expect(deck.items).toHaveLength(2);
    expect(deck.items[0].difficulty).toBe("easy");
    expect(deck.items[1].difficulty).toBe("medium");
  });

  it("membangun deck spelling dengan gambar", () => {
    const deck = buildDeck(data, { title: "Ejaan", skill: "spelling" });
    expect(deck.items).toHaveLength(2);
    expect(deck.items[0].media).toContain("image.pollinations.ai");
  });

  it("membangun deck word-class dengan opsi", () => {
    const deck = buildDeck(data, { title: "Kelas Kata", skill: "word-class" });
    expect(deck.items).toHaveLength(4);
    expect(deck.items[0].options).toEqual(["Noun", "Verb", "Adjective"]);
  });

  it("membangun deck grammar", () => {
    const deck = buildDeck(data, { title: "Grammar", skill: "grammar" });
    expect(deck.items[0]).toMatchObject({ prompt: "She ___ reading", answer: "is" });
  });
});

describe("parseDeck", () => {
  it("bolak-balik JSON tetap utuh", () => {
    const deck = buildDeck(data, { title: "Uji", skill: "vocabulary" });
    const parsed = parseDeck(deckToJson(deck));
    expect(parsed).not.toBeNull();
    expect(parsed!.title).toBe("Uji");
    expect(parsed!.items).toHaveLength(deck.items.length);
  });

  it("menolak JSON tak valid", () => {
    expect(parseDeck("{not json")).toBeNull();
    expect(parseDeck('{"foo":1}')).toBeNull();
  });

  it("membersihkan item rusak", () => {
    const parsed = parseDeck(
      JSON.stringify({
        title: "T",
        skill: "vocabulary",
        items: [
          { prompt: "ok", answer: "ya" },
          { prompt: "tanpa jawaban" },
          "bukan objek",
        ],
      }),
    );
    expect(parsed!.items).toHaveLength(1);
    expect(parsed!.items[0].options).toEqual([]);
  });
});

describe("deckToCsv", () => {
  it("menyertakan header & mengutip dengan benar", () => {
    const deck = buildDeck(data, { title: "CSV", skill: "vocabulary" });
    const csv = deckToCsv(deck);
    expect(csv.split("\r\n")[0]).toBe("type,prompt,answer,options,media,hint,difficulty");
    expect(csv).toContain("vocab,cat,Kucing");
  });
});

describe("sentenceDifficulty", () => {
  it("mengklasifikasi panjang kalimat", () => {
    expect(sentenceDifficulty("I run")).toBe("easy");
    expect(sentenceDifficulty("I like to run fast")).toBe("medium");
    expect(sentenceDifficulty("I like to run fast in the big garden today")).toBe("hard");
  });
});
