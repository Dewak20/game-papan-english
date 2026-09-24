"use client";

/**
 * Satu AudioContext dipakai bersama oleh semua efek suara (SFX) dan musik latar
 * agar tidak menabrak batas jumlah AudioContext di browser.
 */

let ctx: AudioContext | null = null;

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };

export function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
