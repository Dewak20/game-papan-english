"use client";

import { useSyncExternalStore } from "react";

/** Pengaturan audio global (efek suara & musik latar), disimpan di localStorage. */
export interface AudioSettings {
  sfx: boolean;
  music: boolean;
}

const KEY = "blp:audio:v1";
const DEFAULT: AudioSettings = { sfx: true, music: true };

let snapshot: AudioSettings = DEFAULT;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function load(): AudioSettings {
  if (typeof window === "undefined") return DEFAULT;
  if (loaded) return snapshot;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) snapshot = { ...DEFAULT, ...(JSON.parse(raw) as Partial<AudioSettings>) };
  } catch {
    snapshot = DEFAULT;
  }
  return snapshot;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Hook reaktif pengaturan audio. */
export function useAudioSettings(): AudioSettings {
  return useSyncExternalStore(subscribe, load, () => DEFAULT);
}

export function setAudioSettings(patch: Partial<AudioSettings>) {
  snapshot = { ...snapshot, ...patch };
  loaded = true;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* abaikan */
  }
  emit();
}

export function toggleSfx() {
  setAudioSettings({ sfx: !load().sfx });
}

export function toggleMusic() {
  setAudioSettings({ music: !load().music });
}

/** Cek cepat (non-reaktif) — dipakai di dalam handler suara. */
export function isSfxEnabled(): boolean {
  return load().sfx;
}

export function isMusicEnabled(): boolean {
  return load().music;
}
