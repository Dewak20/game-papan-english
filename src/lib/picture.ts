/**
 * Bank gambar untuk game **Tebak Gambar**.
 *
 * Setiap soal menampilkan satu gambar, siswa memilih nama Inggris yang benar
 * dari 4 pilihan. Gambar dibangkitkan otomatis (Pollinations AI) lewat
 * `imageUrlFor`, jadi tidak perlu file gambar di repo.
 *
 * Cakupan: kosakata umum yang **konkret & mudah digambar** (hewan, buah,
 * makanan, benda, tempat, transportasi) — supaya gambar AI tetap jelas.
 * Kata benda abstrak (mis. adjective/verb) sengaja tidak dipakai.
 */

import { imageUrlFor } from "./words";

interface RawPicture {
  en: string;
  id: string;
}

const BANK: Record<string, RawPicture[]> = {
  Hewan: [
    { en: "cat", id: "Kucing" },
    { en: "dog", id: "Anjing" },
    { en: "elephant", id: "Gajah" },
    { en: "lion", id: "Singa" },
    { en: "tiger", id: "Harimau" },
    { en: "giraffe", id: "Jerapah" },
    { en: "monkey", id: "Monyet" },
    { en: "bear", id: "Beruang" },
    { en: "rabbit", id: "Kelinci" },
    { en: "horse", id: "Kuda" },
    { en: "cow", id: "Sapi" },
    { en: "duck", id: "Bebek" },
    { en: "bird", id: "Burung" },
    { en: "fish", id: "Ikan" },
    { en: "snake", id: "Ular" },
    { en: "frog", id: "Katak" },
    { en: "butterfly", id: "Kupu-kupu" },
    { en: "penguin", id: "Pinguin" },
    { en: "dolphin", id: "Lumba-lumba" },
    { en: "crocodile", id: "Buaya" },
  ],
  Buah: [
    { en: "apple", id: "Apel" },
    { en: "banana", id: "Pisang" },
    { en: "orange", id: "Jeruk" },
    { en: "mango", id: "Mangga" },
    { en: "grape", id: "Anggur" },
    { en: "watermelon", id: "Semangka" },
    { en: "pineapple", id: "Nanas" },
    { en: "strawberry", id: "Stroberi" },
    { en: "lemon", id: "Lemon" },
    { en: "coconut", id: "Kelapa" },
  ],
  Makanan: [
    { en: "rice", id: "Nasi" },
    { en: "bread", id: "Roti" },
    { en: "egg", id: "Telur" },
    { en: "cake", id: "Kue" },
    { en: "pizza", id: "Pizza" },
    { en: "burger", id: "Burger" },
    { en: "milk", id: "Susu" },
    { en: "cheese", id: "Keju" },
    { en: "ice cream", id: "Es krim" },
    { en: "noodle", id: "Mie" },
  ],
  Benda: [
    { en: "book", id: "Buku" },
    { en: "pencil", id: "Pensil" },
    { en: "chair", id: "Kursi" },
    { en: "table", id: "Meja" },
    { en: "clock", id: "Jam" },
    { en: "umbrella", id: "Payung" },
    { en: "camera", id: "Kamera" },
    { en: "guitar", id: "Gitar" },
    { en: "key", id: "Kunci" },
    { en: "glasses", id: "Kacamata" },
  ],
  Tempat: [
    { en: "school", id: "Sekolah" },
    { en: "hospital", id: "Rumah sakit" },
    { en: "beach", id: "Pantai" },
    { en: "mountain", id: "Gunung" },
    { en: "park", id: "Taman" },
    { en: "bridge", id: "Jembatan" },
    { en: "market", id: "Pasar" },
    { en: "mosque", id: "Masjid" },
    { en: "library", id: "Perpustakaan" },
    { en: "zoo", id: "Kebun binatang" },
  ],
  Transportasi: [
    { en: "car", id: "Mobil" },
    { en: "bus", id: "Bus" },
    { en: "train", id: "Kereta" },
    { en: "plane", id: "Pesawat" },
    { en: "ship", id: "Kapal" },
    { en: "bicycle", id: "Sepeda" },
    { en: "motorcycle", id: "Motor" },
    { en: "helicopter", id: "Helikopter" },
    { en: "truck", id: "Truk" },
    { en: "rocket", id: "Roket" },
  ],
};

export interface PictureItem {
  /** Kata Inggris (jawaban) */
  en: string;
  /** Arti Indonesia (ditampilkan saat review) */
  id: string;
  category: string;
  /** URL gambar */
  image: string;
}

/** Semua soal gambar, lengkap dengan URL gambarnya. */
export const pictureItems: PictureItem[] = Object.entries(BANK).flatMap(
  ([category, list]) =>
    list.map((p) => ({ ...p, category, image: imageUrlFor(p.en) })),
);

/** Daftar kategori untuk filter di menu (dengan "Semua" di awal). */
export const pictureCategories: string[] = ["Semua", ...Object.keys(BANK)];

/** Filter bank sesuai kategori (atau semua). */
export function pictureByCategory(category: string): PictureItem[] {
  if (category === "Semua") return pictureItems;
  return pictureItems.filter((p) => p.category === category);
}

export interface PictureQuestion {
  /** Soal yang ditampilkan (punya `image`). */
  item: PictureItem;
  /** 4 pilihan nama Inggris (sudah diacak). */
  options: string[];
  /** indeks jawaban benar (0–3) */
  answer: number;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Bangun satu soal: ambil gambar acak + 3 pengecoh dari kategori yang sama
 * (fallback ke seluruh bank bila kategori terlalu kecil), lalu acak posisi.
 * `prev` dipakai agar gambar yang sama tidak muncul dua kali berturut-turut.
 */
export function buildPictureQuestion(
  pool: PictureItem[],
  prev?: PictureQuestion | null,
): PictureQuestion {
  const source = pool.length >= 4 ? pool : pictureItems;

  const build = (): PictureQuestion => {
    const target = pick(source);
    const sameCat = source.filter(
      (p) => p.category === target.category && p.en !== target.en,
    );
    const distractorSource = sameCat.length >= 3 ? sameCat : source.filter((p) => p.en !== target.en);
    const distractors = shuffle(distractorSource.filter((p) => p.en !== target.en)).slice(0, 3);

    // Jaring pengaman: bila bank sangat kecil, lengkapi dari seluruh bank.
    const chosen = new Set([target.en, ...distractors.map((d) => d.en)]);
    for (const p of shuffle(pictureItems)) {
      if (chosen.size >= 4) break;
      if (!chosen.has(p.en)) {
        chosen.add(p.en);
        distractors.push(p);
      }
    }

    const options = shuffle([target.en, ...distractors.map((d) => d.en)]);
    return { item: target, options, answer: options.indexOf(target.en) };
  };

  let q = build();
  let guard = 0;
  while (prev && q.item.en === prev.item.en && guard < 8) {
    q = build();
    guard++;
  }
  return q;
}
