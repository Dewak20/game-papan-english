"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pembungkus Web Speech API — **Speech Recognition** (mendengar ucapan siswa)
 * untuk game Pronounce It.
 *
 * Catatan penting:
 * - Hanya didukung Chrome/Edge (dan sebagian browser berbasis Chromium).
 * - Memerlukan **secure context** (https atau localhost). Diakses lewat
 *   `http://<IP-LAN>:3000` fitur ini TIDAK aktif — pakai mode guru manual.
 * - Tipe di bawah dibuat manual karena `SpeechRecognition` tidak selalu ada
 *   di definisi DOM TypeScript.
 */

interface SRAlternative {
  transcript: string;
  confidence: number;
}
interface SRResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SRAlternative;
}
interface SRResultList {
  readonly length: number;
  [index: number]: SRResult;
}
interface SREvent {
  resultIndex: number;
  results: SRResultList;
}
interface SRErrorEvent {
  error: string;
}
interface SRLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
}
type SRCtor = new () => SRLike;

function getCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRCtor;
    webkitSpeechRecognition?: SRCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition() {
  // null = belum diketahui (SSR) → hindari pesan "tidak didukung" sekejap.
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");

  const recRef = useRef<SRLike | null>(null);
  const finalRef = useRef<((text: string) => void) | null>(null);
  const errorRef = useRef<((code: string) => void) | null>(null);

  useEffect(() => {
    const ok = getCtor() !== null;
    const id = setTimeout(() => setSupported(ok), 0);
    return () => clearTimeout(id);
  }, []);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec) {
      try {
        rec.abort();
      } catch {
        /* abaikan */
      }
    }
    setListening(false);
  }, []);

  const start = useCallback(
    (onFinal: (text: string) => void, onError?: (code: string) => void) => {
      const Ctor = getCtor();
      if (!Ctor) return false;

      if (recRef.current) {
        try {
          recRef.current.abort();
        } catch {
          /* abaikan */
        }
      }

      const rec = new Ctor();
      recRef.current = rec;
      finalRef.current = onFinal;
      errorRef.current = onError ?? null;

      rec.lang = "en-US";
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setListening(true);
        setInterim("");
      };

      rec.onresult = (e: SREvent) => {
        let text = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          text += e.results[i][0].transcript;
        }
        setInterim(text.trim());
        const last = e.results[e.results.length - 1];
        if (last && last.isFinal) {
          finalRef.current?.(text.trim());
        }
      };

      rec.onerror = (e: SRErrorEvent) => {
        setListening(false);
        errorRef.current?.(e.error);
      };

      rec.onend = () => {
        setListening(false);
      };

      try {
        rec.start();
      } catch {
        setListening(false);
        return false;
      }
      return true;
    },
    [],
  );

  return { supported, listening, interim, start, stop };
}
