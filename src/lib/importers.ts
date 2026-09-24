/**
 * Konversi tabel hasil impor (Excel/CSV) menjadi data yang dipakai store.
 *
 * Semua fungsi murni (tanpa DOM) sehingga bisa diuji langsung. Panel Guru
 * memakai ini setelah pengguna memetakan kolom lewat UI.
 */

import type { ContinuousQuestion, Student } from "./types";
import type { VocabPair } from "./vocabulary";
import type { ParsedTable } from "./tabular";

export interface ConvertResult<T> {
  /** Baris yang berhasil dikonversi. */
  data: T[];
  /** Baris gagal, berisi nomor baris asli (1-based, termasuk header) + alasan. */
  errors: { line: number; message: string; raw: string[] }[];
}

function cell(row: string[], idx: number | undefined): string {
  if (idx === undefined || idx < 0) return "";
  return (row[idx] ?? "").trim();
}

/* ------------------------------- Kosakata ------------------------------- */

export interface VocabColumns {
  en: number;
  id: number;
  category?: number;
}

/** Tabel → daftar `VocabPair` (english = indonesia [Kategori]). */
export function tableToVocab(
  table: ParsedTable,
  cols: VocabColumns,
): ConvertResult<VocabPair> {
  const data: VocabPair[] = [];
  const errors: ConvertResult<VocabPair>["errors"] = [];

  table.rows.forEach((row, i) => {
    const en = cell(row, cols.en);
    const id = cell(row, cols.id);
    const category = cell(row, cols.category) || "Umum";
    const line = i + 2; // +1 header, +1 karena 1-based

    if (!en || !id) {
      if (row.some((c) => c.trim() !== "")) {
        errors.push({ line, message: "Kolom English/Indonesia kosong.", raw: row });
      }
      return;
    }
    data.push({ en, id, category });
  });

  return { data, errors };
}

/* -------------------------------- Siswa -------------------------------- */

export interface StudentColumns {
  nisn: number;
  nama: number;
  nilai?: number;
}

/** Tabel → daftar `Student`. Kolom nilai opsional (default 0). */
export function tableToStudents(
  table: ParsedTable,
  cols: StudentColumns,
): ConvertResult<Student> {
  const data: Student[] = [];
  const errors: ConvertResult<Student>["errors"] = [];

  table.rows.forEach((row, i) => {
    const nisn = cell(row, cols.nisn);
    const nama = cell(row, cols.nama);
    const nilaiRaw = cell(row, cols.nilai);
    const line = i + 2;

    if (!nisn && !nama) return; // baris kosong
    if (!nisn || !nama) {
      errors.push({ line, message: "NISN atau Nama kosong.", raw: row });
      return;
    }
    const nilai = nilaiRaw === "" ? 0 : Number(nilaiRaw.replace(",", "."));
    if (Number.isNaN(nilai)) {
      errors.push({ line, message: `Nilai "${nilaiRaw}" bukan angka.`, raw: row });
      return;
    }
    data.push({ nisn, nama, total_nilai: nilai });
  });

  return { data, errors };
}

/* ----------------------------- Soal grammar ----------------------------- */

export interface GrammarColumns {
  q: number;
  /** Kolom opsi (2 atau lebih). */
  options: number[];
  /** Kolom indeks jawaban benar (1-based) — opsional bila memakai `answerText`. */
  answerIndex?: number;
  /** Kolom teks jawaban benar (dicocokkan ke opsi) — opsional. */
  answerText?: number;
}

/** Tabel → daftar `ContinuousQuestion` (2 pilihan). */
export function tableToGrammar(
  table: ParsedTable,
  cols: GrammarColumns,
): ConvertResult<ContinuousQuestion> {
  const data: ContinuousQuestion[] = [];
  const errors: ConvertResult<ContinuousQuestion>["errors"] = [];

  table.rows.forEach((row, i) => {
    const q = cell(row, cols.q);
    const line = i + 2;
    const opts = cols.options.map((c) => cell(row, c));

    if (!q && opts.every((o) => !o)) return;
    if (!q || opts.length < 2 || opts.some((o) => !o)) {
      errors.push({ line, message: "Soal/opsi belum lengkap.", raw: row });
      return;
    }
    if (opts.length > 2) {
      // Game ini hanya mendukung 2 opsi; ambil dua pertama bila lebih.
      opts.length = 2;
    }

    let ans = -1;
    if (cols.answerText !== undefined) {
      const want = cell(row, cols.answerText);
      ans = opts.findIndex((o) => o.toLowerCase() === want.toLowerCase());
    } else if (cols.answerIndex !== undefined) {
      const n = Number(cell(row, cols.answerIndex));
      if (n === 1 || n === 2) ans = n - 1;
    }

    if (ans !== 0 && ans !== 1) {
      errors.push({
        line,
        message: "Jawaban harus 1 atau 2 (atau cocok dengan salah satu opsi).",
        raw: row,
      });
      return;
    }

    data.push({ q, opts: [opts[0], opts[1]], ans: ans as 0 | 1 });
  });

  return { data, errors };
}

/* ------------------------------ Daftar kata ------------------------------ */

/** Tabel → daftar kata unik (menggabungkan semua sel non-kosong). */
export function tableToWordList(table: ParsedTable, col = 0): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of table.rows) {
    const w = cell(row, col);
    if (!w) continue;
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

/* ------------------------------ Daftar kalimat ------------------------------ */

/** Tabel → satu string kalimat dipisah `|` (format bank kalimat). */
export function tableToSentenceBank(table: ParsedTable, col = 0): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of table.rows) {
    const s = cell(row, col);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out.join("|");
}

/* ------------------------------ Ekspor CSV ------------------------------ */

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Susun matriks string menjadi teks CSV (siap diunduh/dibuka di Excel). */
export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((c) => csvCell(String(c))).join(",")).join("\r\n");
}

/** Ekspor daftar kosakata ke CSV. */
export function vocabToCsv(list: VocabPair[]): string {
  return toCsv([
    ["English", "Indonesia", "Kategori"],
    ...list.map((v) => [v.en, v.id, v.category]),
  ]);
}

/** Ekspor daftar siswa ke CSV. */
export function studentsToCsv(list: Student[]): string {
  return toCsv([
    ["NISN", "Nama", "Nilai"],
    ...list.map((s) => [s.nisn, s.nama, s.total_nilai]),
  ]);
}
