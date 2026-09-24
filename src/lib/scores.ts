"use client";

import { useSyncExternalStore } from "react";
import { queueResult } from "./sync";

/** Satu catatan skor dari sebuah sesi permainan. */
export interface ScoreEntry {
  id: string;
  /** slug game, mis. "word-battle" */
  game: string;
  /** nama pemain */
  player: string;
  score: number;
  /** ISO date */
  date: string;
}

const KEY = "blp:scores:v1";
const MAX_ENTRIES = 500;

let snapshot: ScoreEntry[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const EMPTY: ScoreEntry[] = [];

function emit() {
  listeners.forEach((l) => l());
}

function load(): ScoreEntry[] {
  if (typeof window === "undefined") return EMPTY;
  if (loaded) return snapshot;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ScoreEntry[];
      if (Array.isArray(parsed)) snapshot = parsed;
    }
  } catch {
    snapshot = [];
  }
  return snapshot;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useScores(): ScoreEntry[] {
  return useSyncExternalStore(subscribe, load, () => EMPTY);
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function saveScore(entry: {
  game: string;
  player: string;
  score: number;
}): ScoreEntry {
  const list = load();
  const newEntry: ScoreEntry = {
    id: makeId(),
    game: entry.game,
    player: entry.player.trim() || "Anonim",
    score: entry.score,
    date: new Date().toISOString(),
  };
  const next = [...list, newEntry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ENTRIES);
  snapshot = next;
  loaded = true;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* abaikan */
  }
  emit();

  // Titip ke cloud (offline-first): langsung dikirim bila online, jika tidak
  // masuk antrian dan otomatis terkirim saat kembali online.
  queueResult({
    id: newEntry.id,
    game: newEntry.game,
    player: newEntry.player,
    score: newEntry.score,
    date: newEntry.date,
  });

  return newEntry;
}

export function clearScores() {
  snapshot = [];
  loaded = true;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* abaikan */
  }
  emit();
}

/** Ambil peringkat teratas; bisa difilter per game. */
export function topScores(
  list: ScoreEntry[],
  game?: string,
  limit = 20,
): ScoreEntry[] {
  const filtered = game ? list.filter((s) => s.game === game) : list;
  return [...filtered].sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Gabungkan skor lokal + cloud tanpa duplikat (Fase 1.7).
 * Kunci dedup = `id`; server memakai `clientId` sebagai id, jadi entri yang
 * sudah tersinkron tidak muncul dua kali di papan peringkat.
 */
export function mergeScores(local: ScoreEntry[], cloud: ScoreEntry[]): ScoreEntry[] {
  const map = new Map<string, ScoreEntry>();
  for (const entry of [...local, ...cloud]) {
    if (!map.has(entry.id)) map.set(entry.id, entry);
  }
  return [...map.values()].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
}
