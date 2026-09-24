import "server-only";

/** Helper bersama untuk Route Handlers. */

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data }, init);
}

export function fail(status: number, error: string) {
  return Response.json({ ok: false, error }, { status });
}

/** 503 dipakai saat DATABASE_URL belum diisi — aplikasi tetap jalan offline. */
export function noDb() {
  return fail(
    503,
    "Database belum dikonfigurasi. Isi DATABASE_URL untuk mengaktifkan sinkronisasi cloud.",
  );
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/** Batasi nilai angka ke rentang wajar agar data tidak rusak. */
export function clampInt(value: unknown, min: number, max: number, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function cleanText(value: unknown, maxLength: number, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}
