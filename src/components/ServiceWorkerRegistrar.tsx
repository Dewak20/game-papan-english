"use client";

import { useEffect } from "react";

/**
 * Mendaftarkan service worker (PWA) sekali saat aplikasi dimuat.
 *
 * Sengaja hanya aktif di produksi: saat `next dev`, service worker bisa
 * membayangi aset HMR sehingga menyulitkan pengembangan. Daftar ulang
 * otomatis saat kembali online agar perangkat cepat sinkron.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          /* pendaftaran gagal (mis. konteks non-HTTPS) — abaikan */
        });
    };

    register();
    window.addEventListener("online", register);
    return () => window.removeEventListener("online", register);
  }, []);

  return null;
}
