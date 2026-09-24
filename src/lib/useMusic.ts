"use client";

import { useEffect, useRef } from "react";
import { getAudioCtx } from "./audio";
import { useAudioSettings } from "./audioSettings";
import type { MusicTheme } from "./musicThemes";

function playNote(
  ctx: AudioContext,
  freq: number,
  dur: number,
  wave: OscillatorType,
  vol: number,
  at: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), at + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

/**
 * Musik latar prosedural yang berulang. Aktif hanya ketika `active` true dan
 * pengaturan musik menyala. Tidak memakai state React sama sekali.
 */
export function useMusic(theme: MusicTheme | null, active: boolean) {
  const { music } = useAudioSettings();
  const timerRef = useRef<number | null>(null);
  const stoppedRef = useRef(true);

  useEffect(() => {
    if (!active || !music || !theme) return;
    const ctx = getAudioCtx();
    if (!ctx) return;

    stoppedRef.current = false;
    let step = 0;
    const stepSec = theme.stepMs / 1000;
    const noteAt = (semi: number) => theme.root * Math.pow(2, semi / 12);

    const tick = () => {
      if (stoppedRef.current) return;
      const c = getAudioCtx();
      if (!c) return;
      const now = c.currentTime;
      const idx = step % theme.pattern.length;
      const deg = theme.pattern[idx];

      if (deg !== null) {
        const semi = theme.scale[deg % theme.scale.length];
        playNote(c, noteAt(semi), stepSec * 1.7, theme.wave, theme.vol, now);
      }
      if (theme.bassEvery && step % theme.bassEvery === 0) {
        playNote(c, noteAt(-12), stepSec * 3.2, "sine", theme.vol * 0.9, now);
      }

      step += 1;
      timerRef.current = window.setTimeout(tick, theme.stepMs);
    };

    tick();

    return () => {
      stoppedRef.current = true;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [active, music, theme]);
}
