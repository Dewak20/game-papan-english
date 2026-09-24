import type { Student } from "./types";

/**
 * Data siswa lokal — hasil migrasi dari Google Apps Script.
 * Ganti isi array ini dengan data asli (NISN, nama, total_nilai).
 */
export const students: Student[] = [
  { nisn: "0091234501", nama: "Adinda Putri Maharani", total_nilai: 1288 },
  { nisn: "0091234502", nama: "Bagas Prasetyo", total_nilai: 1201 },
  { nisn: "0091234503", nama: "Citra Ayu Lestari", total_nilai: 1310 },
  { nisn: "0091234504", nama: "Dimas Aryo Nugroho", total_nilai: 1150 },
  { nisn: "0091234505", nama: "Eka Nur Fadhilah", total_nilai: 1244 },
  { nisn: "0091234506", nama: "Fajar Ramadhan", total_nilai: 1098 },
  { nisn: "0091234507", nama: "Gita Permata Sari", total_nilai: 1267 },
  { nisn: "0091234508", nama: "Hendra Wijaya Kusuma", total_nilai: 1189 },
  { nisn: "0091234509", nama: "Intan Permatasari", total_nilai: 1302 },
  { nisn: "0091234510", nama: "Joko Susilo", total_nilai: 1120 },
  { nisn: "0091234511", nama: "Kirana Dewi Anggraini", total_nilai: 1275 },
  { nisn: "0091234512", nama: "Lukman Hakim", total_nilai: 1163 },
  { nisn: "0091234513", nama: "Maya Sari Ramadhani", total_nilai: 1229 },
  { nisn: "0091234514", nama: "Naufal Zaki Pratama", total_nilai: 1135 },
  { nisn: "0091234515", nama: "Oktavia Rahmawati", total_nilai: 1256 },
  { nisn: "0091234516", nama: "Putra Adi Saputra", total_nilai: 1107 },
  { nisn: "0091234517", nama: "Qonita Zahra", total_nilai: 1291 },
  { nisn: "0091234518", nama: "Rizky Maulana", total_nilai: 1176 },
  { nisn: "0091234519", nama: "Salsabila Kurniawati", total_nilai: 1318 },
  { nisn: "0091234520", nama: "Taufik Hidayat", total_nilai: 1142 },
  { nisn: "0091234521", nama: "Umi Kalsum", total_nilai: 1237 },
  { nisn: "0091234522", nama: "Vino Alfarizi", total_nilai: 1114 },
  { nisn: "0091234523", nama: "Wulan Sari Dewi", total_nilai: 1260 },
  { nisn: "0091234524", nama: "Yoga Pratama", total_nilai: 1158 },
  { nisn: "0091234525", nama: "Zahra Aulia Rahma", total_nilai: 1305 },
];

export interface RankResult extends Student {
  rank: number;
}

/** Hitung ranking dari array siswa (nilai tertinggi = rank 1). */
export function rankStudent(list: Student[], nisn: string): RankResult | null {
  const clean = nisn.trim();
  const sorted = [...list].sort((a, b) => b.total_nilai - a.total_nilai);
  const index = sorted.findIndex((s) => s.nisn === clean);
  if (index === -1) return null;
  return { ...sorted[index], rank: index + 1 };
}

export function motivationalQuote(rank: number): string {
  if (rank === 1) {
    return "Luar biasa! Kamu adalah Juara 1. Pertahankan prestasimu dan teruslah menjadi inspirasi! 🌟";
  }
  if (rank <= 3) {
    return "Hebat sekali! Kamu masuk 3 besar. Sedikit lagi menuju puncak, pertahankan semangatmu! 🔥";
  }
  if (rank <= 10) {
    return "Kerja bagus! Kamu berhasil masuk 10 besar. Tingkatkan lagi belajarmu, sukses menantimu! 🚀";
  }
  return "Jangan berkecil hati! Nilai hanyalah angka, yang terpenting adalah semangatmu untuk terus belajar. 💪";
}
