"use client";

import { toggleMusic, toggleSfx, useAudioSettings } from "@/lib/audioSettings";

/**
 * Tombol kecil untuk menyalakan/mematikan efek suara & musik latar.
 * Dipakai di header setiap game dan di beranda.
 */
export function AudioToggles({ className = "" }: { className?: string }) {
  const { sfx, music } = useAudioSettings();

  const btn = (active: boolean) =>
    `focus-ring flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border text-lg transition-colors ${
      active
        ? "border-white/40 bg-white/10 text-white"
        : "border-line bg-white/5 text-muted/50 hover:border-white/30"
    }`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={toggleSfx}
        aria-label={sfx ? "Matikan efek suara" : "Nyalakan efek suara"}
        title={sfx ? "Efek suara: nyala" : "Efek suara: mati"}
        className={btn(sfx)}
      >
        {sfx ? "🔊" : "🔇"}
      </button>
      <button
        type="button"
        onClick={toggleMusic}
        aria-label={music ? "Matikan musik latar" : "Nyalakan musik latar"}
        title={music ? "Musik latar: nyala" : "Musik latar: mati"}
        className={btn(music)}
      >
        {music ? "🎵" : "🔕"}
      </button>
    </div>
  );
}
