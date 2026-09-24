import type { TeamSide } from "@/lib/types";

export const TEAM = {
  blue: {
    name: "TEAM BLUE",
    text: "text-blue",
    textDeep: "text-blue-deep",
    glow: "shadow-[0_0_40px_-8px_rgba(56,189,248,0.8)]",
    bg: "from-sky-500 to-blue-700",
    ring: "ring-sky-400/60",
    hex: "#38bdf8",
    deepHex: "#1d4ed8",
    scoreClass: "text-blue",
  },
  red: {
    name: "TEAM RED",
    text: "text-red",
    textDeep: "text-red-deep",
    glow: "shadow-[0_0_40px_-8px_rgba(244,63,94,0.8)]",
    bg: "from-rose-500 to-red-700",
    ring: "ring-rose-400/60",
    hex: "#fb7185",
    deepHex: "#dc2626",
    scoreClass: "text-red",
  },
} as const;

export function teamConfig(side: TeamSide) {
  return TEAM[side];
}

interface OverlayProps {
  children: React.ReactNode;
  className?: string;
  hidden?: boolean;
}

/** Layar overlay penuh (menu / hasil / countdown). */
export function Overlay({ children, className = "", hidden = false }: OverlayProps) {
  if (hidden) return null;
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink/95 p-6 backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

interface ChoiceButtonProps {
  label: string;
  active?: boolean;
  onClick: () => void;
  className?: string;
  /** warna aksen saat aktif */
  accent?: string;
  disabled?: boolean;
}

/** Tombol pilihan (mode / durasi / difficulty) — warna aksen bisa diubah per game. */
export function ChoiceButton({
  label,
  active,
  onClick,
  className = "",
  accent = "#fbbf24",
  disabled,
}: ChoiceButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={
        active
          ? {
              backgroundColor: accent,
              borderColor: accent,
              color: "#0b1226",
              boxShadow: `0 0 24px -2px ${accent}`,
            }
          : undefined
      }
      className={`focus-ring cursor-pointer rounded-xl border-2 px-5 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 sm:text-base ${
        active
          ? "scale-105"
          : "border-line bg-white/5 text-muted hover:border-white/40 hover:text-white"
      } ${className}`}
    >
      {label}
    </button>
  );
}

interface StartButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  /** warna dasar tombol */
  color?: string;
  /** warna bayangan 3D */
  shadow?: string;
}

/** Tombol besar "START" khas papan besar. */
export function StartButton({
  label,
  onClick,
  disabled,
  className = "",
  color = "#34d399",
  shadow = "#047857",
}: StartButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={disabled ? undefined : { backgroundColor: color, boxShadow: `0 10px 0 ${shadow}` }}
      className={`btn-3d focus-ring animate-glow px-12 py-4 text-3xl text-ink disabled:cursor-not-allowed disabled:bg-line disabled:text-muted disabled:shadow-none disabled:animate-none ${className}`}
    >
      {label}
    </button>
  );
}

/** Label kecil bergaya untuk judul bagian di menu. */
export function SectionLabel({
  children,
  accent = "#93a4c8",
}: {
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <p
      className="mb-3 text-xs font-bold tracking-[0.25em] uppercase"
      style={{ color: accent }}
    >
      {children}
    </p>
  );
}

/**
 * Petunjuk singkat bahwa menjawab cepat memberi bonus poin (⚡).
 * Ditaruh di menu setiap game agar mekanik baru ini mudah ditemukan.
 */
export function SpeedHint({ className = "" }: { className?: string }) {
  return (
    <p
      className={`flex items-center justify-center gap-2 text-sm font-semibold text-gold ${className}`}
    >
      <span className="text-lg">⚡</span>
      Jawab cepat = bonus poin!
    </p>
  );
}

/**
 * Petunjuk buzzer keyboard: host dapat menekan angka untuk menjawab
 * mewakili tiap tim (BLUE: 1–4, RED: 7 8 9 0).
 */
export function KeyboardHint({
  solo = false,
  className = "",
}: {
  solo?: boolean;
  className?: string;
}) {
  const keyCls =
    "rounded-md border border-white/25 bg-black/40 px-2 py-0.5 font-timer text-sm text-white/80";
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted ${className}`}
    >
      <span className="flex items-center gap-2">
        <span className="font-semibold text-blue">⌨️ BLUE</span>
        {["1", "2", "3", "4"].map((k) => (
          <kbd key={k} className={keyCls}>
            {k}
          </kbd>
        ))}
      </span>
      {!solo ? (
        <span className="flex items-center gap-2">
          <span className="font-semibold text-red">RED</span>
          {["7", "8", "9", "0"].map((k) => (
            <kbd key={k} className={keyCls}>
              {k}
            </kbd>
          ))}
        </span>
      ) : null}
    </div>
  );
}

/** Badge tim dengan skor besar (dipakai di HUD arena). */
export function TeamBadge({
  side,
  score,
  label,
  align = "center",
}: {
  side: TeamSide;
  score: number | string;
  label?: string;
  align?: "left" | "right" | "center";
}) {
  const cfg = TEAM[side];
  const alignCls =
    align === "left" ? "items-start" : align === "right" ? "items-end" : "items-center";
  return (
    <div className={`flex flex-col ${alignCls}`}>
      <span className="text-xs tracking-[0.25em] text-muted uppercase">
        {label ?? (side === "blue" ? "Blue" : "Red")}
      </span>
      <span className={`font-display text-5xl leading-none ${cfg.text}`}>{score}</span>
    </div>
  );
}
