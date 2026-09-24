"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  usePlatformData,
  updatePlatformData,
  resetPlatformData,
  exportData,
  importData,
  defaultData,
  syncStudents,
  pushStudents,
} from "@/lib/store";
import { getPin, setPin, useUnlocked, markUnlocked, lockNow } from "@/lib/pin";
import { apiDelete, apiGet, apiPost, useCloudStatus, initSync } from "@/lib/sync";
import { ImportWizard } from "./ImportWizard";
import { DeckBuilder } from "./DeckBuilder";
import type { ContinuousQuestion, Student } from "@/lib/types";
import type { VocabPair } from "@/lib/vocabulary";

type Tab =
  | "students"
  | "sentences"
  | "questions"
  | "vocab"
  | "words"
  | "import"
  | "decks"
  | "backup";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "students", label: "Data Siswa", icon: "🧑‍🎓" },
  { id: "sentences", label: "Bank Kalimat", icon: "💬" },
  { id: "questions", label: "Soal Grammar", icon: "📝" },
  { id: "vocab", label: "Kosakata", icon: "📚" },
  { id: "words", label: "Bank Kata", icon: "🔤" },
  { id: "import", label: "Impor Excel/CSV", icon: "📥" },
  { id: "decks", label: "Pembuat Deck", icon: "🧱" },
  { id: "backup", label: "Cadangkan", icon: "💾" },
];

function parseList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function SettingsClient() {
  const data = usePlatformData();
  const unlocked = useUnlocked();
  const cloud = useCloudStatus();
  const [tab, setTab] = useState<Tab>("students");
  const [toast, setToast] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  // --- Gerbang PIN ---
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [teacherAuth, setTeacherAuth] = useState<"unknown" | "yes" | "no">("unknown");
  const [cloudBusy, setCloudBusy] = useState(false);

  useEffect(() => {
    initSync();
    let active = true;
    void apiGet<{ teacher: boolean }>("/api/auth").then((res) => {
      if (!active) return;
      setTeacherAuth(res.ok && res.data?.teacher ? "yes" : "no");
    });
    return () => {
      active = false;
    };
  }, []);

  const tryUnlock = async () => {
    const entered = pinInput.trim();
    if (entered === getPin()) {
      markUnlocked();
      setPinInput("");
      setPinError(false);
      // Buka juga sesi cloud (untuk endpoint yang butuh login guru).
      const res = await apiPost("/api/auth", { pin: entered });
      setTeacherAuth(res.ok ? "yes" : "no");
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  const doLock = async () => {
    lockNow();
    await apiDelete("/api/auth");
    setTeacherAuth("no");
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  /** Tarik data siswa dari cloud ke perangkat ini. */
  const pullFromCloud = async () => {
    setCloudBusy(true);
    const result = await syncStudents();
    setCloudBusy(false);
    if (result === "pulled") flash("Data siswa ditarik dari cloud.");
    else if (result === "pushed") flash("Cloud kosong — data lokal diunggah ke cloud.");
    else flash("Cloud belum aktif. Data lokal tetap dipakai.");
  };

  /** Unggah data siswa perangkat ini ke cloud (timpa daftar cloud). */
  const pushToCloud = async () => {
    if (!teacherAuth || teacherAuth === "no") {
      flash("Butuh login guru untuk mengunggah ke cloud.");
      return;
    }
    setCloudBusy(true);
    const okPush = await pushStudents(data.students);
    setCloudBusy(false);
    flash(okPush ? "Data siswa diunggah ke cloud." : "Gagal mengunggah (cloud belum aktif).");
  };

  // --- Siswa ---
  const [studentDraft, setStudentDraft] = useState<string>("");
  const [sentenceDraft, setSentenceDraft] = useState<string | null>(null);
  const [wordDraft, setWordDraft] = useState<Record<string, string>>({});

  const applyStudentsFromText = () => {
    // format: NISN,Nama,Nilai per baris
    const rows = studentDraft
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: Student[] = [];
    for (const row of rows) {
      const parts = row.split(",").map((p) => p.trim());
      if (parts.length >= 3) {
        const nilai = Number(parts[2]);
        if (parts[0] && parts[1] && !Number.isNaN(nilai)) {
          parsed.push({ nisn: parts[0], nama: parts[1], total_nilai: nilai });
        }
      }
    }
    if (parsed.length === 0) {
      flash("Format salah. Gunakan: NISN,Nama,Nilai per baris.");
      return;
    }
    updatePlatformData({ students: parsed });
    flash(`${parsed.length} siswa disimpan.`);
    // Bila cloud aktif & guru sudah login, kirim juga ke server.
    if (cloud.configured && teacherAuth === "yes") {
      void pushStudents(parsed).then((okPush) => {
        if (okPush) flash(`${parsed.length} siswa disimpan & diunggah ke cloud.`);
      });
    }
  };

  const studentsToText = () =>
    data.students.map((s) => `${s.nisn},${s.nama},${s.total_nilai}`).join("\n");

  // --- Soal grammar ---
  const [qDraft, setQDraft] = useState<string>("");

  const questionsToText = () =>
    data.questions
      .map((q) => `${q.q} | ${q.opts[0]} | ${q.opts[1]} | ${q.ans === 0 ? 1 : 2}`)
      .join("\n");

  const applyQuestionsFromText = () => {
    const rows = qDraft
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: ContinuousQuestion[] = [];
    for (const row of rows) {
      const parts = row.split("|").map((p) => p.trim());
      if (parts.length >= 4) {
        const ansNum = Number(parts[3]);
        if (parts[0] && parts[1] && parts[2] && (ansNum === 1 || ansNum === 2)) {
          parsed.push({
            q: parts[0],
            opts: [parts[1], parts[2]],
            ans: ansNum === 1 ? 0 : 1,
          });
        }
      }
    }
    if (parsed.length === 0) {
      flash("Format salah. Gunakan: SOAL | OPSI1 | OPSI2 | JAWABAN(1/2)");
      return;
    }
    updatePlatformData({ questions: parsed });
    flash(`${parsed.length} soal disimpan.`);
  };

  // --- Kosakata (Vocabulary Match) ---
  const [vocabDraft, setVocabDraft] = useState<string | null>(null);

  const vocabToText = () =>
    data.vocab.map((v) => `${v.en} = ${v.id} [${v.category}]`).join("\n");

  const applyVocabFromText = () => {
    const rows = (vocabDraft ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed: VocabPair[] = [];
    for (const row of rows) {
      const catMatch = row.match(/\[(.+?)\]\s*$/);
      const cat = catMatch ? catMatch[1].trim() : "Umum";
      const body = catMatch ? row.slice(0, catMatch.index).trim() : row;
      const parts = body.split("=").map((p) => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        parsed.push({ en: parts[0], id: parts[1], category: cat });
      }
    }
    if (parsed.length === 0) {
      flash("Format salah. Gunakan: english = indonesia [Kategori]");
      return;
    }
    updatePlatformData({ vocab: parsed });
    setVocabDraft(null);
    flash(`${parsed.length} kosakata disimpan.`);
  };

  const doExport = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `battle-learning-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash("Data diekspor.");
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importData(String(reader.result));
      flash(ok ? "Data berhasil diimpor." : "File tidak valid.");
    };
    reader.readAsText(file);
  };

  const inputCls =
    "w-full rounded-xl border-2 border-line bg-ink-soft p-3 font-mono text-sm text-white outline-none focus:border-gold";
  const btnCls =
    "focus-ring cursor-pointer rounded-xl px-5 py-2.5 font-bold transition-colors";

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="focus-ring flex items-center gap-2 rounded-xl border border-line bg-white/5 px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-white/40 hover:text-white"
          >
            ← Menu
          </Link>
          <div>
            <h1 className="font-display text-3xl text-white sm:text-4xl">
              ⚙️ Panel Guru
            </h1>
            <p className="text-sm text-muted">
              Kelola data siswa & bank soal. Perubahan langsung dipakai di semua game.
            </p>
          </div>
        </div>
        {unlocked ? (
          <button
            type="button"
            onClick={doLock}
            className="focus-ring cursor-pointer rounded-xl border border-line bg-white/5 px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-red/50 hover:text-red"
          >
            🔒 Kunci
          </button>
        ) : null}
      </header>

      {!unlocked ? (
        <div className="panel mx-auto max-w-md p-8 text-center">
          <div className="mb-3 text-5xl">🔐</div>
          <h2 className="font-display text-2xl text-white">Panel Guru Terkunci</h2>
          <p className="mt-1 mb-6 text-sm text-muted">
            Masukkan PIN untuk mengelola data. (PIN bawaan: <b>1234</b>)
          </p>
          <input
            type="password"
            inputMode="numeric"
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value);
              setPinError(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
            placeholder="• • • •"
            autoFocus
            className={`focus-ring mb-3 w-full rounded-xl border-2 bg-ink-soft px-5 py-3 text-center text-2xl tracking-[0.5em] text-white outline-none ${
              pinError ? "border-red" : "border-line focus:border-gold"
            }`}
          />
          {pinError ? (
            <p className="mb-3 text-sm font-semibold text-red">PIN salah, coba lagi.</p>
          ) : null}
          <button
            type="button"
            onClick={tryUnlock}
            className="focus-ring w-full cursor-pointer rounded-xl bg-green px-5 py-3 text-lg font-bold text-ink transition-transform active:scale-95"
          >
            Buka Panel
          </button>
        </div>
      ) : (
        <>
      <nav className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`focus-ring cursor-pointer rounded-xl border-2 px-4 py-2.5 font-semibold transition-all ${
              tab === t.id
                ? "border-gold bg-gold text-ink"
                : "border-line bg-white/5 text-muted hover:border-white/40 hover:text-white"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      <div className="panel p-6 sm:p-8">
        {tab === "students" ? (
          <section>
            {/* Fase 1.5/1.8 — status cloud + sinkronisasi siswa */}
            <div
              className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
                cloud.configured
                  ? "border-green/40 bg-green/5"
                  : "border-line bg-ink-soft"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    cloud.configured
                      ? cloud.online
                        ? "animate-pulse-soft bg-green"
                        : "bg-gold"
                      : "bg-muted"
                  }`}
                />
                <div>
                  <p className="text-sm font-bold text-white">
                    {cloud.configured ? "Cloud Aktif" : "Mode Lokal"}
                  </p>
                  <p className="text-xs text-muted">{cloud.message}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={cloudBusy}
                  onClick={pullFromCloud}
                  className={`${btnCls} bg-blue text-ink disabled:opacity-50`}
                >
                  ⬇️ Tarik dari Cloud
                </button>
                <button
                  type="button"
                  disabled={cloudBusy}
                  onClick={pushToCloud}
                  className={`${btnCls} bg-violet text-ink disabled:opacity-50`}
                >
                  ⬆️ Unggah ke Cloud
                </button>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-white">Data Siswa</h2>
                <p className="text-sm text-muted">
                  Total tersimpan: {data.students.length} siswa
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStudentDraft(studentsToText())}
                  className={`${btnCls} bg-white/10 text-white hover:bg-white/20`}
                >
                  Muat Data Saat Ini
                </button>
              </div>
            </div>
            <p className="mb-2 text-sm text-muted">
              Satu siswa per baris, format:{" "}
              <code className="rounded bg-ink-soft px-1.5 py-0.5 text-gold">
                NISN,Nama,Nilai
              </code>
            </p>
            <textarea
              value={studentDraft}
              onChange={(e) => setStudentDraft(e.target.value)}
              placeholder="0091234501,Adinda Putri,1288"
              className={`${inputCls} h-72`}
            />
            <button
              type="button"
              onClick={applyStudentsFromText}
              className={`${btnCls} mt-3 bg-green text-ink`}
            >
              💾 Simpan Data Siswa
            </button>
          </section>
        ) : null}

        {tab === "sentences" ? (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-white">Bank Kalimat</h2>
                <p className="text-sm text-muted">
                  Untuk game Sentence Battle. Pisahkan dengan tanda{" "}
                  <code className="text-gold">|</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSentenceDraft(data.sentences)}
                className={`${btnCls} bg-white/10 text-white hover:bg-white/20`}
              >
                Muat ke Editor
              </button>
            </div>
            <textarea
              value={sentenceDraft ?? data.sentences}
              onChange={(e) => setSentenceDraft(e.target.value)}
              className={`${inputCls} h-72`}
            />
            <button
              type="button"
              onClick={() => {
                const val = sentenceDraft ?? data.sentences;
                if (val.trim().length === 0) {
                  flash("Bank kalimat tidak boleh kosong.");
                  return;
                }
                updatePlatformData({ sentences: val });
                flash("Bank kalimat disimpan.");
              }}
              className={`${btnCls} mt-3 bg-green text-ink`}
            >
              💾 Simpan Bank Kalimat
            </button>
          </section>
        ) : null}

        {tab === "questions" ? (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-white">Soal Grammar</h2>
                <p className="text-sm text-muted">
                  Untuk game Continuous Battle. Total: {data.questions.length} soal
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQDraft(questionsToText())}
                className={`${btnCls} bg-white/10 text-white hover:bg-white/20`}
              >
                Muat Soal Saat Ini
              </button>
            </div>
            <p className="mb-2 text-sm text-muted">
              Satu soal per baris:{" "}
              <code className="rounded bg-ink-soft px-1.5 py-0.5 text-gold">
                SOAL | OPSI1 | OPSI2 | JAWABAN(1/2)
              </code>
            </p>
            <textarea
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder="SHE ___ READING | IS | ARE | 1"
              className={`${inputCls} h-72`}
            />
            <button
              type="button"
              onClick={applyQuestionsFromText}
              className={`${btnCls} mt-3 bg-green text-ink`}
            >
              💾 Simpan Soal Grammar
            </button>
          </section>
        ) : null}

        {tab === "vocab" ? (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-white">Kosakata</h2>
                <p className="text-sm text-muted">
                  Untuk game Vocabulary Match. Total: {data.vocab.length} kata
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVocabDraft(vocabToText())}
                className={`${btnCls} bg-white/10 text-white hover:bg-white/20`}
              >
                Muat Kosakata Saat Ini
              </button>
            </div>
            <p className="mb-2 text-sm text-muted">
              Satu kata per baris:{" "}
              <code className="rounded bg-ink-soft px-1.5 py-0.5 text-gold">
                english = indonesia [Kategori]
              </code>
              . Kategori opsional (default: Umum); kata dengan kategori sama akan saling
              jadi pilihan pengecoh.
            </p>
            <textarea
              value={vocabDraft ?? vocabToText()}
              onChange={(e) => setVocabDraft(e.target.value)}
              placeholder="cat = Kucing [Hewan]"
              className={`${inputCls} h-80`}
            />
            <button
              type="button"
              onClick={applyVocabFromText}
              className={`${btnCls} mt-3 bg-green text-ink`}
            >
              💾 Simpan Kosakata
            </button>
          </section>
        ) : null}

        {tab === "words" ? (
          <section className="space-y-6">
            <h2 className="font-display text-2xl text-white">Bank Kata</h2>
            <p className="-mt-4 text-sm text-muted">
              Untuk game Word Battle & Spelling Battle. Pisahkan dengan koma atau baris baru.
            </p>

            {(
              [
                { key: "nouns", label: "Noun (Kata Benda)", color: "text-blue" },
                { key: "verbs", label: "Verb (Kata Kerja)", color: "text-red" },
                { key: "adjectives", label: "Adjective (Kata Sifat)", color: "text-gold" },
                { key: "animals", label: "Animals (Spelling Battle)", color: "text-green" },
              ] as const
            ).map(({ key, label, color }) => (
              <div key={key}>
                <label className={`mb-2 block font-bold ${color}`}>
                  {label} · {data[key].length} kata
                </label>
                <textarea
                  value={wordDraft[key] ?? data[key].join(", ")}
                  onChange={(e) =>
                    setWordDraft((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className={`${inputCls} h-32`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = wordDraft[key] ?? data[key].join(", ");
                    const list = parseList(val);
                    if (list.length === 0) {
                      flash("Daftar kata tidak boleh kosong.");
                      return;
                    }
                    updatePlatformData({ [key]: list } as never);
                    setWordDraft((prev) => {
                      const next = { ...prev };
                      delete next[key];
                      return next;
                    });
                    flash(`${label}: ${list.length} kata disimpan.`);
                  }}
                  className={`${btnCls} mt-2 bg-green text-ink`}
                >
                  💾 Simpan {label.split(" ")[0]}
                </button>
              </div>
            ))}
          </section>
        ) : null}

        {tab === "import" ? (
          <ImportWizard
            onFlash={flash}
            onCloudConfigured={cloud.configured}
            teacherAuth={teacherAuth}
          />
        ) : null}

        {tab === "decks" ? <DeckBuilder onFlash={flash} /> : null}

        {tab === "backup" ? (
          <section className="space-y-6">
            <h2 className="font-display text-2xl text-white">Cadangkan & Pulihkan</h2>
            <p className="-mt-4 text-sm text-muted">
              Semua data guru disimpan di browser (localStorage). Gunakan cadangan untuk
              memindahkan ke perangkat/papan lain.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={doExport}
                className={`${btnCls} bg-blue text-ink`}
              >
                ⬇️ Ekspor ke JSON
              </button>
              <button
                type="button"
                onClick={() => importRef.current?.click()}
                className={`${btnCls} bg-gold text-ink`}
              >
                ⬆️ Impor dari JSON
              </button>
              <input
                ref={importRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) doImport(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (confirm("Kembalikan semua data ke bawaan? Perubahan akan hilang.")) {
                    resetPlatformData();
                    flash("Data dikembalikan ke bawaan.");
                  }
                }}
                className={`${btnCls} bg-red-deep text-white`}
              >
                ♻️ Reset ke Bawaan
              </button>
            </div>

            <div className="rounded-xl border border-line bg-ink-soft p-4 text-sm text-muted">
              <p>
                Ringkasan: <b className="text-white">{data.students.length}</b> siswa ·{" "}
                <b className="text-white">{data.questions.length}</b> soal grammar ·{" "}
                <b className="text-white">
                  {data.sentences.split("|").filter(Boolean).length}
                </b>{" "}
                kalimat ·{" "}
                <b className="text-white">
                  {data.nouns.length + data.verbs.length + data.adjectives.length}
                </b>{" "}
                kata klasifikasi · <b className="text-white">{data.animals.length}</b> hewan
                · <b className="text-white">{data.vocab.length}</b> kosakata
              </p>
              <p className="mt-2">
                Bawaan: {defaultData.students.length} siswa ·{" "}
                {defaultData.questions.length} soal
              </p>
            </div>

            <div className="rounded-xl border border-line bg-ink-soft p-4">
              <h3 className="mb-2 font-display text-xl text-white">🔑 Ganti PIN Panel</h3>
              <p className="mb-3 text-sm text-muted">
                PIN dipakai untuk membuka Panel Guru. Bawaan: <b>1234</b>.
              </p>
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="PIN baru (min. 4 angka)"
                  className={`${inputCls} max-w-xs`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const clean = newPin.trim();
                    if (clean.length < 4) {
                      flash("PIN minimal 4 karakter.");
                      return;
                    }
                    setPin(clean);
                    setNewPin("");
                    flash("PIN berhasil diubah.");
                  }}
                  className={`${btnCls} bg-blue text-ink`}
                >
                  Simpan PIN
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
        </>
      )}

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-pop rounded-2xl border border-green bg-green/20 px-6 py-3 font-bold text-green backdrop-blur">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
