"use client";

import { useMemo } from "react";

/**
 * Toolkit efek "juice" untuk semua game.
 * Semua komponen ini hanya dirender saat fase bermain/hasil (client-side),
 * jadi aman dari hydration mismatch.
 *
 * Catatan: nilai acak dihasilkan lewat PRNG deterministik (bukan Math.random)
 * supaya lolos aturan react-hooks/purity. Variasi tetap ada lewat prop `seed`.
 */

/** PRNG deterministik (mulberry32) — pure, boleh dipanggil saat render. */
function makeRng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CONFETTI_COLORS = [
  "#fbbf24",
  "#38bdf8",
  "#fb7185",
  "#34d399",
  "#a78bfa",
  "#f97316",
  "#facc15",
  "#22d3ee",
];

interface ConfettiProps {
  /** jumlah potongan kertas */
  count?: number;
  /** aktif/nonaktif */
  active?: boolean;
  /** benih variasi (ubah agar pola berbeda) */
  seed?: number;
}

/** Hujan confetti dari atas layar. */
export function Confetti({ count = 90, active = true, seed = 7 }: ConfettiProps) {
  const pieces = useMemo(() => {
    const rnd = makeRng(seed);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: rnd() * 100,
      delay: rnd() * 1.1,
      duration: 2.2 + rnd() * 2,
      dx: (rnd() * 2 - 1) * 170,
      rot: 360 + rnd() * 900,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      w: 7 + rnd() * 9,
      h: 10 + rnd() * 14,
      round: rnd() > 0.6,
    }));
  }, [count, seed]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[150] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 animate-confetti"
          style={
            {
              left: `${p.left}%`,
              width: p.w,
              height: p.h,
              backgroundColor: p.color,
              borderRadius: p.round ? "9999px" : "2px",
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              "--dx": `${p.dx}px`,
              "--rot": `${p.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

interface BurstProps {
  /** jumlah partikel */
  count?: number;
  color?: string;
  /** ukuran maksimum sebaran (px) */
  spread?: number;
  /** benih variasi */
  seed?: number;
}

/** Ledakan partikel radial (dipakai saat jawaban benar). */
export function Burst({ count = 14, color = "#fbbf24", spread = 130, seed = 3 }: BurstProps) {
  const parts = useMemo(() => {
    const rnd = makeRng(seed);
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + rnd() * 0.5;
      const dist = spread * (0.6 + rnd() * 0.6);
      return {
        id: i,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        size: 6 + rnd() * 12,
      };
    });
  }, [count, spread, seed]);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center overflow-hidden">
      {parts.map((p) => (
        <span
          key={p.id}
          className="absolute animate-burst rounded-full"
          style={
            {
              width: p.size,
              height: p.size,
              backgroundColor: color,
              boxShadow: `0 0 14px ${color}`,
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Cincin gelombang yang mengembang dari tengah. */
export function RingPulse({ color = "#fbbf24" }: { color?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
      {[0, 0.35, 0.7].map((d) => (
        <span
          key={d}
          className="absolute h-40 w-40 animate-ring rounded-full border-4"
          style={{ borderColor: color, animationDelay: `${d}s` }}
        />
      ))}
    </div>
  );
}

interface FloatingTextProps {
  text: string;
  color?: string;
  x?: string;
  y?: string;
  className?: string;
}

/** Angka skor melayang ke atas. */
export function FloatingText({
  text,
  color = "#fbbf24",
  x = "50%",
  y = "40%",
  className = "",
}: FloatingTextProps) {
  return (
    <div
      className={`pointer-events-none absolute z-50 animate-rise font-display text-6xl font-bold ${className}`}
      style={{ left: x, top: y, color, textShadow: "0 4px 14px rgba(0,0,0,0.7)" }}
    >
      {text}
    </div>
  );
}

interface ScreenFlashProps {
  color?: string;
  /** key berubah → flash ulang */
  trigger: number;
}

/** Kilatan layar warna (umpan balik cepat benar/salah). */
export function ScreenFlash({ color = "rgba(52,211,153,0.35)", trigger }: ScreenFlashProps) {
  return (
    <div
      key={trigger}
      className="pointer-events-none fixed inset-0 z-[120] animate-flash"
      style={{ backgroundColor: color }}
    />
  );
}

interface ComboMeterProps {
  value: number;
  max?: number;
  label?: string;
}

/** Bar combo / streak. */
export function ComboMeter({ value, max = 5, label = "COMBO" }: ComboMeterProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="font-display text-sm tracking-widest text-gold">{label}</span>
      <div className="relative h-3 w-32 overflow-hidden rounded-full border border-white/20 bg-black/50">
        <div
          className="combo-bar h-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-display text-lg text-gold">x{value}</span>
    </div>
  );
}

interface CountdownProps {
  /** 3, 2, 1, atau 0 (=GO!) */
  count: number;
  accent?: string;
}

/** Hitung mundur 3-2-1-GO dengan efek cincin & denyut. */
export function Countdown({ count, accent = "#fbbf24" }: CountdownProps) {
  const isGo = count === 0;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink/92 backdrop-blur-xl">
      <div className="relative flex h-72 w-72 items-center justify-center">
        {[0, 0.3, 0.6].map((d) => (
          <span
            key={d}
            className="absolute h-56 w-56 animate-ring rounded-full border-4"
            style={{ borderColor: accent, animationDelay: `${d}s` }}
          />
        ))}
        <span
          key={count}
          className="animate-bounce-in font-display leading-none"
          style={{
            fontSize: isGo ? "9rem" : "14rem",
            color: accent,
            textShadow: `0 0 60px ${accent}, 0 6px 0 rgba(0,0,0,0.6)`,
          }}
        >
          {isGo ? "GO!" : count}
        </span>
      </div>
      {!isGo ? (
        <p className="mt-4 font-display text-2xl tracking-[0.4em] text-white/60 uppercase">
          Bersiap…
        </p>
      ) : null}
    </div>
  );
}

interface WinnerBannerProps {
  title: string;
  color: string;
  emoji?: string;
}

/** Banner pemenang dengan kilau. */
export function WinnerBanner({ title, color, emoji = "🏆" }: WinnerBannerProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="animate-bob text-7xl">{emoji}</div>
      <h1
        className="mt-2 animate-tilt font-display text-6xl sm:text-7xl"
        style={{ color, textShadow: `0 0 44px ${color}, 0 4px 0 rgba(0,0,0,0.6)` }}
      >
        {title}
      </h1>
    </div>
  );
}

/** Papan skor dua tim ringkas untuk layar hasil. */
export function ScoreBoard({
  blue,
  red,
  blueLabel = "Blue",
  redLabel = "Red",
}: {
  blue: number;
  red: number;
  blueLabel?: string;
  redLabel?: string;
}) {
  return (
    <div className="flex items-stretch gap-3 rounded-3xl border-2 border-white/20 bg-white/10 p-2">
      <div className="flex flex-col items-center rounded-2xl bg-blue-deep/40 px-8 py-3">
        <span className="text-xs tracking-widest text-blue uppercase">{blueLabel}</span>
        <span className="font-display text-5xl text-blue">{blue}</span>
      </div>
      <div className="flex items-center px-1 font-display text-2xl text-slate-400">VS</div>
      <div className="flex flex-col items-center rounded-2xl bg-red-deep/40 px-8 py-3">
        <span className="text-xs tracking-widest text-red uppercase">{redLabel}</span>
        <span className="font-display text-5xl text-red">{red}</span>
      </div>
    </div>
  );
}
