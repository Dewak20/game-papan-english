"use client";

import { useSyncExternalStore } from "react";

/**
 * Lapisan sinkronisasi cloud (Fase 1.5–1.7).
 *
 * Prinsip **offline-first**: localStorage tetap sumber kebenaran untuk UI.
 * Modul ini hanya "menitipkan" data ke server bila memungkinkan, dengan
 * antrian yang tahan putus koneksi (retry otomatis saat online).
 *
 * Bila server belum punya `DATABASE_URL`, seluruh endpoint mengembalikan 503
 * dan aplikasi tetap jalan penuh secara lokal — tanpa error di UI.
 */

const QUEUE_KEY = "blp:sync-queue:v1";
const LAST_SYNC_KEY = "blp:sync-last";

export type QueueKind = "result";

export interface SyncQueueItem {
  /** = clientId, unik → idempoten saat retry. */
  id: string;
  kind: QueueKind;
  payload: Record<string, unknown>;
  at: string;
}

/** Bentuk data skor yang dipertukarkan dengan `/api/results`. */
export interface ResultRow {
  id: string;
  game: string;
  player: string;
  score: number;
  date: string;
}

export interface CloudStatus {
  /** Sudah pernah memeriksa server? */
  probed: boolean;
  /** Server punya DATABASE_URL? */
  configured: boolean;
  /** Perangkat sedang online? */
  online: boolean;
  /** Jumlah data menunggu dikirim. */
  pending: number;
  /** ISO waktu sinkron terakhir yang berhasil. */
  lastSyncAt: string | null;
  /** Pesan ringkas siap tampil. */
  message: string;
}

const ENDPOINTS: Record<QueueKind, string> = {
  result: "/api/results",
};

const SERVER_STATUS: CloudStatus = {
  probed: false,
  configured: false,
  online: false,
  pending: 0,
  lastSyncAt: null,
  message: "Menghubungkan ke cloud…",
};

let status: CloudStatus = {
  ...SERVER_STATUS,
  online: true,
  message: "Siap.",
};

let queue: SyncQueueItem[] = [];
let queueLoaded = false;
let inited = false;
let flushing = false;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getStatus(): CloudStatus {
  return status;
}

/** Hook reaktif status cloud (aman dipakai di mana pun). */
export function useCloudStatus(): CloudStatus {
  return useSyncExternalStore(subscribe, getStatus, () => SERVER_STATUS);
}

function computeMessage(s: CloudStatus): string {
  if (!s.online) return "Offline — data disimpan lokal & dikirim otomatis saat online.";
  if (!s.probed) return "Menghubungkan ke cloud…";
  if (!s.configured) return "Cloud belum dikonfigurasi (server tanpa DATABASE_URL).";
  if (s.pending > 0) return `${s.pending} data menunggu dikirim…`;
  return "Tersinkron dengan cloud.";
}

function setStatus(patch: Partial<CloudStatus>) {
  const next: CloudStatus = { ...status, ...patch };
  next.message = computeMessage(next);
  status = next;
  emit();
}

/* ------------------------------- Antrian ------------------------------- */

function loadQueue(): SyncQueueItem[] {
  if (typeof window === "undefined") return queue;
  if (queueLoaded) return queue;
  queueLoaded = true;
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) queue = parsed as SyncQueueItem[];
    }
  } catch {
    queue = [];
  }
  return queue;
}

function setQueue(items: SyncQueueItem[]) {
  queue = items;
  queueLoaded = true;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* penyimpanan penuh / diblokir — abaikan */
  }
  setStatus({ pending: items.length });
}

/* ------------------------------ Transport ------------------------------ */

interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, init);
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      data?: T;
      error?: string;
    } | null;

    if (!res.ok || !json?.ok) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: json?.error ?? `HTTP ${res.status}`,
      };
    }
    return { ok: true, status: res.status, data: (json.data ?? null) as T | null };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : "network error",
    };
  }
}

export function apiGet<T>(path: string): Promise<ApiResult<T>> {
  return request<T>(path, { method: "GET", cache: "no-store" });
}

export function apiPost<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string): Promise<ApiResult<T>> {
  return request<T>(path, { method: "DELETE" });
}

/* -------------------------------- Aksi --------------------------------- */

/** Periksa apakah server punya database aktif. */
export async function probeCloud(): Promise<boolean> {
  const res = await apiGet<{ db: boolean }>("/api/health");

  if (res.status === 0) {
    setStatus({ probed: true, online: false });
    return false;
  }
  const configured = Boolean(res.data?.db);
  setStatus({ probed: true, configured, online: true });
  return configured;
}

/**
 * Kirim semua data yang menunggu ke server.
 * Idempoten (memakai `clientId`), jadi aman dipanggil sesering apa pun.
 */
export async function flush(): Promise<void> {
  if (typeof window === "undefined" || flushing) return;

  const items = loadQueue();
  if (items.length === 0) return;

  if (!navigator.onLine) {
    setStatus({ online: false });
    return;
  }

  flushing = true;
  let sent = 0;
  let i = 0;
  try {
    for (; i < items.length; i++) {
      const item = items[i];
      const res = await request(ENDPOINTS[item.kind], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });

      if (res.ok) {
        sent++;
        continue;
      }
      // 503 → server belum punya database; simpan sisanya untuk nanti.
      if (res.status === 503) {
        setStatus({ probed: true, configured: false, online: true });
        break;
      }
      // 4xx (selain 401) → payload ditolak permanen, buang agar tak macet.
      if (res.status >= 400 && res.status < 500 && res.status !== 401) {
        continue;
      }
      // Jaringan/5xx → berhenti, coba lagi di percobaan berikutnya.
      break;
    }
  } finally {
    flushing = false;
  }

  setQueue(items.slice(i));

  if (sent > 0) {
    const now = new Date().toISOString();
    try {
      window.localStorage.setItem(LAST_SYNC_KEY, now);
    } catch {
      /* abaikan */
    }
    setStatus({ lastSyncAt: now, configured: true, probed: true, online: true });
  }
}

/** Titipkan satu skor ke cloud (langsung dikirim, atau mengantre bila gagal). */
export function queueResult(entry: ResultRow): void {
  if (typeof window === "undefined") return;

  const items = loadQueue();
  if (items.some((it) => it.id === entry.id)) {
    void flush();
    return;
  }

  setQueue([
    ...items,
    {
      id: entry.id,
      kind: "result",
      payload: {
        clientId: entry.id,
        game: entry.game,
        player: entry.player,
        score: entry.score,
      },
      at: new Date().toISOString(),
    },
  ]);

  void flush();
}

/** Ambil skor dari cloud (dipakai leaderboard live). */
export async function pullResults(limit = 200): Promise<ResultRow[] | null> {
  const res = await apiGet<ResultRow[]>(`/api/results?limit=${limit}`);
  return res.ok ? res.data : null;
}

/**
 * Nyalakan mesin sinkron: pasang listener online/offline dan timer retry.
 * Idempoten — aman dipanggil berkali-kali.
 */
export function initSync(): void {
  if (typeof window === "undefined" || inited) return;
  inited = true;

  loadQueue();
  let lastSyncAt: string | null = null;
  try {
    lastSyncAt = window.localStorage.getItem(LAST_SYNC_KEY);
  } catch {
    /* abaikan */
  }

  setStatus({
    online: navigator.onLine,
    pending: queue.length,
    lastSyncAt,
  });

  window.addEventListener("online", () => {
    setStatus({ online: true });
    void flush();
  });
  window.addEventListener("offline", () => {
    setStatus({ online: false });
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void flush();
  });

  window.setInterval(() => void flush(), 15_000);
  void probeCloud();
}

/**
 * Polling skor cloud untuk leaderboard live (Fase 1.7).
 * `onRows` dipanggil tiap kali data cloud berhasil diambil. Bila cloud belum
 * dikonfigurasi, polling tetap berjalan tetapi tidak pernah memanggil `onRows`
 * dengan data kosong — papan peringkat lokal tetap tampil.
 *
 * Mengembalikan fungsi pembersih (dipakai di `useEffect`).
 */
export function startResultsPolling(
  onRows: (rows: ResultRow[]) => void,
  intervalMs = 5_000,
): () => void {
  let stopped = false;

  const tick = async () => {
    if (stopped || !navigator.onLine) return;
    const rows = await pullResults(200);
    if (!stopped && rows) onRows(rows);
  };

  void tick();
  const timer = window.setInterval(() => void tick(), intervalMs);

  return () => {
    stopped = true;
    window.clearInterval(timer);
  };
}
