"use client";

import { useCallback } from "react";

/**
 * Getar layar (screen shake) memakai Web Animations API.
 *
 * Alih-alih menyimpan `ref` (yang dilarang diakses saat render oleh aturan lint
 * proyek), fungsi ini mencari elemen akar lewat `id`. Setiap halaman game
 * menandai elemen akarnya dengan `id="blp-game-root"`.
 *
 * Pemakaian:
 *   const fireShake = useScreenShake();
 *   <div id="blp-game-root" className="…"> … </div>
 *   fireShake();      // saat jawaban salah
 */
export const GAME_ROOT_ID = "blp-game-root";

export function useScreenShake() {
  return useCallback((intensity = 1) => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(GAME_ROOT_ID);
    if (!el || typeof el.animate !== "function") return;
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const d = 12 * intensity;
    el.animate(
      [
        { transform: "translate(0, 0)" },
        { transform: `translate(${-d}px, ${d * 0.5}px)` },
        { transform: `translate(${d}px, ${-d * 0.5}px)` },
        { transform: `translate(${-d * 0.7}px, ${d * 0.3}px)` },
        { transform: `translate(${d * 0.5}px, ${-d * 0.2}px)` },
        { transform: "translate(0, 0)" },
      ],
      { duration: 380, easing: "ease-in-out" },
    );
  }, []);
}
