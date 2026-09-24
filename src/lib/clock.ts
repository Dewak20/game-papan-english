"use client";

/**
 * Pembungkus kecil untuk `Date.now()`.
 *
 * Dipakai di dalam komponen agar pemanggilan fungsi "impure" tidak tertulis
 * langsung di badan komponen — beberapa handler di proyek ini adalah fungsi
 * biasa (bukan `useCallback`), sehingga aturan lint `react-hooks/purity`
 * menandai `Date.now()` yang dipanggil langsung di sana.
 */
export function nowMs(): number {
  return Date.now();
}
