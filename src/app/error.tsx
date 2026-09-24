"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Error boundary untuk seluruh aplikasi (kecuali root layout).
 * Di Next.js 16.3, prop pemulihan bernama `retry` (bukan `reset`).
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Catat ke console agar guru bisa melaporkan bila terjadi masalah.
    console.error(error);
  }, [error]);

  return (
    <div className="tex-neon flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <span className="mb-4 animate-bob text-7xl">💥</span>
      <h1 className="font-display text-5xl text-white sm:text-6xl">WADUH, ADA ERROR!</h1>
      <p className="mt-3 mb-2 max-w-xl text-lg text-muted">
        Terjadi kesalahan saat menampilkan halaman ini. Coba muat ulang, ya.
      </p>
      {error.digest ? (
        <p className="mb-8 font-mono text-xs text-white/40">Kode: {error.digest}</p>
      ) : (
        <div className="mb-8" />
      )}
      <div className="flex flex-wrap justify-center gap-4">
        <button
          type="button"
          onClick={() => retry()}
          className="btn-3d focus-ring bg-blue px-8 py-4 text-2xl text-ink shadow-[0_10px_0_#0369a1]"
        >
          🔄 COBA LAGI
        </button>
        <Link
          href="/"
          className="btn-3d focus-ring flex items-center bg-line px-8 py-4 text-2xl text-white shadow-[0_10px_0_#0b1226]"
        >
          🏠 MENU UTAMA
        </Link>
      </div>
    </div>
  );
}
