/**
 * Bank soal Listening untuk game Listening Battle.
 *
 * Audio TIDAK memakai file — dibangkitkan lewat Web Speech API (TTS) di browser.
 * Karena itu setiap soal hanya menyimpan teks yang harus diucapkan (`speak`)
 * beserta pilihan jawaban.
 *
 * Dua tipe soal:
 *  - "word"     : dengar SATU kata → pilih artinya
 *  - "sentence" : dengar SATU kalimat → pilih arti/perilaku yang tepat
 */

export type ListeningKind = "word" | "sentence";
export type ListeningLevel = "easy" | "medium" | "hard";

export interface ListeningItem {
  id: string;
  kind: ListeningKind;
  level: ListeningLevel;
  /** teks yang diucapkan TTS (selalu bahasa Inggris) */
  speak: string;
  /** pertanyaan singkat untuk pemain */
  prompt: string;
  options: [string, string, string];
  /** indeks jawaban benar (0–2) */
  answer: 0 | 1 | 2;
}

/* ---------------------- Bagian 1: dengar kata → arti ---------------------- */
/* Sengaja memakai kata yang ejaannya mudah tertukar saat didengar. */

const WORD_ITEMS: { speak: string; id: string; distractors: [string, string] }[] = [
  { speak: "cat", id: "Kucing", distractors: ["Topi", "Tikus"] },
  { speak: "ship", id: "Kapal", distractors: ["Domba", "Toko"] },
  { speak: "sheep", id: "Domba", distractors: ["Kapal", "Sepatu"] },
  { speak: "rice", id: "Nasi", distractors: ["Es", "Tikus"] },
  { speak: "ice", id: "Es", distractors: ["Nasi", "Mata"] },
  { speak: "book", id: "Buku", distractors: ["Masak", "Sepatu"] },
  { speak: "cook", id: "Masak", distractors: ["Buku", "Kue"] },
  { speak: "tree", id: "Pohon", distractors: ["Tiga", "Teh"] },
  { speak: "three", id: "Tiga", distractors: ["Pohon", "Gratis"] },
  { speak: "bear", id: "Beruang", distractors: ["Biru", "Telinga"] },
  { speak: "blue", id: "Biru", distractors: ["Beruang", "Lem"] },
  { speak: "sun", id: "Matahari", distractors: ["Putra", "Pistol"] },
  { speak: "son", id: "Anak laki-laki", distractors: ["Matahari", "Nyanyi"] },
  { speak: "flower", id: "Bunga", distractors: ["Tepung", "Lantai"] },
  { speak: "flour", id: "Tepung", distractors: ["Bunga", "Jam"] },
  { speak: "meat", id: "Daging", distractors: ["Bertemu", "Susu"] },
  { speak: "meet", id: "Bertemu", distractors: ["Daging", "Kaki"] },
  { speak: "water", id: "Air", distractors: ["Musim dingin", "Menunggu"] },
  { speak: "rain", id: "Hujan", distractors: ["Kereta", "Cincin"] },
  { speak: "train", id: "Kereta", distractors: ["Hujan", "Melatih"] },
  { speak: "house", id: "Rumah", distractors: ["Kuda", "Kaus"] },
  { speak: "horse", id: "Kuda", distractors: ["Rumah", "Selang"] },
  { speak: "milk", id: "Susu", distractors: ["Jalan", "Bulu"] },
  { speak: "walk", id: "Jalan", distractors: ["Susu", "Dinding"] },
  { speak: "hand", id: "Tangan", distractors: ["Pasir", "Berdiri"] },
  { speak: "sand", id: "Pasir", distractors: ["Tangan", "Mengirim"] },
  { speak: "write", id: "Menulis", distractors: ["Benar", "Putih"] },
  { speak: "white", id: "Putih", distractors: ["Menulis", "Menunggu"] },
  { speak: "night", id: "Malam", distractors: ["Ksatria", "Cahaya"] },
  { speak: "light", id: "Cahaya", distractors: ["Malam", "Terbang"] },
  { speak: "glass", id: "Gelas", distractors: ["Rumput", "Kelas"] },
  { speak: "grass", id: "Rumput", distractors: ["Gelas", "Bebek"] },
  { speak: "bread", id: "Roti", distractors: ["Merah", "Burung"] },
  { speak: "bird", id: "Burung", distractors: ["Roti", "Tidur"] },
  { speak: "sleep", id: "Tidur", distractors: ["Domba", "Sapu"] },
  { speak: "soup", id: "Sup", distractors: ["Tidur", "Kapal"] },
  { speak: "eye", id: "Mata", distractors: ["Aku", "Pulau"] },
  { speak: "island", id: "Pulau", distractors: ["Mata", "Tanah"] },
  { speak: "door", id: "Pintu", distractors: ["Obat", "Lebih"] },
  { speak: "ball", id: "Bola", distractors: ["Dinding", "Musim gugur"] },
];

/* ------------------- Bagian 2: dengar kalimat → arti ------------------- */

const SENTENCE_ITEMS: { speak: string; prompt: string; options: [string, string, string]; answer: 0 | 1 | 2 }[] = [
  {
    speak: "I am hungry.",
    prompt: "Apa artinya?",
    options: ["Aku lapar", "Aku mengantuk", "Aku marah"],
    answer: 0,
  },
  {
    speak: "She is my sister.",
    prompt: "Apa artinya?",
    options: ["Dia saudara perempuanku", "Dia guruku", "Dia ibuku"],
    answer: 0,
  },
  {
    speak: "Open the door, please.",
    prompt: "Apa artinya?",
    options: ["Tolong buka pintu", "Tolong tutup pintu", "Tolong bersihkan pintu"],
    answer: 0,
  },
  {
    speak: "I go to school by bicycle.",
    prompt: "Apa artinya?",
    options: [
      "Aku pergi ke sekolah naik sepeda",
      "Aku pergi ke pasar naik sepeda",
      "Aku pergi ke sekolah naik mobil",
    ],
    answer: 0,
  },
  {
    speak: "The cat is sleeping on the sofa.",
    prompt: "Apa artinya?",
    options: [
      "Kucing itu tidur di sofa",
      "Kucing itu makan di sofa",
      "Kucing itu duduk di sofa",
    ],
    answer: 0,
  },
  {
    speak: "My father works in an office.",
    prompt: "Apa artinya?",
    options: [
      "Ayahku bekerja di kantor",
      "Ayahku bekerja di sawah",
      "Ayahku bekerja di rumah",
    ],
    answer: 0,
  },
  {
    speak: "Can you help me, please?",
    prompt: "Apa artinya?",
    options: ["Bisakah kamu membantuku?", "Bisakah kamu menungguku?", "Bisakah kamu mengajariku?"],
    answer: 0,
  },
  {
    speak: "I like ice cream very much.",
    prompt: "Apa artinya?",
    options: [
      "Aku sangat suka es krim",
      "Aku tidak suka es krim",
      "Aku suka cokelat",
    ],
    answer: 0,
  },
  {
    speak: "We are studying English now.",
    prompt: "Apa artinya?",
    options: [
      "Kami sedang belajar bahasa Inggris sekarang",
      "Kami belajar bahasa Inggris kemarin",
      "Kami akan belajar bahasa Inggris",
    ],
    answer: 0,
  },
  {
    speak: "He bought a new bag yesterday.",
    prompt: "Apa artinya?",
    options: [
      "Dia membeli tas baru kemarin",
      "Dia menjual tas baru kemarin",
      "Dia membawa tas baru kemarin",
    ],
    answer: 0,
  },
  {
    speak: "Please turn off the light.",
    prompt: "Apa artinya?",
    options: ["Tolong matikan lampu", "Tolong nyalakan lampu", "Tolong perbaiki lampu"],
    answer: 0,
  },
  {
    speak: "My mother is cooking in the kitchen.",
    prompt: "Apa artinya?",
    options: [
      "Ibuku sedang memasak di dapur",
      "Ibuku sedang mencuci di dapur",
      "Ibuku sedang makan di dapur",
    ],
    answer: 0,
  },
  {
    speak: "They are playing football in the field.",
    prompt: "Apa artinya?",
    options: [
      "Mereka sedang bermain bola di lapangan",
      "Mereka sedang bermain bola di pantai",
      "Mereka sedang menonton bola di lapangan",
    ],
    answer: 0,
  },
  {
    speak: "I have already finished my homework.",
    prompt: "Apa artinya?",
    options: [
      "Aku sudah menyelesaikan PR-ku",
      "Aku belum menyelesaikan PR-ku",
      "Aku sedang mengerjakan PR-ku",
    ],
    answer: 0,
  },
  {
    speak: "Do not throw rubbish in the river.",
    prompt: "Apa artinya?",
    options: [
      "Jangan buang sampah di sungai",
      "Jangan berenang di sungai",
      "Jangan memancing di sungai",
    ],
    answer: 0,
  },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function rotate<T>(arr: T[], n: number): T[] {
  const k = ((n % arr.length) + arr.length) % arr.length;
  return [...arr.slice(k), ...arr.slice(0, k)];
}

export const listeningItems: ListeningItem[] = [
  ...WORD_ITEMS.map((w, i) => {
    // Posisi jawaban benar diputar deterministik agar tidak selalu "A".
    const opts = rotate([w.id, ...w.distractors], hash(w.speak) % 3) as [
      string,
      string,
      string,
    ];
    const answer = opts.indexOf(w.id) as 0 | 1 | 2;
    return {
      id: `w-${i}`,
      kind: "word" as const,
      level: "easy" as const,
      speak: w.speak,
      prompt: "Kata apa yang kamu dengar?",
      options: opts,
      answer,
    };
  }),
  ...SENTENCE_ITEMS.map((s, i) => {
    const opts = rotate(s.options, hash(s.speak) % 3) as [string, string, string];
    const correct = s.options[s.answer];
    const answer = opts.indexOf(correct) as 0 | 1 | 2;
    return {
      id: `s-${i}`,
      kind: "sentence" as const,
      level: "medium" as const,
      speak: s.speak,
      prompt: s.prompt,
      options: opts,
      answer,
    };
  }),
];

export function listeningByLevel(level: ListeningLevel | "Semua"): ListeningItem[] {
  if (level === "Semua") return listeningItems;
  const list = listeningItems.filter((i) => i.level === level);
  return list.length > 0 ? list : listeningItems;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Ambil satu soal listening acak (hindari mengulang soal yang sama). */
export function buildListeningItem(
  pool: ListeningItem[],
  prev?: ListeningItem | null,
): ListeningItem {
  const source = pool.length > 0 ? pool : listeningItems;
  let item = pick(source);
  let guard = 0;
  while (prev && item.id === prev.id && source.length > 1 && guard < 8) {
    item = pick(source);
    guard++;
  }
  return item;
}
