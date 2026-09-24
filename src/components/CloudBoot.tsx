"use client";

import { useEffect } from "react";
import { initSync } from "@/lib/sync";

/**
 * Menyalakan mesin sinkron cloud sekali saat aplikasi dimuat (Fase 1.5).
 *
 * Tidak merender apa pun. Bila server tidak punya `DATABASE_URL`, mesin ini
 * tetap aman: hanya menandai status "lokal" dan tidak pernah mengirim apa pun.
 */
export function CloudBoot() {
  useEffect(() => {
    initSync();
  }, []);

  return null;
}
