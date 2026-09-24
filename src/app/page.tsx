import Link from "next/link";
import { games, type Accent } from "@/lib/games";
import { FullscreenButton } from "@/components/FullscreenButton";
import { AudioToggles } from "@/components/AudioToggles";

/** Jumlah game sebenarnya (halaman /rank bukan game). */
const gameCount = games.filter((g) => g.slug !== "rank").length;

const accentMap: Record<
  Accent,
  {
    hex: string;
    ring: string;
    glow: string;
    badge: string;
    icon: string;
    tex: string;
  }
> = {
  blue: {
    hex: "#38bdf8",
    ring: "hover:border-blue/70",
    glow: "hover:shadow-[0_0_70px_-15px_rgba(56,189,248,0.95)]",
    badge: "bg-blue/15 text-blue",
    icon: "from-sky-400/30 to-blue-700/20",
    tex: "tex-neon",
  },
  gold: {
    hex: "#fbbf24",
    ring: "hover:border-gold/70",
    glow: "hover:shadow-[0_0_70px_-15px_rgba(251,191,36,0.95)]",
    badge: "bg-gold/15 text-gold",
    icon: "from-amber-300/30 to-amber-700/20",
    tex: "tex-savanna",
  },
  red: {
    hex: "#fb7185",
    ring: "hover:border-red/70",
    glow: "hover:shadow-[0_0_70px_-15px_rgba(244,63,94,0.95)]",
    badge: "bg-red/15 text-red",
    icon: "from-rose-400/30 to-red-700/20",
    tex: "tex-tug",
  },
  violet: {
    hex: "#a78bfa",
    ring: "hover:border-violet/70",
    glow: "hover:shadow-[0_0_70px_-15px_rgba(167,139,250,0.95)]",
    badge: "bg-violet/15 text-violet",
    icon: "from-violet-400/30 to-indigo-700/20",
    tex: "tex-time",
  },
  green: {
    hex: "#34d399",
    ring: "hover:border-green/70",
    glow: "hover:shadow-[0_0_70px_-15px_rgba(52,211,153,0.95)]",
    badge: "bg-green/15 text-green",
    icon: "from-emerald-400/30 to-green-700/20",
    tex: "tex-chalkboard",
  },
  teal: {
    hex: "#2dd4bf",
    ring: "hover:border-teal/70",
    glow: "hover:shadow-[0_0_70px_-15px_rgba(45,212,191,0.95)]",
    badge: "bg-teal/15 text-teal",
    icon: "from-teal-400/30 to-cyan-700/20",
    tex: "tex-read",
  },
  orange: {
    hex: "#fb923c",
    ring: "hover:border-orange/70",
    glow: "hover:shadow-[0_0_70px_-15px_rgba(251,146,60,0.95)]",
    badge: "bg-orange/15 text-orange",
    icon: "from-orange-400/30 to-amber-700/20",
    tex: "tex-sound",
  },
  pink: {
    hex: "#f472b6",
    ring: "hover:border-pink/70",
    glow: "hover:shadow-[0_0_70px_-15px_rgba(244,114,182,0.95)]",
    badge: "bg-pink/15 text-pink",
    icon: "from-pink-400/30 to-fuchsia-700/20",
    tex: "tex-stage",
  },
  lime: {
    hex: "#a3e635",
    ring: "hover:border-lime/70",
    glow: "hover:shadow-[0_0_70px_-15px_rgba(163,230,53,0.95)]",
    badge: "bg-lime/15 text-lime",
    icon: "from-lime-400/30 to-green-700/20",
    tex: "tex-gallery",
  },
};

export default function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-6 py-10 sm:px-12 lg:py-16">
      {/* latar bergerak */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-32 h-[36rem] w-[36rem] animate-drift rounded-full bg-blue/20 blur-[130px]" />
        <div className="absolute -right-32 bottom-0 h-[34rem] w-[34rem] animate-drift rounded-full bg-red/20 blur-[130px]" />
        <div className="absolute top-1/3 left-1/2 h-[30rem] w-[30rem] animate-spin-slow rounded-full bg-violet/10 blur-[140px]" />
      </div>

      <div className="mb-8 flex justify-end gap-3">
        <AudioToggles />
        <Link
          href="/live"
          className="focus-ring flex items-center gap-2 rounded-xl border border-line bg-white/5 px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-green/60 hover:text-green"
        >
          📡 Ruang Kelas
        </Link>
        <Link
          href="/tournament"
          className="focus-ring flex items-center gap-2 rounded-xl border border-line bg-white/5 px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-gold/60 hover:text-gold"
        >
          🏆 Turnamen
        </Link>
        <Link
          href="/leaderboard"
          className="focus-ring flex items-center gap-2 rounded-xl border border-line bg-white/5 px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-gold/60 hover:text-gold"
        >
          🏅 Papan Peringkat
        </Link>
        <Link
          href="/settings"
          className="focus-ring flex items-center gap-2 rounded-xl border border-line bg-white/5 px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-gold/60 hover:text-gold"
        >
          ⚙️ Panel Guru
        </Link>
        <Link
          href="/admin"
          className="focus-ring flex items-center gap-2 rounded-xl border border-line bg-white/5 px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-gold/60 hover:text-gold"
        >
          🛠️ Admin
        </Link>
        <FullscreenButton />
      </div>

      <header className="mb-12 flex flex-col items-center text-center lg:mb-16">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-white/5 px-5 py-2 text-sm font-semibold tracking-widest text-muted uppercase">
          <span className="h-2 w-2 animate-pulse-soft rounded-full bg-green" />
          SMP Dharma Wiweka · Papan Interaktif
        </span>
        <h1 className="font-display text-5xl leading-tight text-white drop-shadow-[0_4px_20px_rgba(56,189,248,0.35)] sm:text-7xl lg:text-8xl">
          BATTLE LEARNING
          <span className="block bg-gradient-to-r from-blue via-gold to-red bg-clip-text text-transparent">
            PLATFORM
          </span>
        </h1>
        <p className="mt-6 max-w-3xl text-lg text-muted sm:text-xl">
          {gameCount} game edukatif Bahasa Inggris &amp; penilaian siswa dalam satu aplikasi.
          Dirancang seru untuk ditampilkan di layar papan besar kelas.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3 text-sm font-semibold">
          {[`${gameCount} Game`, "Duel 2 Tim", "Latihan Mandiri", "Papan Peringkat"].map((t) => (
            <span
              key={t}
              className="rounded-full border border-line bg-ink-soft px-4 py-1.5 text-muted"
            >
              {t}
            </span>
          ))}
        </div>
      </header>

      <section className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {games.map((game, i) => {
          const a = accentMap[game.accent];
          return (
            <Link
              key={game.slug}
              href={`/${game.slug}`}
              className={`group panel relative flex flex-col overflow-hidden border-2 border-line transition-all duration-300 hover:-translate-y-2 ${a.ring} ${a.glow}`}
            >
              {/* garis aksen atas */}
              <div
                className="absolute inset-x-0 top-0 h-1.5 opacity-70 transition-opacity group-hover:opacity-100"
                style={{ background: `linear-gradient(90deg, transparent, ${a.hex}, transparent)` }}
              />

              {/* panel "art" mini bergaya sesuai game */}
              <div className={`relative h-32 overflow-hidden ${a.tex}`}>
                <div className="absolute inset-0 bg-black/25" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="animate-bob text-6xl drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]">
                    {game.icon}
                  </span>
                </div>
                {/* garis scan untuk nuansa arcade */}
                <div className="scanlines absolute inset-0" />
                <span className="absolute top-3 right-4 font-display text-2xl text-white/30">
                  #{String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`absolute bottom-3 left-4 rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase backdrop-blur ${a.badge}`}
                >
                  {game.mode}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h2 className="font-display text-3xl text-white">{game.title}</h2>
                <p
                  className="mt-1 text-sm font-semibold tracking-wide"
                  style={{ color: a.hex }}
                >
                  {game.subtitle}
                </p>
                <p className="mt-3 flex-1 text-base leading-relaxed text-slate-300">
                  {game.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {game.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-lg border border-line bg-ink-soft px-3 py-1 text-xs font-medium text-muted"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <div className="mt-6 flex items-center gap-2 font-display text-xl text-white">
                  MULAI
                  <span className="transition-transform duration-300 group-hover:translate-x-2">
                    →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      <footer className="mt-16 text-center text-sm text-muted">
        © {new Date().getFullYear()} Dewa Krishnadana · Battle Learning Platform
      </footer>
    </main>
  );
}
