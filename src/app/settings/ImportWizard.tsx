"use client";

import { useMemo, useRef, useState } from "react";
import { parseTableFile, type ParsedTable } from "@/lib/tabular";
import {
  tableToGrammar,
  tableToSentenceBank,
  tableToStudents,
  tableToVocab,
  tableToWordList,
} from "@/lib/importers";
import {
  usePlatformData,
  updatePlatformData,
  pushStudents,
} from "@/lib/store";
import type { ContinuousQuestion, Student } from "@/lib/types";
import type { VocabPair } from "@/lib/vocabulary";

/** Jenis data tujuan impor. */
type Target = "vocab" | "students" | "grammar" | "words" | "sentences";

interface TargetDef {
  id: Target;
  label: string;
  icon: string;
  hint: string;
  /** Kolom minimal yang harus dipetakan. */
  columns: { key: string; label: string; required: boolean }[];
}

const TARGETS: TargetDef[] = [
  {
    id: "vocab",
    label: "Kosakata",
    icon: "📚",
    hint: "Vocabulary Match, Memory Match, Hangman, Anagram, Pronounce It.",
    columns: [
      { key: "en", label: "English", required: true },
      { key: "id", label: "Indonesia", required: true },
      { key: "category", label: "Kategori", required: false },
    ],
  },
  {
    id: "students",
    label: "Data Siswa",
    icon: "🧑‍🎓",
    hint: "Papan peringkat & rekap nilai.",
    columns: [
      { key: "nisn", label: "NISN", required: true },
      { key: "nama", label: "Nama", required: true },
      { key: "nilai", label: "Nilai", required: false },
    ],
  },
  {
    id: "grammar",
    label: "Soal Grammar",
    icon: "📝",
    hint: "Continuous Battle (tepat 2 pilihan).",
    columns: [
      { key: "q", label: "Soal", required: true },
      { key: "opt1", label: "Opsi 1", required: true },
      { key: "opt2", label: "Opsi 2", required: true },
      { key: "answer", label: "Jawaban (1/2 atau teks)", required: true },
    ],
  },
  {
    id: "words",
    label: "Daftar Kata",
    icon: "🔤",
    hint: "Word Battle / Spelling Battle — satu kolom kata.",
    columns: [{ key: "word", label: "Kata", required: true }],
  },
  {
    id: "sentences",
    label: "Bank Kalimat",
    icon: "💬",
    hint: "Sentence Battle — satu kolom kalimat.",
    columns: [{ key: "sentence", label: "Kalimat", required: true }],
  },
];

/** Pilihan kolom: indeks kolom, atau -1 = tidak dipakai. */
type Mapping = Record<string, number>;

const inputCls =
  "w-full rounded-xl border-2 border-line bg-ink-soft p-2.5 text-sm text-white outline-none focus:border-gold";
const btnCls = "focus-ring cursor-pointer rounded-xl px-5 py-2.5 font-bold transition-colors";

export function ImportWizard({
  onFlash,
  onCloudConfigured,
  teacherAuth,
}: {
  onFlash: (msg: string) => void;
  onCloudConfigured: boolean;
  teacherAuth: "unknown" | "yes" | "no";
}) {
  const data = usePlatformData();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [target, setTarget] = useState<Target>("vocab");
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Mapping>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [append, setAppend] = useState(true);

  const def = useMemo(() => TARGETS.find((t) => t.id === target)!, [target]);

  /** Auto-petakan kolom berdasarkan nama header (mirip nama kolom). */
  const autoMap = (t: ParsedTable, d: TargetDef): Mapping => {
    const m: Mapping = {};
    const aliases: Record<string, string[]> = {
      en: ["english", "en", "inggris", "kata", "word"],
      id: ["indonesia", "id", "arti", "meaning", "terjemahan"],
      category: ["kategori", "category", "kelompok", "grup"],
      nisn: ["nisn", "no", "nomor", "id"],
      nama: ["nama", "name", "siswa", "murid"],
      nilai: ["nilai", "score", "skor", "total", "total_nilai"],
      q: ["soal", "pertanyaan", "question", "q"],
      opt1: ["opsi1", "opsi 1", "option1", "pilihan1", "a"],
      opt2: ["opsi2", "opsi 2", "option2", "pilihan2", "b"],
      answer: ["jawaban", "kunci", "answer", "key", "ans"],
      word: ["kata", "word", "english", "en"],
      sentence: ["kalimat", "sentence", "text", "teks"],
    };
    for (const col of d.columns) {
      const wants = aliases[col.key] ?? [col.key.toLowerCase()];
      const idx = t.headers.findIndex((h) =>
        wants.includes(h.trim().toLowerCase()),
      );
      m[col.key] = idx;
    }
    return m;
  };

  const onPickFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const parsed = await parseTableFile(file);
      if (parsed.headers.length === 0) {
        setError("Berkas kosong atau tidak terbaca.");
        setTable(null);
        return;
      }
      setTable(parsed);
      setFileName(file.name);
      setMapping(autoMap(parsed, def));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membaca berkas.");
      setTable(null);
    } finally {
      setBusy(false);
    }
  };

  const changeTarget = (t: Target) => {
    setTarget(t);
    const d = TARGETS.find((x) => x.id === t)!;
    setMapping(table ? autoMap(table, d) : {});
    setError(null);
  };

  /** Validasi pemetaan: kolom wajib harus dipilih & berbeda. */
  const validate = (): string | null => {
    for (const col of def.columns) {
      if (col.required && (mapping[col.key] ?? -1) < 0) {
        return `Kolom "${col.label}" wajib dipetakan.`;
      }
    }
    const used = def.columns
      .map((c) => mapping[c.key])
      .filter((v) => v !== undefined && v >= 0);
    if (new Set(used).size !== used.length) {
      return "Ada kolom sumber yang dipakai dua kali. Pilih kolom berbeda.";
    }
    return null;
  };

  /** Jalankan konversi + simpan ke store. */
  const apply = async () => {
    if (!table) return;
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);

    const get = (k: string) => (mapping[k] ?? -1) >= 0 ? mapping[k] : undefined;

    if (target === "vocab") {
      const res = tableToVocab(table, {
        en: mapping.en,
        id: mapping.id,
        category: get("category"),
      });
      if (res.data.length === 0) {
        setError("Tidak ada baris valid untuk diimpor.");
        return;
      }
      const next: VocabPair[] = append ? dedupeVocab([...data.vocab, ...res.data]) : dedupeVocab(res.data);
      updatePlatformData({ vocab: next });
      onFlash(`${res.data.length} kosakata diimpor${res.errors.length ? `, ${res.errors.length} dilewati` : ""}.`);
    } else if (target === "students") {
      const res = tableToStudents(table, {
        nisn: mapping.nisn,
        nama: mapping.nama,
        nilai: get("nilai"),
      });
      if (res.data.length === 0) {
        setError("Tidak ada baris valid untuk diimpor.");
        return;
      }
      const next = append ? dedupeStudents([...data.students, ...res.data]) : dedupeStudents(res.data);
      updatePlatformData({ students: next });
      onFlash(`${res.data.length} siswa diimpor${res.errors.length ? `, ${res.errors.length} dilewati` : ""}.`);
      if (onCloudConfigured && teacherAuth === "yes") {
        void pushStudents(next).then((okPush) => {
          if (okPush) onFlash("Data siswa juga diunggah ke cloud.");
        });
      }
    } else if (target === "grammar") {
      const answerIsText = /\D/.test(String(table.rows[0]?.[mapping.answer] ?? ""));
      const cols = answerIsText
        ? { q: mapping.q, options: [mapping.opt1, mapping.opt2], answerText: mapping.answer }
        : { q: mapping.q, options: [mapping.opt1, mapping.opt2], answerIndex: mapping.answer };
      const res = tableToGrammar(table, cols);
      if (res.data.length === 0) {
        setError("Tidak ada soal valid. Pastikan jawaban berisi 1/2 atau salah satu teks opsi.");
        return;
      }
      const next: ContinuousQuestion[] = append ? [...data.questions, ...res.data] : res.data;
      updatePlatformData({ questions: next });
      onFlash(`${res.data.length} soal grammar diimpor${res.errors.length ? `, ${res.errors.length} dilewati` : ""}.`);
    } else if (target === "words") {
      const list = tableToWordList(table, mapping.word);
      if (list.length === 0) {
        setError("Tidak ada kata yang terbaca.");
        return;
      }
      updatePlatformData({ nouns: append ? dedupeList([...data.nouns, ...list]) : list });
      onFlash(`${list.length} kata diimpor ke daftar Noun. Ubah daftar lain di tab Bank Kata.`);
    } else if (target === "sentences") {
      const bank = tableToSentenceBank(table, mapping.sentence);
      if (!bank) {
        setError("Tidak ada kalimat yang terbaca.");
        return;
      }
      const next = append ? `${data.sentences}|${bank}` : bank;
      updatePlatformData({ sentences: next });
      onFlash(`${bank.split("|").length} kalimat diimpor.`);
    }
  };

  const preview = table ? table.rows.slice(0, 6) : [];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-white">📥 Impor dari Excel / CSV</h2>
        <p className="mt-1 text-sm text-muted">
          Unggah berkas <b className="text-white">.xlsx</b>, <b className="text-white">.csv</b>,
          atau <b className="text-white">.tsv</b>, petakan kolom, lalu simpan. Data digabung
          (atau diganti) sesuai pilihan.
        </p>
      </div>

      {/* Pilih jenis data */}
      <div className="flex flex-wrap gap-2">
        {TARGETS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => changeTarget(t.id)}
            className={`focus-ring cursor-pointer rounded-xl border-2 px-4 py-2 font-semibold transition-all ${
              target === t.id
                ? "border-gold bg-gold text-ink"
                : "border-line bg-white/5 text-muted hover:border-white/40 hover:text-white"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <p className="-mt-3 text-xs text-muted">{def.hint}</p>

      {/* Unggah berkas */}
      <div className="rounded-xl border-2 border-dashed border-line bg-ink-soft p-6 text-center">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt,.xlsx,.xlsm"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onPickFile(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className={`${btnCls} bg-blue text-ink disabled:opacity-50`}
        >
          {busy ? "Membaca…" : "📄 Pilih Berkas"}
        </button>
        {fileName ? (
          <p className="mt-3 text-sm text-green">
            ✓ {fileName} — {table?.rows.length ?? 0} baris data, {table?.headers.length ?? 0} kolom
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">Belum ada berkas dipilih.</p>
        )}
      </div>

      {error ? (
        <p className="rounded-xl border border-red/40 bg-red/10 px-4 py-3 text-sm font-semibold text-red">
          ⚠️ {error}
        </p>
      ) : null}

      {table ? (
        <>
          {/* Pemetaan kolom */}
          <div className="rounded-xl border border-line bg-ink-soft p-4">
            <h3 className="mb-3 font-display text-lg text-white">Petakan Kolom</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {def.columns.map((col) => (
                <label key={col.key} className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-muted">
                    {col.label}
                    {col.required ? <span className="text-red"> *</span> : null}
                  </span>
                  <select
                    value={mapping[col.key] ?? -1}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [col.key]: Number(e.target.value) }))
                    }
                    className={inputCls}
                  >
                    <option value={-1}>— tidak dipakai —</option>
                    {table.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {String.fromCharCode(65 + i)}: {h || `(kolom ${i + 1})`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          {/* Pratinjau */}
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-white/5 text-left text-muted">
                  {table.headers.map((h, i) => (
                    <th key={i} className="border-b border-line px-3 py-2 font-semibold whitespace-nowrap">
                      {h || `(kolom ${i + 1})`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, ri) => (
                  <tr key={ri} className="border-b border-line/60">
                    {table.headers.map((_, ci) => (
                      <td key={ci} className="px-3 py-1.5 text-white whitespace-nowrap">
                        {row[ci] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {table.rows.length > preview.length ? (
              <p className="px-3 py-2 text-xs text-muted">
                … dan {table.rows.length - preview.length} baris lainnya.
              </p>
            ) : null}
          </div>

          {/* Opsi + aksi */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={append}
                onChange={(e) => setAppend(e.target.checked)}
                className="h-4 w-4 accent-[color:var(--color-gold)]"
              />
              Gabung dengan data lama (hilangkan centang untuk mengganti)
            </label>
            <button type="button" onClick={() => void apply()} className={`${btnCls} bg-green text-ink`}>
              ✅ Impor & Simpan
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

/* --------------------------- Helper dedupe --------------------------- */

function dedupeVocab(list: VocabPair[]): VocabPair[] {
  const seen = new Set<string>();
  const out: VocabPair[] = [];
  for (const v of list) {
    const key = v.en.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function dedupeStudents(list: Student[]): Student[] {
  const seen = new Set<string>();
  const out: Student[] = [];
  for (const s of list) {
    const key = s.nisn.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function dedupeList(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of list) {
    const key = w.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(w.trim());
  }
  return out;
}
