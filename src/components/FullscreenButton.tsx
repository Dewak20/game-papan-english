"use client";

import { useEffect, useState } from "react";

/** Tombol layar penuh — penting untuk tampilan papan besar kelas. */
export function FullscreenButton({ className = "" }: { className?: string }) {
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen().catch(() => {
        /* browser menolak / tidak didukung */
      });
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isFull ? "Keluar layar penuh" : "Layar penuh"}
      title={isFull ? "Keluar layar penuh" : "Layar penuh"}
      className={`focus-ring flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white/5 px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-white/40 hover:text-white ${className}`}
    >
      <span className="text-lg">{isFull ? "🗗" : "⛶"}</span>
      <span className="hidden sm:inline">{isFull ? "Keluar" : "Layar Penuh"}</span>
    </button>
  );
}
