"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePlatformData } from "@/lib/store";
import { getPin, useUnlocked, markUnlocked, lockNow } from "@/lib/pin";
import { apiDelete, apiGet, apiPost, useCloudStatus, initSync } from "@/lib/sync";
import { ImportWizard } from "./ImportWizard";
import { DeckBuilder } from "./DeckBuilder";
import { StudentsTab } from "./tabs/StudentsTab";
import { QuestionsTab, SentencesTab, VocabTab } from "./tabs/ContentTabs";
import { WordsTab } from "./tabs/WordsTab";
import { BackupTab } from "./tabs/BackupTab";

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

export default function SettingsClient() {
  const data = usePlatformData();
  const unlocked = useUnlocked();
  const cloud = useCloudStatus();
  const [tab, setTab] = useState<Tab>("students");
  const [toast, setToast] = useState<string | null>(null);

  // --- Gerbang PIN ---
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [teacherAuth, setTeacherAuth] = useState<"unknown" | "yes" | "no">("unknown");

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
            <h1 className="font-display text-3xl text-white sm:text-4xl">⚙️ Panel Guru</h1>
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
        <PinGate
          pinInput={pinInput}
          setPinInput={setPinInput}
          pinError={pinError}
          setPinError={setPinError}
          onUnlock={tryUnlock}
        />
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
            {tab === "students" ? <StudentsTab flash={flash} teacherAuth={teacherAuth} /> : null}
            {tab === "sentences" ? <SentencesTab flash={flash} /> : null}
            {tab === "questions" ? <QuestionsTab flash={flash} /> : null}
            {tab === "vocab" ? <VocabTab flash={flash} /> : null}
            {tab === "words" ? <WordsTab flash={flash} /> : null}
            {tab === "import" ? (
              <ImportWizard
                onFlash={flash}
                onCloudConfigured={cloud.configured}
                teacherAuth={teacherAuth}
              />
            ) : null}
            {tab === "decks" ? <DeckBuilder onFlash={flash} /> : null}
            {tab === "backup" ? <BackupTab flash={flash} /> : null}
          </div>

          <p className="mt-4 text-center text-xs text-muted">
            Data tersimpan lokal: {data.students.length} siswa · {data.vocab.length} kosakata ·{" "}
            {data.questions.length} soal grammar
          </p>
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

/** Gerbang PIN Panel Guru. */
function PinGate({
  pinInput,
  setPinInput,
  pinError,
  setPinError,
  onUnlock,
}: {
  pinInput: string;
  setPinInput: (v: string) => void;
  pinError: boolean;
  setPinError: (v: boolean) => void;
  onUnlock: () => void;
}) {
  return (
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
        onKeyDown={(e) => e.key === "Enter" && onUnlock()}
        placeholder="• • • •"
        autoFocus
        aria-label="PIN guru"
        className={`focus-ring mb-3 w-full rounded-xl border-2 bg-ink-soft px-5 py-3 text-center text-2xl tracking-[0.5em] text-white outline-none ${
          pinError ? "border-red" : "border-line focus:border-gold"
        }`}
      />
      {pinError ? (
        <p className="mb-3 text-sm font-semibold text-red">PIN salah, coba lagi.</p>
      ) : null}
      <button
        type="button"
        onClick={onUnlock}
        className="focus-ring w-full cursor-pointer rounded-xl bg-green px-5 py-3 text-lg font-bold text-ink transition-transform active:scale-95"
      >
        Buka Panel
      </button>
    </div>
  );
}
