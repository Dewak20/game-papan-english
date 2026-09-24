import { describe, it, expect } from "vitest";
import {
  pictureItems,
  pictureByCategory,
  pictureCategories,
  buildPictureQuestion,
} from "./picture";

describe("bank tebak gambar", () => {
  it("punya cukup banyak soal untuk bermain", () => {
    expect(pictureItems.length).toBeGreaterThan(50);
  });

  it("setiap soal punya kata, arti, kategori, dan URL gambar", () => {
    for (const item of pictureItems) {
      expect(item.en.trim().length).toBeGreaterThan(0);
      expect(item.id.trim().length).toBeGreaterThan(0);
      expect(item.category.trim().length).toBeGreaterThan(0);
      expect(item.image.startsWith("https://")).toBe(true);
    }
  });

  it("setiap kata Inggris unik (tidak ada soal ambigu)", () => {
    const words = pictureItems.map((i) => i.en);
    expect(new Set(words).size).toBe(words.length);
  });

  it("setiap arti Indonesia unik", () => {
    const ids = pictureItems.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("filter 'Semua' mengembalikan seluruh bank", () => {
    expect(pictureByCategory("Semua")).toHaveLength(pictureItems.length);
  });

  it("filter kategori mengembalikan hanya kategori tersebut", () => {
    for (const c of pictureCategories) {
      if (c === "Semua") continue;
      const list = pictureByCategory(c);
      expect(list.length).toBeGreaterThanOrEqual(4);
      expect(list.every((i) => i.category === c)).toBe(true);
    }
  });
});

describe("buildPictureQuestion", () => {
  it("menghasilkan 4 pilihan unik dengan tepat satu jawaban benar", () => {
    for (let i = 0; i < 50; i++) {
      const q = buildPictureQuestion(pictureItems);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options[q.answer]).toBe(q.item.en);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThanOrEqual(3);
    }
  });

  it("menghindari gambar yang sama dua kali berturut-turut", () => {
    const prev = buildPictureQuestion(pictureItems);
    for (let i = 0; i < 20; i++) {
      const next = buildPictureQuestion(pictureItems, prev);
      expect(next.item.en).not.toBe(prev.item.en);
    }
  });

  it("tetap valid saat pool kategori kecil", () => {
    const pool = pictureByCategory("Buah");
    const q = buildPictureQuestion(pool);
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options[q.answer]).toBe(q.item.en);
  });

  it("aman saat pool kosong", () => {
    const q = buildPictureQuestion([]);
    expect(q.options).toHaveLength(4);
    expect(q.options[q.answer]).toBe(q.item.en);
  });
});
