"use client";

import { useCallback } from "react";
import { getAudioCtx } from "./audio";
import { isSfxEnabled } from "./audioSettings";

export type SoundType =
  | "correct"
  | "wrong"
  | "countdown"
  | "go"
  | "type"
  | "hint"
  | "win"
  | "finish"
  | "coin"
  | "combo"
  | "lose"
  | "tick";

interface Note {
  /** frekuensi (Hz) */
  f: number;
  /** waktu mulai relatif (detik) */
  at: number;
  /** durasi (detik) */
  dur: number;
  /** tipe gelombang */
  type?: OscillatorType;
  /** volume */
  vol?: number;
}

/**
 * Sistem suara berbasis Web Audio API (tanpa file audio).
 * Setiap efek adalah rangkaian nada (arpeggio) agar terdengar lebih hidup.
 * Memakai satu AudioContext bersama (lihat lib/audio.ts) dan menghormati
 * pengaturan "efek suara" di lib/audioSettings.ts.
 */
const RECIPES: Record<SoundType, Note[]> = {
  correct: [
    { f: 660, at: 0, dur: 0.09, type: "triangle", vol: 0.28 },
    { f: 990, at: 0.07, dur: 0.16, type: "sine", vol: 0.26 },
  ],
  wrong: [
    { f: 220, at: 0, dur: 0.12, type: "sawtooth", vol: 0.24 },
    { f: 160, at: 0.1, dur: 0.2, type: "sawtooth", vol: 0.22 },
  ],
  countdown: [{ f: 520, at: 0, dur: 0.1, type: "square", vol: 0.12 }],
  go: [
    { f: 660, at: 0, dur: 0.1, type: "square", vol: 0.14 },
    { f: 990, at: 0.09, dur: 0.3, type: "square", vol: 0.14 },
  ],
  type: [{ f: 340, at: 0, dur: 0.05, type: "triangle", vol: 0.05 }],
  hint: [
    { f: 880, at: 0, dur: 0.08, type: "sine", vol: 0.12 },
    { f: 1320, at: 0.07, dur: 0.1, type: "sine", vol: 0.1 },
  ],
  win: [
    { f: 523, at: 0, dur: 0.1, type: "square", vol: 0.14 },
    { f: 659, at: 0.09, dur: 0.1, type: "square", vol: 0.14 },
    { f: 784, at: 0.18, dur: 0.16, type: "square", vol: 0.14 },
  ],
  finish: [
    { f: 523, at: 0, dur: 0.14, type: "sine", vol: 0.18 },
    { f: 659, at: 0.14, dur: 0.14, type: "sine", vol: 0.18 },
    { f: 784, at: 0.28, dur: 0.14, type: "sine", vol: 0.18 },
    { f: 1046, at: 0.42, dur: 0.42, type: "sine", vol: 0.2 },
  ],
  coin: [
    { f: 988, at: 0, dur: 0.06, type: "square", vol: 0.16 },
    { f: 1319, at: 0.05, dur: 0.16, type: "square", vol: 0.14 },
  ],
  combo: [
    { f: 880, at: 0, dur: 0.06, type: "triangle", vol: 0.18 },
    { f: 1175, at: 0.05, dur: 0.06, type: "triangle", vol: 0.18 },
    { f: 1568, at: 0.1, dur: 0.14, type: "triangle", vol: 0.18 },
  ],
  lose: [
    { f: 392, at: 0, dur: 0.16, type: "sine", vol: 0.18 },
    { f: 311, at: 0.16, dur: 0.18, type: "sine", vol: 0.18 },
    { f: 233, at: 0.34, dur: 0.4, type: "sine", vol: 0.18 },
  ],
  tick: [{ f: 1200, at: 0, dur: 0.03, type: "square", vol: 0.06 }],
};

export function useSound() {
  const play = useCallback((type: SoundType) => {
    if (!isSfxEnabled()) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    const recipe = RECIPES[type];
    const base = ctx.currentTime;

    for (const note of recipe) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = base + note.at;
      const end = start + note.dur;
      osc.type = note.type ?? "sine";
      osc.frequency.setValueAtTime(note.f, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(note.vol ?? 0.2, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  }, []);

  return { play };
}
