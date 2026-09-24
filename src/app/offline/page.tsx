import Link from "next/link";

export const metadata = {
  title: "Offline · Battle Learning Platform",
};

/** Halaman cadangan yang ditampilkan service worker saat perangkat offline. */
export default function OfflinePage() {
  return (
    <main className="tex-neon flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <span className="animate-bob text-7xl">📡</span>
      <h1
        className="font-display text-5xl text-white sm:text-6xl"
        style={{ textShadow: "0 0 40px #38bdf8, 0 4px 0 #000" }}
      >
        KAMU SEDANG OFFLINE
      </h1>
      <p className="max-w-xl text-lg text-white/70">
        Sambungkan perangkat ke internet untuk memuat gambar soal dan sinkron
        skor. Permainan yang sudah pernah dibuka tetap bisa dimainkan dari cache.
      </p>
      <Link
        href="/"
        className="btn-3d focus-ring flex items-center bg-gold px-8 py-4 text-2xl text-ink shadow-[0_10px_0_#b45309]"
      >
        🔄 COBA LAGI
      </Link>
    </main>
  );
}
