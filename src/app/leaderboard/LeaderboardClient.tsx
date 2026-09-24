"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  useScores,
  clearScores,
  topScores,
  mergeScores,
  type ScoreEntry,
} from "@/lib/scores";
import { useCloudStatus, startResultsPolling, initSync } from "@/lib/sync";
import { games } from "@/lib/games";

/** Hanya game yang menghasilkan skor latihan (bukan halaman Cek Ranking). */
const PLAYABLE_GAMES = games.filter((g) => g.slug !== "rank");

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardClient() {
  const scores = useScores();
  const cloud = useCloudStatus();
  const [filter, setFilter] = useState<string>("all");
  const [cloudRows, setCloudRows] = useState<ScoreEntry[]>([]);

  // Fase 1.7 — tarik skor cloud secara berkala agar skor dari HP siswa
  // muncul di papan tanpa refresh. Bila cloud belum aktif, ini no-op.
  useEffect(() => {
    initSync();
    return startResultsPolling((rows) => {
      setCloudRows(
        rows.map((r) => ({
          id: r.id,
          game: r.game,
          player: r.player,
          score: r.score,
          date: r.date,
        })),
      );
    }, 5_000);
  }, []);

  const merged = useMemo(
    () => mergeScores(scores, cloudRows),
    [scores, cloudRows],
  );

  const ranked = useMemo(
    () => topScores(merged, filter === "all" ? undefined : filter, 30),
    [merged, filter],
  );

  const gameTitle = (slug: string) =>
    games.find((g) => g.slug === slug)?.title ?? slug;

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-8">
      <header className="mb-8 flex items-center gap-4">
        <Link
          href="/"
          className="focus-ring flex items-center gap-2 rounded-xl border border-line bg-white/5 px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-white/40 hover:text-white"
        >
          ← Menu
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-3xl text-white sm:text-4xl">
            🏅 Papan Peringkat
          </h1>
          <p className="text-sm text-muted">
            Kumpulan skor terbaik dari sesi latihan mandiri.
          </p>
        </div>
        <span
          className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold sm:flex ${
            cloud.configured
              ? "border-green/40 bg-green/10 text-green"
              : "border-line bg-white/5 text-muted"
          }`}
          title={cloud.message}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              cloud.configured
                ? cloud.online
                  ? "animate-pulse-soft bg-green"
                  : "bg-gold"
                : "bg-muted"
            }`}
          />
          {cloud.configured ? (cloud.online ? "LIVE" : "OFFLINE") : "LOKAL"}
        </span>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`focus-ring cursor-pointer rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-all ${
            filter === "all"
              ? "border-gold bg-gold text-ink"
              : "border-line bg-white/5 text-muted hover:border-white/40 hover:text-white"
          }`}
        >
          Semua Game
        </button>
        {PLAYABLE_GAMES.map((g) => (
          <button
            key={g.slug}
            type="button"
            onClick={() => setFilter(g.slug)}
            className={`focus-ring cursor-pointer rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-all ${
              filter === g.slug
                ? "border-gold bg-gold text-ink"
                : "border-line bg-white/5 text-muted hover:border-white/40 hover:text-white"
            }`}
          >
            {g.icon} {g.title}
          </button>
        ))}
      </div>

      <div className="panel overflow-hidden">
        {ranked.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mb-4 text-6xl">📭</div>
            <p className="text-lg text-muted">
              Belum ada skor tersimpan. Mainkan <b className="text-white">Mode Latihan</b>{" "}
              di salah satu game untuk mengisi papan peringkat.
            </p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line text-xs tracking-widest text-muted uppercase">
                <th className="px-5 py-4">#</th>
                <th className="px-5 py-4">Pemain</th>
                <th className="px-5 py-4">Game</th>
                <th className="px-5 py-4 text-right">Skor</th>
                <th className="hidden px-5 py-4 text-right sm:table-cell">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((s: ScoreEntry, i) => (
                <tr
                  key={s.id}
                  className={`border-b border-line/50 transition-colors hover:bg-white/5 ${
                    i < 3 ? "bg-gold/5" : ""
                  }`}
                >
                  <td className="px-5 py-4 font-display text-xl">
                    {i < 3 ? MEDALS[i] : <span className="text-muted">{i + 1}</span>}
                  </td>
                  <td className="px-5 py-4 font-semibold text-white">{s.player}</td>
                  <td className="px-5 py-4 text-sm text-muted">
                    {gameTitle(s.game)}
                  </td>
                  <td className="px-5 py-4 text-right font-display text-2xl text-gold">
                    {s.score}
                  </td>
                  <td className="hidden px-5 py-4 text-right text-xs text-muted sm:table-cell">
                    {formatDate(s.date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {scores.length > 0 ? (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (confirm("Hapus semua skor? Tindakan ini tidak bisa dibatalkan.")) {
                clearScores();
              }
            }}
            className="focus-ring cursor-pointer rounded-xl border-2 border-red-deep bg-red-deep/20 px-5 py-2.5 text-sm font-bold text-red transition-colors hover:bg-red-deep/40"
          >
            🗑️ Hapus Semua Skor
          </button>
        </div>
      ) : null}
    </main>
  );
}
