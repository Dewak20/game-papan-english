"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Pembungkus Web Speech API (Text-to-Speech) untuk game Listening.
 *
 * Tidak memakai file audio sama sekali — suara dibangkitkan browser.
 * Menyediakan status `supported` agar game bisa menampilkan pesan cadangan
 * bila browser tidak punya voice bahasa Inggris.
 *
 * Catatan: audio TTS SENGAJA tidak digantungkan pada toggle SFX, karena
 * suara ini adalah isi permainan (bukan efek suara). Guru bisa memutar ulang
 * lewat tombol, dan mematikan suara perangkat bila perlu.
 */

interface SpeakOptions {
  /** kecepatan bicara (0.1–10). Default 0.85 agar jelas untuk siswa. */
  rate?: number;
  /** bahasa. Default "en-US". */
  lang?: string;
  /** dipanggil saat ucapan selesai */
  onEnd?: () => void;
}

export function useSpeech() {
  // null = belum diketahui (SSR) → hindari menampilkan pesan "tidak didukung" sekejap.
  const [supported, setSupported] = useState<boolean | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    // Cek dukungan setelah mount (hindari mismatch saat SSR).
    const ok = typeof window !== "undefined" && "speechSynthesis" in window;
    const id = setTimeout(() => setSupported(ok), 0);
    return () => clearTimeout(id);
  }, []);

  const speak = useCallback((text: string, opts: SpeakOptions = {}) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const lang = opts.lang ?? "en-US";
    u.lang = lang;
    // Pilih voice Inggris bila tersedia (banyak browser butuh voices dimuat dulu).
    const voices = synth.getVoices();
    const preferred =
      voices.find((v) => v.lang === lang) ??
      voices.find((v) => v.lang.startsWith("en"));
    if (preferred) u.voice = preferred;
    u.rate = opts.rate ?? 0.85;
    u.pitch = 1;
    u.volume = 1;
    u.onstart = () => setSpeaking(true);
    u.onend = () => {
      setSpeaking(false);
      opts.onEnd?.();
    };
    u.onerror = () => {
      setSpeaking(false);
      opts.onEnd?.();
    };
    synth.speak(u);
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { supported, speaking, speak, stop };
}
