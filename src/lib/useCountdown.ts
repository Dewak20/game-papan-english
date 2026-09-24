"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hitung mundur 3-2-1-GO. Menjalankan `onDone` setelah selesai.
 */
export function useCountdown(onDone: () => void) {
  const [count, setCount] = useState<number | null>(null);
  const [active, setActive] = useState(false);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const start = useCallback(() => {
    setActive(true);
    setCount(3);
  }, []);

  useEffect(() => {
    if (!active) return;
    if (count === null) return;
    const id = setTimeout(() => {
      if (count > 1) {
        setCount(count - 1);
      } else if (count === 1) {
        setCount(0); // menampilkan "GO!"
      } else {
        setActive(false);
        setCount(null);
        onDoneRef.current();
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [active, count]);

  return { count, active, start };
}
