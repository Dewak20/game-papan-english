"use client";

import { useEffect, useRef } from "react";
import type { TeamSide } from "./types";

/**
 * Pemetaan tombol papan tombol (keyboard) ke pilihan per tim.
 *
 * Dua tim berbagi satu papan tombol di papan besar kelas:
 *   - Tim BLUE  → angka kiri   : `1` `2` `3` `4`
 *   - Tim RED   → angka kanan  : `7` `8` `9` `0`
 *
 * Untuk mode latihan mandiri (solo), hanya pemetaan BLUE yang dipakai dan
 * tim selalu `"blue"`.
 */
export const BUZZER_KEYS: Record<TeamSide, string[]> = {
  blue: ["1", "2", "3", "4"],
  red: ["7", "8", "9", "0"],
};

/** Kunci angka alternatif di baris atas (numpad tetap sama karena `event.key`). */
const BLUE_ALIAS: Record<string, number> = {
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
};
const RED_ALIAS: Record<string, number> = {
  "7": 0,
  "8": 1,
  "9": 2,
  "0": 3,
};

interface UseKeyboardChoicesOptions {
  /** Aktifkan listener hanya saat permainan berjalan. */
  enabled: boolean;
  /** Duel 2 tim (true) atau latihan mandiri (false). */
  solo: boolean;
  /** Dipanggil saat sebuah tombol pilihan ditekan. */
  onChoice: (side: TeamSide, choice: number) => void;
  /** Jumlah pilihan yang tersedia (default 4). */
  optionCount?: number;
}

/** Apakah fokus sedang di elemen input/teks (agar tidak mencuri ketikan). */
function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/**
 * Hook "buzzer keyboard": host dapat menekan angka untuk tim BLUE / RED
 * tanpa menyentuh mouse — praktis saat memandu permainan di papan besar.
 *
 * Aman terhadap: fokus input, tombol modifier (Ctrl/Alt/Meta), dan
 * penekanan berulang (key repeat) saat tombol ditahan.
 */
export function useKeyboardChoices({
  enabled,
  solo,
  onChoice,
  optionCount = 4,
}: UseKeyboardChoicesOptions) {
  // Simpan handler terbaru tanpa memasang ulang listener.
  const handlerRef = useRef(onChoice);

  useEffect(() => {
    handlerRef.current = onChoice;
  }, [onChoice]);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (isTypingTarget(e.target)) return;

      const key = e.key;

      const blue = BLUE_ALIAS[key];
      if (blue !== undefined && blue < optionCount) {
        e.preventDefault();
        handlerRef.current("blue", blue);
        return;
      }

      if (!solo) {
        const red = RED_ALIAS[key];
        if (red !== undefined && red < optionCount) {
          e.preventDefault();
          handlerRef.current("red", red);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, solo, optionCount]);
}
