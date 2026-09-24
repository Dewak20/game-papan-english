import Link from "next/link";
import { FullscreenButton } from "./FullscreenButton";
import { AudioToggles } from "./AudioToggles";

interface GameHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  /** warna aksen judul & garis bawah */
  accent?: string;
  /** kelas font judul (mis. "font-chalk") */
  titleFont?: string;
  /** emoji/ikon di samping judul */
  icon?: string;
}

/** Header bersama untuk setiap halaman game — aksen warna bisa diubah per game. */
export function GameHeader({
  title,
  subtitle,
  children,
  accent = "#fbbf24",
  titleFont = "font-display",
  icon,
}: GameHeaderProps) {
  return (
    <header className="relative z-30 flex w-full items-center justify-between gap-4 border-b-2 border-line bg-ink/80 px-4 py-3 backdrop-blur-md sm:px-6">
      <div
        className="absolute inset-x-0 bottom-0 h-1"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <div className="flex items-center gap-3 sm:gap-5">
        <Link
          href="/"
          className="focus-ring flex items-center gap-2 rounded-xl border border-line bg-white/5 px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-white/40 hover:text-white"
        >
          <span className="text-lg">←</span>
          <span className="hidden sm:inline">Menu</span>
        </Link>
        <div className="flex items-center gap-3 leading-tight">
          {icon ? <span className="text-3xl sm:text-4xl">{icon}</span> : null}
          <div>
            <h1
              className={`${titleFont} text-xl text-white sm:text-3xl`}
              style={{ textShadow: `0 0 24px ${accent}55` }}
            >
              {title}
            </h1>
            {subtitle ? (
              <p className="hidden text-xs font-semibold tracking-wide text-muted sm:block">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {children}
        <AudioToggles />
        <FullscreenButton />
      </div>
    </header>
  );
}

/** Tampilan angka timer besar khas papan. */
export function TimerBadge({
  value,
  warning,
  accent = "#fbbf24",
}: {
  value: string;
  warning?: boolean;
  accent?: string;
}) {
  return (
    <div
      className={`rounded-2xl border-2 px-6 py-2 font-timer text-3xl font-bold tabular-nums transition-colors sm:text-4xl ${
        warning ? "animate-heartbeat border-red bg-red/15 text-red" : ""
      }`}
      style={
        warning
          ? undefined
          : { borderColor: `${accent}99`, backgroundColor: `${accent}1a`, color: accent }
      }
    >
      {value}
    </div>
  );
}

export function formatClock(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
