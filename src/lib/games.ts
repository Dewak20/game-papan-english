export type Accent = "blue" | "red" | "gold" | "green" | "violet" | "teal" | "orange" | "pink" | "lime";

export interface GameMeta {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  accent: Accent;
  skills: string[];
  mode: "Duel 2 Tim" | "Perorangan";
}

export const games: GameMeta[] = [
  {
    slug: "word-battle",
    title: "Word Battle",
    subtitle: "Noun · Verb · Adjective",
    description:
      "Dua tim berlomba mengklasifikasi kata menjadi Noun, Verb, atau Adjective. Benar dapat poin, salah kena penalti.",
    icon: "🎯",
    accent: "blue",
    skills: ["Part of Speech", "Vocabulary"],
    mode: "Duel 2 Tim",
  },
  {
    slug: "spelling-battle",
    title: "Spelling Battle",
    subtitle: "Tebak Kata dari Gambar",
    description:
      "Lihat gambar hewan, lalu ketik namanya huruf per huruf di keyboard virtual. Kecepatan dan ketepatan menentukan pemenang.",
    icon: "🦁",
    accent: "gold",
    skills: ["Spelling", "Vocabulary"],
    mode: "Duel 2 Tim",
  },
  {
    slug: "sentence-battle",
    title: "Sentence Battle",
    subtitle: "Susun Kata Jadi Kalimat",
    description:
      "Kata-kata diacak, dua tim berlomba menyusunnya kembali menjadi kalimat yang benar. Salah sedikit, mulai dari awal lagi!",
    icon: "🧩",
    accent: "red",
    skills: ["Sentence Structure", "Grammar"],
    mode: "Duel 2 Tim",
  },
  {
    slug: "continuous-battle",
    title: "Continuous Battle",
    subtitle: "Present Continuous",
    description:
      "Latih to-be (am/is/are) dan bentuk -ing. Dua tim menjawab soal grammar secepat mungkin sebelum waktu habis.",
    icon: "⏳",
    accent: "violet",
    skills: ["Tenses", "Grammar"],
    mode: "Duel 2 Tim",
  },
  {
    slug: "vocabulary-match",
    title: "Vocabulary Match",
    subtitle: "Kata Inggris ↔ Indonesia",
    description:
      "Pilih arti Indonesia yang tepat dari kata Inggris yang muncul. Ada 9 kategori kosakata, dari hewan sampai kata sekolah.",
    icon: "📚",
    accent: "green",
    skills: ["Vocabulary", "Terjemahan"],
    mode: "Duel 2 Tim",
  },
  {
    slug: "hangman",
    title: "Hangman",
    subtitle: "Tebak Kata dari Artinya",
    description:
      "Tebak kata Inggris huruf per huruf dengan petunjuk arti Indonesia. Hati-hati, salah 6 kali tiang gantungan lengkap!",
    icon: "🪢",
    accent: "violet",
    skills: ["Spelling", "Vocabulary"],
    mode: "Duel 2 Tim",
  },
  {
    slug: "anagram",
    title: "Anagram",
    subtitle: "Susun Huruf Jadi Kata",
    description:
      "Huruf-huruf acak harus disusun kembali menjadi kata Inggris yang benar sesuai petunjuk artinya. Salah satu huruf, ulang dari awal!",
    icon: "🔀",
    accent: "blue",
    skills: ["Spelling", "Vocabulary"],
    mode: "Duel 2 Tim",
  },
  {
    slug: "memory-match",
    title: "Memory Match",
    subtitle: "Kartu Kata & Arti",
    description:
      "Balik kartu dan jodohkan kata Inggris dengan arti Indonesianya. Melatih ingatan sekaligus kosakata.",
    icon: "🃏",
    accent: "gold",
    skills: ["Memory", "Vocabulary"],
    mode: "Duel 2 Tim",
  },
  {
    slug: "reading-race",
    title: "Reading Race",
    subtitle: "Pemahaman Bacaan",
    description:
      "Baca teks pendek, lalu jawab pertanyaannya secepat mungkin. Dua tim berlomba memahami isi bacaan — cocok untuk latihan reading comprehension.",
    icon: "📖",
    accent: "teal",
    skills: ["Reading", "Comprehension"],
    mode: "Duel 2 Tim",
  },
  {
    slug: "listening-battle",
    title: "Listening Battle",
    subtitle: "Dengar & Pilih Artinya",
    description:
      "Dengarkan kata atau kalimat bahasa Inggris yang diucapkan, lalu pilih artinya. Melatih pendengaran dan pengucapan — audio dibuat langsung oleh browser.",
    icon: "🎧",
    accent: "orange",
    skills: ["Listening", "Vocabulary"],
    mode: "Duel 2 Tim",
  },
  {
    slug: "pronounce-it",
    title: "Pronounce It",
    subtitle: "Latihan Pengucapan",
    description:
      "Lihat kata & artinya, lalu ucapkan dengan jelas ke mikrofon. Browser menilai kemiripan pengucapanmu — makin tepat, makin tinggi skornya. Ada mode guru manual bila mic tak tersedia.",
    icon: "🎤",
    accent: "pink",
    skills: ["Speaking", "Pronunciation"],
    mode: "Duel 2 Tim",
  },
  {
    slug: "tebak-gambar",
    title: "Tebak Gambar",
    subtitle: "Lihat Foto, Pilih Katanya",
    description:
      "Lihat sebuah gambar, lalu pilih nama bahasa Inggris yang benar dari empat pilihan. Melatih kosakata lewat gambar — ada kategori hewan, buah, makanan, benda, tempat, dan transportasi.",
    icon: "🖼️",
    accent: "lime",
    skills: ["Vocabulary", "Visual"],
    mode: "Duel 2 Tim",
  },
  {
    slug: "rank",
    title: "Cek Ranking",
    subtitle: "Hasil & Pencapaian Siswa",
    description:
      "Masukkan NISN untuk melihat nama, ranking, dan total nilai. Dilengkapi kata motivasi untuk setiap siswa.",
    icon: "🏆",
    accent: "green",
    skills: ["Rapor", "Motivasi"],
    mode: "Perorangan",
  },
];
