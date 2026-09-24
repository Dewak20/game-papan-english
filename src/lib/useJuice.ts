"use client";

import { useCallback, useRef, useState } from "react";

export interface FloatItem {
  id: number;
  text: string;
  color: string;
  x: string;
  y: string;
}

export interface EffectPing {
  id: number;
  color: string;
  /** sisi tim yang memicu efek (opsional) */
  side?: "blue" | "red";
}

/**
 * State efek visual bersama (teks melayang, ledakan partikel, kilatan layar).
 * Semua penghapusan dilakukan lewat setTimeout di dalam callback — tidak ada
 * setState di dalam effect, sehingga aman terhadap aturan lint proyek.
 */
export function useJuice() {
  const idRef = useRef(0);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [burst, setBurst] = useState<EffectPing | null>(null);
  const [flash, setFlash] = useState<EffectPing | null>(null);

  const addFloat = useCallback(
    (text: string, color = "#fbbf24", x = "50%", y = "42%") => {
      const id = idRef.current++;
      setFloats((f) => [...f, { id, text, color, x, y }]);
      setTimeout(() => setFloats((f) => f.filter((x2) => x2.id !== id)), 1200);
    },
    [],
  );

  const addBurst = useCallback((color = "#fbbf24", side?: "blue" | "red") => {
    const id = idRef.current++;
    setBurst({ id, color, side });
    setTimeout(() => setBurst((b) => (b && b.id === id ? null : b)), 750);
  }, []);

  const addFlash = useCallback((color = "rgba(52,211,153,0.35)") => {
    const id = idRef.current++;
    setFlash({ id, color });
    setTimeout(() => setFlash((f) => (f && f.id === id ? null : f)), 480);
  }, []);

  return { floats, burst, flash, addFloat, addBurst, addFlash };
}
