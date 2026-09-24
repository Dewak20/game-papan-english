"use client";

/**
 * Preload gambar di browser memakai `new Image()` (bukan `fetch`) agar masuk
 * ke cache HTTP browser dengan cara yang sama seperti saat `<img>`/`next/image`
 * benar-benar dipakai. Berguna untuk "memanaskan" gambar soal berikutnya.
 */

const seen = new Set<string>();

/** Mulai unduh `url` di latar belakang. Idempoten & aman saat SSR. */
export function preloadImage(url: string | null | undefined): void {
  if (!url) return;
  if (typeof window === "undefined") return;
  if (seen.has(url)) return;
  seen.add(url);

  const img = new Image();
  img.decoding = "async";
  img.src = url;
}

/**
 * Preload beberapa URL sekaligus (maksimum dibatasi agar tidak membanjiri
 * jaringan kelas yang lambat).
 */
export function preloadImages(urls: (string | null | undefined)[], max = 4): void {
  urls.slice(0, max).forEach(preloadImage);
}
