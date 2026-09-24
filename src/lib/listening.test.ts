import { describe, it, expect } from "vitest";
import {
  listeningItems,
  listeningByLevel,
  buildListeningItem,
  type ListeningItem,
} from "./listening";

describe("bank listening", () => {
  it("punya soal kata dan kalimat", () => {
    expect(listeningItems.filter((i) => i.kind === "word").length).toBeGreaterThan(10);
    expect(listeningItems.filter((i) => i.kind === "sentence").length).toBeGreaterThan(5);
  });

  it("setiap soal punya id unik, teks ucap, dan 3 opsi unik", () => {
    const ids = new Set<string>();
    for (const it of listeningItems) {
      expect(ids.has(it.id), `id duplikat: ${it.id}`).toBe(false);
      ids.add(it.id);
      expect(it.speak.length).toBeGreaterThan(0);
      expect(it.options).toHaveLength(3);
      expect(new Set(it.options).size).toBe(3);
      expect(it.answer).toBeGreaterThanOrEqual(0);
      expect(it.answer).toBeLessThanOrEqual(2);
    }
  });

  it("jawaban benar selalu konsisten dengan indeks", () => {
    for (const it of listeningItems) {
      expect(it.options[it.answer]).toBeTruthy();
    }
  });

  it("menyebar posisi jawaban (tidak selalu pilihan A)", () => {
    const positions = new Set(listeningItems.map((i) => i.answer));
    // Harus muncul lebih dari satu posisi berbeda.
    expect(positions.size).toBeGreaterThan(1);
  });

  it("filter level 'Semua' mengembalikan semua soal", () => {
    expect(listeningByLevel("Semua")).toHaveLength(listeningItems.length);
  });

  it("filter level mengembalikan hanya level tersebut", () => {
    const easy = listeningByLevel("easy");
    expect(easy.every((i) => i.level === "easy")).toBe(true);
  });
});

describe("buildListeningItem", () => {
  it("mengembalikan soal dari pool", () => {
    const pool = listeningByLevel("Semua");
    const item = buildListeningItem(pool);
    expect(pool.some((i) => i.id === item.id)).toBe(true);
  });

  it("menghindari soal yang sama dua kali berturut-turut", () => {
    const pool: ListeningItem[] = listeningByLevel("Semua");
    const prev = buildListeningItem(pool);
    for (let i = 0; i < 20; i++) {
      const next = buildListeningItem(pool, prev);
      expect(next.id).not.toBe(prev.id);
    }
  });

  it("aman saat pool kosong", () => {
    expect(buildListeningItem([])).toBeTruthy();
  });
});
