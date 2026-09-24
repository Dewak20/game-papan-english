"use client";

import { useState } from "react";
import { saveScore } from "@/lib/scores";

interface SaveScoreDialogProps {
  game: string;
  score: number;
  open: boolean;
  onClose: () => void;
  onSaved?: (player: string) => void;
}

const NAME_KEY = "blp:last-player";

/** Ambil nama terakhir yang dipakai (aman untuk SSR). */
function loadLastName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Dialog untuk menyimpan skor latihan mandiri ke papan peringkat. */
export function SaveScoreDialog({
  game,
  score,
  open,
  onClose,
  onSaved,
}: SaveScoreDialogProps) {
  const [name, setName] = useState("");
  const [wasOpen, setWasOpen] = useState(false);

  // Saat dialog baru dibuka, isi otomatis dengan nama terakhir yang dipakai.
  // (Pola resmi React: menyesuaikan state saat render, bukan di dalam effect.)
  if (open && !wasOpen) {
    setWasOpen(true);
    setName(loadLastName());
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  if (!open) return null;

  const handleSave = () => {
    const player = name.trim() || "Anonim";
    try {
      window.localStorage.setItem(NAME_KEY, player);
    } catch {
      /* abaikan */
    }
    saveScore({ game, player, score });
    onSaved?.(player);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md">
      <div className="panel w-full max-w-md p-8 text-center">
        <div className="mb-2 text-5xl">🎉</div>
        <h2 className="font-display text-3xl text-white">Skor Latihan</h2>
        <p className="mt-1 mb-6 text-muted">
          Skor kamu: <b className="font-display text-3xl text-gold">{score}</b>
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="Tulis namamu"
          autoFocus
          className="focus-ring mb-4 w-full rounded-xl border-2 border-line bg-ink-soft px-5 py-3 text-center text-lg text-white outline-none focus:border-gold"
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="focus-ring flex-1 cursor-pointer rounded-xl border-2 border-line bg-white/5 px-5 py-3 font-bold text-muted transition-colors hover:text-white"
          >
            Lewati
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="focus-ring flex-1 cursor-pointer rounded-xl bg-green px-5 py-3 font-bold text-ink transition-transform active:scale-95"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
