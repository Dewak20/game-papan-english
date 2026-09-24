import Link from "next/link";
import { games } from "@/lib/games";

/** Halaman 404 kustom — juga menampilkan pintasan ke semua game. */
export default function NotFound() {
  return (
    <div className="tex-neon flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <span className="mb-2 animate-bob text-8xl">🧭</span>
      <h1 className="font-display text-7xl text-white sm:text-8xl">404</h1>
      <h2 className="mb-3 font-display text-3xl text-gold">HALAMAN TIDAK DITEMUKAN</h2>
      <p className="mb-8 max-w-xl text-lg text-muted">
        Sepertinya halaman yang kamu cari tidak ada. Pilih game di bawah ini saja!
      </p>

      <div className="mb-10 flex max-w-4xl flex-wrap justify-center gap-3">
        {games.map((g) => (
          <Link
            key={g.slug}
            href={`/${g.slug}`}
            className="focus-ring flex items-center gap-2 rounded-2xl border-2 border-line bg-ink-soft px-5 py-3 text-lg font-semibold text-white transition-colors hover:border-white/40"
          >
            <span className="text-2xl">{g.icon}</span>
            {g.title}
          </Link>
        ))}
      </div>

      <Link
        href="/"
        className="btn-3d focus-ring flex items-center bg-blue px-8 py-4 text-2xl text-ink shadow-[0_10px_0_#0369a1]"
      >
        🏠 KEMBALI KE BERANDA
      </Link>
    </div>
  );
}
