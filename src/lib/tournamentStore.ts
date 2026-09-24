"use client";

import { useSyncExternalStore } from "react";
import {
  makeTournament,
  setMatchScore as setScoreOn,
  clearMatchScore as clearScoreOn,
  type TournamentState,
} from "./tournament";

/**
 * Store turnamen (localStorage) memakai `useSyncExternalStore` agar reaktif dan
 * bebas setState-di-dalam-effect. Satu turnamen aktif disimpan pada satu kunci.
 */

const KEY = "blp:tournament:v1";

let snapshot: TournamentState | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function load(): TournamentState | null {
  if (typeof window === "undefined") return null;
  if (loaded) return snapshot;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) snapshot = JSON.parse(raw) as TournamentState;
  } catch {
    snapshot = null;
  }
  return snapshot;
}

function persist(next: TournamentState | null) {
  snapshot = next;
  loaded = true;
  try {
    if (next) window.localStorage.setItem(KEY, JSON.stringify(next));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* abaikan */
  }
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Hook reaktif turnamen aktif (null bila belum ada). */
export function useTournament(): TournamentState | null {
  return useSyncExternalStore(subscribe, load, () => null);
}

/** Buat & simpan turnamen baru. */
export function createTournament(state: TournamentState): void {
  persist(state);
}

/** Bangun turnamen baru dari konfigurasi lalu simpan. */
export function startTournament(config: Parameters<typeof makeTournament>[0]): TournamentState {
  const state = makeTournament(config);
  persist(state);
  return state;
}

/** Perbarui skor satu laga. */
export function recordScore(matchId: string, homeScore: number, awayScore: number): void {
  const current = load();
  if (!current) return;
  persist(setScoreOn(current, matchId, homeScore, awayScore));
}

/** Kosongkan skor satu laga. */
export function clearScore(matchId: string): void {
  const current = load();
  if (!current) return;
  persist(clearScoreOn(current, matchId));
}

/** Hapus turnamen aktif. */
export function clearTournament(): void {
  persist(null);
}
