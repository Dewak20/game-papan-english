/**
 * Generator ikon PWA tanpa dependensi eksternal (hanya `zlib` bawaan Node).
 *
 * Menghasilkan PNG RGBA asli (anti-aliased via supersampling) untuk:
 *   - public/icons/icon-192.png
 *   - public/icons/icon-512.png
 *   - public/icons/icon-maskable-512.png
 *   - src/app/icon.png           (ikon tab browser, 512)
 *   - src/app/apple-icon.png     (apple-touch-icon, 180)
 *
 * Jalankan: node scripts/gen-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ----------------------------- PNG encoder ----------------------------- */

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* --------------------------- Raster utilities --------------------------- */

const SS = 4; // supersampling factor

function hex(h) {
  const s = h.replace("#", "");
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Gambar dengan alpha-over ke buffer RGBA (di ruang supersampled). */
function blend(buf, w, x, y, rgb, alpha) {
  if (alpha <= 0 || x < 0 || y < 0 || x >= w) return;
  const i = (y * w + x) * 4;
  const a = Math.min(1, alpha);
  const da = buf[i + 3] / 255;
  const outA = a + da * (1 - a);
  if (outA <= 0) return;
  for (let c = 0; c < 3; c++) {
    buf[i + c] = Math.round((rgb[c] * a + buf[i + c] * da * (1 - a)) / outA);
  }
  buf[i + 3] = Math.round(outA * 255);
}

/** Isi rounded-rect dengan fungsi warna (x,y ternormalisasi 0..1). */
function fillRoundedRect(buf, W, H, x0, y0, x1, y1, r, colorFn) {
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
      const cx = Math.min(Math.max(x + 0.5, x0 + r), x1 - r);
      const cy = Math.min(Math.max(y + 0.5, y0 + r), y1 - r);
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r * r) continue;
      const u = (x + 0.5 - x0) / (x1 - x0);
      const v = (y + 0.5 - y0) / (y1 - y0);
      blend(buf, W, x, y, colorFn(u, v), 1);
    }
  }
}

/** Isi poligon (even-odd / ray cast) dengan fungsi warna. */
function fillPolygon(buf, W, H, pts, colorFn) {
  let minY = Infinity;
  let maxY = -Infinity;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const [px, py] of pts) {
    minY = Math.min(minY, py);
    maxY = Math.max(maxY, py);
    minX = Math.min(minX, px);
    maxX = Math.max(maxX, px);
  }
  for (let y = Math.floor(minY); y < Math.ceil(maxY); y++) {
    for (let x = Math.floor(minX); x < Math.ceil(maxX); x++) {
      const cx = x + 0.5;
      const cy = y + 0.5;
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > cy !== yj > cy && cx < ((xj - xi) * (cy - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      if (inside) blend(buf, W, x, y, colorFn(cx, cy), 1);
    }
  }
}

function starPoints(cx, cy, outer, inner, spikes = 5) {
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / spikes;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/* ------------------------------- Painting ------------------------------- */

const INK = hex("#05070f");
const PANEL = hex("#131a33");
const BLUE = hex("#38bdf8");
const BLUE_DEEP = hex("#1d4ed8");
const RED = hex("#fb7185");
const RED_DEEP = hex("#dc2626");
const GOLD = hex("#fbbf24");
const GOLD_DEEP = hex("#b45309");
const LIME = hex("#a3e635");

/**
 * Render satu ikon ke buffer RGBA ukuran `size`.
 * `maskable` → latar penuh (full-bleed) + emblem diperkecil agar aman di zona crop.
 */
function renderIcon(size, { maskable = false } = {}) {
  const W = size * SS;
  const H = size * SS;
  const buf = Buffer.alloc(W * H * 4, 0);
  const s = W;

  const radius = maskable ? 0 : s * 0.22;

  // Latar gradien gelap (rounded kecuali maskable → full-bleed).
  fillRoundedRect(buf, W, H, 0, 0, s, s, radius, (_u, v) => [
    Math.round(lerp(PANEL[0], INK[0], v)),
    Math.round(lerp(PANEL[1], INK[1], v)),
    Math.round(lerp(PANEL[2], INK[2], v)),
  ]);

  // Glow lime lembut di bagian atas.
  const glowR = s * 0.55;
  const gcx = s * 0.5;
  const gcy = s * 0.16;
  for (let y = Math.max(0, gcy - glowR); y < Math.min(H, gcy + glowR); y++) {
    for (let x = Math.max(0, gcx - glowR); x < Math.min(W, gcx + glowR); x++) {
      const d = Math.hypot(x - gcx, y - gcy) / glowR;
      if (d > 1) continue;
      blend(buf, W, x, y, LIME, 0.14 * (1 - d) * (1 - d));
    }
  }

  const scale = maskable ? 0.78 : 1;
  const off = (s * (1 - scale)) / 2;
  const S = (v) => off + v * s * scale;

  // Dua "kartu tim" (biru & merah).
  const cardTop = S(0.50);
  const cardBot = S(0.85);
  const cardR = s * 0.055 * scale;
  fillRoundedRect(buf, W, H, S(0.13), cardTop, S(0.485), cardBot, cardR, (_u, v) => [
    Math.round(lerp(BLUE[0], BLUE_DEEP[0], v)),
    Math.round(lerp(BLUE[1], BLUE_DEEP[1], v)),
    Math.round(lerp(BLUE[2], BLUE_DEEP[2], v)),
  ]);
  fillRoundedRect(buf, W, H, S(0.515), cardTop, S(0.87), cardBot, cardR, (_u, v) => [
    Math.round(lerp(RED[0], RED_DEEP[0], v)),
    Math.round(lerp(RED[1], RED_DEEP[1], v)),
    Math.round(lerp(RED[2], RED_DEEP[2], v)),
  ]);

  // Bintang emas di tengah atas.
  const starOuter = s * 0.155 * scale;
  const starInner = s * 0.062 * scale;
  const starCx = s * 0.5;
  const starCy = S(0.30);
  // Garis tepi gelap agar kontras.
  fillPolygon(
    buf,
    W,
    H,
    starPoints(starCx, starCy, starOuter * 1.14, starInner * 1.2),
    () => INK,
  );
  fillPolygon(
    buf,
    W,
    H,
    starPoints(starCx, starCy, starOuter, starInner),
    (cx, cy) => {
      const t = (cy - (starCy - starOuter)) / (starOuter * 2);
      return [
        Math.round(lerp(GOLD[0], GOLD_DEEP[0], t)),
        Math.round(lerp(GOLD[1], GOLD_DEEP[1], t)),
        Math.round(lerp(GOLD[2], GOLD_DEEP[2], t)),
      ];
    },
  );

  return downsample(buf, W, H, size);
}

function downsample(buf, W, H, size) {
  const out = Buffer.alloc(size * size * 4, 0);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let dy = 0; dy < SS; dy++) {
        for (let dx = 0; dx < SS; dx++) {
          const i = ((y * SS + dy) * W + (x * SS + dx)) * 4;
          const pa = buf[i + 3] / 255;
          r += buf[i] * pa;
          g += buf[i + 1] * pa;
          b += buf[i + 2] * pa;
          a += pa;
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      if (a > 0) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
      }
      out[o + 3] = Math.round((a / n) * 255);
    }
  }
  return out;
}

/* -------------------------------- Output -------------------------------- */

function write(path, size, opts) {
  const png = encodePNG(size, size, renderIcon(size, opts));
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, png);
  console.log(`✓ ${path} (${size}x${size}, ${png.length} bytes)`);
}

write("public/icons/icon-192.png", 192);
write("public/icons/icon-512.png", 512);
write("public/icons/icon-maskable-512.png", 512, { maskable: true });
write("src/app/icon.png", 512);
write("src/app/apple-icon.png", 180);
