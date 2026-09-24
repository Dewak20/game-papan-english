import "server-only";

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Auth guru sederhana (Fase 1.8): PIN → cookie sesi bertanda-tangan HMAC.
 *
 * Tanpa dependensi tambahan — cukup `node:crypto`. Bila `AUTH_SECRET` belum
 * diisi, dipakai nilai dev (cukup untuk pemakaian lokal; isi di produksi).
 */

const COOKIE = "blp_teacher";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 jam

function secret(): string {
  return process.env.AUTH_SECRET || "blp-dev-secret-jangan-dipakai-di-produksi";
}

/** PIN guru yang benar (default 1234). */
export function teacherPin(): string {
  return process.env.TEACHER_PIN || "1234";
}

export function verifyPin(pin: string): boolean {
  return pin.trim() === teacherPin();
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function makeToken(): string {
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  return `${exp}.${sign(String(exp))}`;
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;

  const expected = sign(payload);
  if (sig.length !== expected.length) return false;
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  } catch {
    return false;
  }
  return Number(payload) > Date.now();
}

/** Baca status guru dari cookie (dipakai di Route Handler / Server Component). */
export async function isTeacher(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(COOKIE)?.value);
}

/** Simpan cookie sesi guru (hanya boleh dari Route Handler / Server Action). */
export async function setTeacherCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Hapus cookie sesi guru. */
export async function clearTeacherCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
