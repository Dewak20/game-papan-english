"use client";

/**
 * Bonus skor kecepatan: makin cepat menjawab, makin besar bonusnya.
 * Mengembalikan 0 bila melewati jendela waktu.
 */
export function speedBonus(
  startedAt: number,
  max = 5,
  windowMs = 3000,
): number {
  const dt = Date.now() - startedAt;
  if (dt <= 0) return max;
  if (dt >= windowMs) return 0;
  return Math.max(0, Math.round(max * (1 - dt / windowMs)));
}
