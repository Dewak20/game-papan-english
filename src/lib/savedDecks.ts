"use client";

import { useSyncExternalStore } from "react";
import type { BuiltDeck } from "./deckBuilder";

/**
 * Store kecil untuk "deck tersimpan" (localStorage) memakai `useSyncExternalStore`
 * agar reaktif dan bebas dari setState-di-dalam-effect.
 */

const DECKS_KEY = "blp:decks:v1";
const EMPTY: BuiltDeck[] = [];

let snapshot: BuiltDeck[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function load(): BuiltDeck[] {
  if (typeof window === "undefined") return EMPTY;
  if (loaded) return snapshot;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(DECKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) snapshot = parsed as BuiltDeck[];
    }
  } catch {
    snapshot = EMPTY;
  }
  return snapshot;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getServerSnapshot(): BuiltDeck[] {
  return EMPTY;
}

/** Hook reaktif daftar deck tersimpan. */
export function useSavedDecks(): BuiltDeck[] {
  return useSyncExternalStore(subscribe, load, getServerSnapshot);
}

/** Simpan (menimpa bila judul sama) dan kembalikan daftar baru. */
export function saveDeck(deck: BuiltDeck): BuiltDeck[] {
  const next = [deck, ...load().filter((d) => d.title !== deck.title)].slice(0, 30);
  snapshot = next;
  loaded = true;
  try {
    window.localStorage.setItem(DECKS_KEY, JSON.stringify(next));
  } catch {
    /* abaikan */
  }
  emit();
  return next;
}

/** Hapus deck berdasarkan judul. */
export function removeDeck(title: string): void {
  const next = load().filter((d) => d.title !== title);
  snapshot = next;
  loaded = true;
  try {
    window.localStorage.setItem(DECKS_KEY, JSON.stringify(next));
  } catch {
    /* abaikan */
  }
  emit();
}
