import type { MetadataRoute } from "next";

/**
 * Web App Manifest (PWA) — membuat platform bisa dipasang ke home screen
 * sebagai aplikasi berdiri sendiri, cocok untuk papan besar kelas.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Battle Learning Platform",
    short_name: "BattleLearn",
    description:
      "Platform pembelajaran interaktif berbasis permainan untuk layar papan besar kelas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "landscape",
    background_color: "#05070f",
    theme_color: "#05070f",
    lang: "id",
    categories: ["education", "games"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
