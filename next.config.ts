import type { NextConfig } from "next";

/**
 * Content-Security-Policy.
 *
 * Aplikasi ini hampir seluruhnya statis (tanpa nonce), jadi CSP dipasang
 * sebagai header statis. `'unsafe-eval'` hanya ditambahkan saat mode
 * pengembangan karena tooling Next.js/Turbopack membutuhkannya.
 *
 * Catatan: `upgrade-insecure-requests` sengaja TIDAK dipakai karena aplikasi
 * dijalankan di LAN lewat `http://IP:3000` (upgrade akan merusak akses lokal).
 */
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://image.pollinations.ai",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  "connect-src 'self' https://image.pollinations.ai",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.pollinations.ai",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=(), browsing-topics=()",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
      {
        // Service worker harus selalu segar dan tidak boleh di-cache.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
