"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { teamConfig } from "@/components/ui";
import type { FloatItem } from "@/lib/useJuice";
import type { TeamSide } from "@/lib/types";

/**
 * Potongan UI yang dipakai berulang di banyak game (bar skor tim, lapisan teks
 * melayang, kartu hasil solo). Diekstrak agar file game lebih ringkas dan
 * perilakunya seragam.
 */

/** Bar skor dua tim (dipakai di HUD semua game duel). */
export function TeamScoreBar({
  teams,
  solo,
  soloAccent = "text-gold",
  className = "",
}: {
  teams: Record<TeamSide, number>;
  solo?: boolean;
  /** Kelas warna untuk label "LATIHAN MANDIRI" di mode solo. */
  soloAccent?: string;
  className?: string;
}) {
  if (solo) {
    return (
      <div
        className={`relative z-20 flex h-16 w-full items-center justify-between border-b-2 border-line bg-black/50 px-6 ${className}`}
      >
        <span className={`font-display text-2xl ${soloAccent}`}>🧑 LATIHAN MANDIRI</span>
        <span className="font-display text-2xl text-gold">SKOR: {teams.blue}</span>
      </div>
    );
  }

  return (
    <div className={`relative z-20 flex h-16 w-full border-b-2 border-line bg-black/50 ${className}`}>
      <div className="flex flex-1 items-center justify-start border-r border-white/10 bg-gradient-to-r from-sky-500 to-blue-700 pl-6 font-display text-2xl text-white">
        TEAM BLUE · {teams.blue}
      </div>
      <div className="flex flex-1 items-center justify-end bg-gradient-to-l from-rose-500 to-red-700 pr-6 font-display text-2xl text-white">
        {teams.red} · TEAM RED
      </div>
    </div>
  );
}

/** Lapisan teks skor melayang (dari `useJuice`). */
export function FloatLayer({
  floats,
  sizeClass = "text-5xl",
  fontClass = "font-display",
}: {
  floats: FloatItem[];
  sizeClass?: string;
  fontClass?: string;
}) {
  return (
    <>
      {floats.map((f) => (
        <div
          key={f.id}
          className={`pointer-events-none absolute z-[130] animate-rise ${fontClass} font-bold ${sizeClass}`}
          style={{ left: f.x, top: f.y, color: f.color, textShadow: "0 6px 18px rgba(0,0,0,0.8)" }}
        >
          {f.text}
        </div>
      ))}
    </>
  );
}

/** Header nama tim + skor di dalam panel tim. */
export function TeamPanelHeader({
  side,
  score,
  solo,
  soloLabel = "🧑 KAMU",
}: {
  side: TeamSide;
  score: number;
  solo?: boolean;
  soloLabel?: string;
}) {
  const cfg = teamConfig(side);
  return (
    <div className="z-10 flex w-full items-center justify-between px-2">
      <span className={`font-display text-xl ${cfg.text}`}>{solo ? soloLabel : cfg.name}</span>
      <span className={`font-display text-4xl ${cfg.text}`}>{score}</span>
    </div>
  );
}

/** Footer hak cipta yang seragam di semua game. */
export function GameFooter() {
  return (
    <footer className="pointer-events-none z-10 bg-gradient-to-t from-black/80 to-transparent py-2 text-center text-xs tracking-widest text-white/60">
      © {new Date().getFullYear()} Dewa Krishnadana
    </footer>
  );
}

/** Tombol "MENU" yang seragam di layar hasil. */
export function MenuButton({ children = "MENU" }: { children?: ReactNode }) {
  return (
    <Link
      href="/"
      className="btn-3d focus-ring flex items-center bg-line px-8 py-4 text-2xl text-white shadow-[0_10px_0_#0b1226]"
    >
      {children}
    </Link>
  );
}

/** Kartu skor solo (mode latihan mandiri). */
export function SoloScoreCard({ score }: { score: number }) {
  return (
    <div className="mb-6 animate-glow rounded-3xl border-2 border-gold/40 bg-gold/10 px-16 py-6 text-center">
      <p className="text-sm tracking-widest text-muted uppercase">Skor Kamu</p>
      <p className="font-display text-8xl text-gold">{score}</p>
    </div>
  );
}
