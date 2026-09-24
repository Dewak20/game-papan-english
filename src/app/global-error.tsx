"use client";

import "./globals.css";

/**
 * Error boundary tingkat paling atas — menggantikan root layout bila
 * root layout sendiri gagal dirender. Karena itu harus memuat <html> & <body>
 * serta stylenya sendiri.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="id">
      <body className="bg-ink text-white">
        <div className="tex-neon flex min-h-screen flex-col items-center justify-center p-8 text-center">
          <span className="mb-4 text-7xl">🛠️</span>
          <h1 className="font-display text-5xl text-white sm:text-6xl">
            APLIKASI GAGAL DIMUAT
          </h1>
          <p className="mt-3 mb-2 max-w-xl text-lg text-muted">
            Terjadi masalah serius saat memuat aplikasi. Silakan coba lagi.
          </p>
          {error.digest ? (
            <p className="mb-8 font-mono text-xs text-white/40">Kode: {error.digest}</p>
          ) : (
            <div className="mb-8" />
          )}
          <button
            type="button"
            onClick={() => retry()}
            className="btn-3d focus-ring bg-blue px-8 py-4 text-2xl text-ink shadow-[0_10px_0_#0369a1]"
          >
            🔄 COBA LAGI
          </button>
        </div>
      </body>
    </html>
  );
}
