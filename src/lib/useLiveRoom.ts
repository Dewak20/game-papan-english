"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Hook sinkronisasi "Ruang Kelas" (multiplayer lintas perangkat).
 *
 * Cara kerja: polling ringan ke `/api/rooms/[code]` (default tiap 2 detik).
 * Cocok untuk kelas di LAN karena tidak butuh WebSocket. Identitas pemain &
 * token host disimpan di localStorage agar tidak hilang saat halaman di-refresh.
 */

export interface RoomView {
  code: string;
  title: string;
  gameSlug: string;
  phase: "lobby" | "playing" | "ended";
  players: { id: string; name: string; score: number }[];
  updatedAt: string;
}

interface RoomResponse {
  ok: boolean;
  data?: RoomView;
  error?: string;
}

const HOST_KEY = "blp:room:host:v1";
const PLAYER_KEY = "blp:room:player:v1";

function readStore<T>(key: string): Record<string, T> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, T>;
  } catch {
    return {};
  }
}

function writeStore<T>(key: string, map: Record<string, T>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* abaikan */
  }
}

export function getHostToken(code: string): string | null {
  return readStore<string>(HOST_KEY)[code] ?? null;
}
export function saveHostToken(code: string, token: string) {
  const map = readStore<string>(HOST_KEY);
  map[code] = token;
  writeStore(HOST_KEY, map);
}
export function getPlayerId(code: string): string | null {
  return readStore<string>(PLAYER_KEY)[code] ?? null;
}
export function savePlayerId(code: string, id: string) {
  const map = readStore<string>(PLAYER_KEY);
  map[code] = id;
  writeStore(PLAYER_KEY, map);
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export function useLiveRoom(code: string | null, pollMs = 2000) {
  const [view, setView] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Nilai lokal yang menimpa localStorage (mis. setelah join). */
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);

  const playerId = useMemo(
    () => localPlayerId ?? (code ? getPlayerId(code) : null),
    [localPlayerId, code],
  );
  const hostToken = useMemo(() => (code ? getHostToken(code) : null), [code]);

  const refresh = useCallback(async () => {
    if (!code) return;
    try {
      const res = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
      const json = (await res.json()) as RoomResponse;
      if (json.ok && json.data) {
        setView(json.data);
        setError(null);
      } else {
        setError(json.error ?? "Ruang tidak ditemukan.");
      }
    } catch {
      setError("Tidak dapat menghubungi server.");
    }
  }, [code]);

  useEffect(() => {
    if (!code) return;
    // Tunda fetch pertama ke luar body efek agar tidak memicu cascading render.
    const first = window.setTimeout(() => void refresh(), 0);
    const id = window.setInterval(() => void refresh(), Math.max(800, pollMs));
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [code, pollMs, refresh]);

  const join = useCallback(
    async (name: string) => {
      if (!code) return null;
      const existing = getPlayerId(code);
      const json = await post<{
        ok: boolean;
        data?: { view: RoomView; playerId: string };
        error?: string;
      }>(`/api/rooms/${code}`, { action: "join", name, playerId: existing ?? undefined });
      if (json.ok && json.data) {
        savePlayerId(code, json.data.playerId);
        setLocalPlayerId(json.data.playerId);
        setView(json.data.view);
        return json.data.playerId;
      }
      setError(json.error ?? "Gagal masuk ruang.");
      return null;
    },
    [code],
  );

  const addScore = useCallback(
    async (targetId: string, value: number, mode: "set" | "add" = "add") => {
      if (!code) return;
      const token = getHostToken(code);
      const json = await post<RoomResponse>(`/api/rooms/${code}`, {
        action: "score",
        playerId: targetId,
        value,
        mode,
        token: token ?? undefined,
      });
      if (json.ok && json.data) setView(json.data);
      else setError(json.error ?? "Gagal menyimpan skor.");
    },
    [code],
  );

  const hostAction = useCallback(
    async (body: Record<string, unknown>) => {
      if (!code) return;
      const token = getHostToken(code);
      const json = await post<RoomResponse>(`/api/rooms/${code}`, { ...body, token });
      if (json.ok && json.data) setView(json.data);
      else setError(json.error ?? "Aksi gagal.");
    },
    [code],
  );

  return {
    view,
    error,
    playerId,
    isHost: !!hostToken,
    join,
    addScore,
    setPhase: (phase: RoomView["phase"]) => hostAction({ action: "phase", phase }),
    resetScores: () => hostAction({ action: "reset" }),
    removePlayer: (id: string) => hostAction({ action: "remove", playerId: id }),
    refresh,
  };
}
