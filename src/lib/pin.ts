"use client";

import { useSyncExternalStore } from "react";

const PIN_KEY = "blp:pin";
const OK_KEY = "blp:pin-ok";
const DEFAULT_PIN = "1234";

/** PIN aktif (default "1234" bila belum pernah diubah). */
export function getPin(): string {
  if (typeof window === "undefined") return DEFAULT_PIN;
  try {
    return window.localStorage.getItem(PIN_KEY) ?? DEFAULT_PIN;
  } catch {
    return DEFAULT_PIN;
  }
}

export function setPin(pin: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PIN_KEY, pin);
  } catch {
    /* abaikan */
  }
}

/* ---- Status "terbuka" per-tab (sessionStorage) sebagai external store ---- */

let unlockedSnapshot = false;
let loadedUnlocked = false;
const unlockListeners = new Set<() => void>();

function emitUnlock() {
  unlockListeners.forEach((l) => l());
}

function loadUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  if (loadedUnlocked) return unlockedSnapshot;
  loadedUnlocked = true;
  try {
    unlockedSnapshot = window.sessionStorage.getItem(OK_KEY) === "1";
  } catch {
    unlockedSnapshot = false;
  }
  return unlockedSnapshot;
}

function subscribeUnlock(cb: () => void) {
  unlockListeners.add(cb);
  return () => {
    unlockListeners.delete(cb);
  };
}

/** Hook reaktif: apakah Panel Guru sudah dibuka di sesi ini? */
export function useUnlocked(): boolean {
  return useSyncExternalStore(subscribeUnlock, loadUnlocked, () => false);
}

export function markUnlocked() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(OK_KEY, "1");
  } catch {
    /* abaikan */
  }
  unlockedSnapshot = true;
  loadedUnlocked = true;
  emitUnlock();
}

export function lockNow() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(OK_KEY);
  } catch {
    /* abaikan */
  }
  unlockedSnapshot = false;
  loadedUnlocked = true;
  emitUnlock();
}
