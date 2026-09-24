/**
 * Helper pembuat berkas ZIP/XLSX untuk pengujian (test-only).
 *
 * Menghasilkan arsip ZIP minimal yang valid dengan metode "store" (0) atau
 * "deflate" (8), supaya `unzip`/`parseXlsx` bisa diuji tanpa fixture biner.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** Bangun arsip ZIP (async karena kompresi memakai stream). */
export async function buildZipAsync(
  entries: ZipEntry[],
  compress = false,
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const method = compress ? 8 : 0;
    const stored = compress ? await deflateRaw(entry.data) : entry.data;

    const local = new Uint8Array(30 + nameBytes.length + stored.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, method, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, stored.length, true);
    lv.setUint32(22, entry.data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    local.set(stored, 30 + nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, method, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, stored.length, true);
    cv.setUint32(24, entry.data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centrals.push(central);

    offset += local.length;
  }

  const centralSize = centrals.reduce((n, c) => n + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const parts = [...locals, ...centrals, eocd];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out.buffer;
}

/** Versi sinkron (store-only) untuk kenyamanan di test. */
export function buildZip(entries: ZipEntry[]): ArrayBuffer {
  // Implementasi store-only sinkron (tanpa CompressionStream).
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);

    const local = new Uint8Array(30 + nameBytes.length + entry.data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, entry.data.length, true);
    lv.setUint32(22, entry.data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(entry.data, 30 + nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(10, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, entry.data.length, true);
    cv.setUint32(24, entry.data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centrals.push(central);

    offset += local.length;
  }

  const centralSize = centrals.reduce((n, c) => n + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const parts = [...locals, ...centrals, eocd];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out.buffer;
}

/** Bangun berkas XLSX minimal (store-only) dari XML worksheet + sharedStrings. */
export function makeXlsx(opts: { sheet: string; sharedStrings?: string }): ArrayBuffer {
  const enc = (s: string) => new TextEncoder().encode(s);
  return buildZip([
    { name: "[Content_Types].xml", data: enc("<Types/>") },
    { name: "xl/workbook.xml", data: enc("<workbook/>") },
    {
      name: "xl/worksheets/sheet1.xml",
      data: enc(`<?xml version="1.0"?>${opts.sheet}`),
    },
    ...(opts.sharedStrings
      ? [
          {
            name: "xl/sharedStrings.xml",
            data: enc(`<?xml version="1.0"?>${opts.sharedStrings}`),
          },
        ]
      : []),
  ]);
}
