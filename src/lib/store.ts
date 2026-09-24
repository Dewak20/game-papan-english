"use client";

import { useSyncExternalStore } from "react";
import type { ContinuousQuestion, Student } from "./types";
import { students as defaultStudents } from "./students";
import { defaultSentences } from "./sentences";
import { continuousQuestions as defaultQuestions } from "./questions";
import { nouns, verbs, adjectives, animalWords } from "./words";
import { vocabPairs, type VocabPair } from "./vocabulary";
import { apiGet, apiPost } from "./sync";

/**
 * Store terpusat berbasis localStorage.
 * Semua konten yang bisa diedit guru (siswa, kalimat, soal, kata)
 * dibaca dari sini, sehingga perubahan di /settings langsung terpakai
 * oleh seluruh game — tanpa perlu build ulang.
 */
export interface PlatformData {
  students: Student[];
  sentences: string;
  questions: ContinuousQuestion[];
  nouns: string[];
  verbs: string[];
  adjectives: string[];
  animals: string[];
  vocab: VocabPair[];
}

export const defaultData: PlatformData = {
  students: defaultStudents,
  sentences: defaultSentences,
  questions: defaultQuestions,
  nouns,
  verbs,
  adjectives,
  animals: animalWords,
  vocab: vocabPairs,
};

const STORAGE_KEY = "blp:data:v1";

let snapshot: PlatformData = defaultData;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function load(): PlatformData {
  if (typeof window === "undefined") return defaultData;
  if (loaded) return snapshot;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlatformData>;
      snapshot = { ...defaultData, ...parsed };
    }
  } catch {
    snapshot = defaultData;
  }
  return snapshot;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): PlatformData {
  return load();
}

function getServerSnapshot(): PlatformData {
  return defaultData;
}

export function usePlatformData(): PlatformData {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setPlatformData(next: PlatformData) {
  snapshot = next;
  loaded = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage penuh / diblokir — abaikan */
  }
  emit();
}

export function updatePlatformData(patch: Partial<PlatformData>) {
  setPlatformData({ ...snapshot, ...patch });
}

export function resetPlatformData() {
  snapshot = defaultData;
  loaded = true;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* abaikan */
  }
  emit();
}

export function exportData(): string {
  return JSON.stringify(load(), null, 2);
}

export function importData(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as Partial<PlatformData>;
    setPlatformData({ ...defaultData, ...parsed });
    return true;
  } catch {
    return false;
  }
}

/* ==================== Sinkronisasi cloud (Fase 1.5) ==================== */
/*
 * localStorage tetap sumber kebenaran. Fungsi di bawah ini bersifat
 * *additif*: bila server punya database, daftar siswa lokal diunggah &
 * ditarik dari cloud; bila tidak, semua tetap berjalan lokal tanpa error.
 */

interface CloudStudent {
  nisn: string;
  nama: string;
  total_nilai: number;
}

/** Tandai apakah daftar siswa lokal sudah pernah disinkronkan ke cloud. */
const SYNCED_KEY = "blp:students-synced";

function markSynced() {
  try {
    window.localStorage.setItem(SYNCED_KEY, "1");
  } catch {
    /* abaikan */
  }
}

/** Sudah pernah unggah siswa lokal ke cloud? */
export function studentsSynced(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SYNCED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Unggah daftar siswa lokal ke cloud (dipakai tombol "Unggah Data Lokal"
 * di /admin dan saat simpan di Panel Guru). Server mengganti seluruh daftar.
 */
export async function pushStudents(list: Student[]): Promise<boolean> {
  const res = await apiPost<{ count: number }>("/api/students", { students: list });
  if (res.ok) markSynced();
  return res.ok;
}

/**
 * Tarik daftar siswa dari cloud. Mengembalikan `null` bila server belum
 * punya database atau permintaan gagal — pemanggil harus mempertahankan
 * data lokal apa adanya.
 */
export async function pullStudents(): Promise<Student[] | null> {
  const res = await apiGet<CloudStudent[]>("/api/students");
  if (!res.ok || !Array.isArray(res.data)) return null;
  return res.data.map((s) => ({
    nisn: s.nisn,
    nama: s.nama,
    total_nilai: s.total_nilai,
  }));
}

/**
 * Sinkronisasi dua arah sederhana:
 *  - Bila cloud masih kosong → unggah data lokal (migrasi sekali).
 *  - Bila cloud sudah punya data → pakai data cloud sebagai sumber.
 * Aman dipanggil berulang; tidak pernah menimpa data lokal saat offline.
 */
export async function syncStudents(): Promise<"pushed" | "pulled" | "none"> {
  if (typeof window === "undefined") return "none";

  const cloud = await pullStudents();
  if (cloud === null) return "none";

  if (cloud.length === 0) {
    const local = load();
    if (local.students.length === 0) return "none";
    const okPush = await pushStudents(local.students);
    return okPush ? "pushed" : "none";
  }

  setPlatformData({ ...load(), students: cloud });
  return "pulled";
}
