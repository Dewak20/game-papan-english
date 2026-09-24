/**
 * Pembaca berkas tabel (CSV / TSV / XLSX) — murni, tanpa dependensi eksternal.
 *
 * Dipakai Panel Guru untuk mengimpor soal/kata dari Excel atau CSV. Semua
 * fungsi di sini bebas dari React/DOM sehingga mudah diuji (lihat
 * `tabular.test.ts`) dan aman dipanggil dari Web Worker bila perlu.
 *
 * XLSX dibaca dengan membuka arsip ZIP-nya sendiri memakai `DecompressionStream`
 * bawaan runtime (browser modern & Node 18+), jadi tidak perlu library tambahan.
 */

export type TableFormat = "csv" | "tsv" | "xlsx";

export interface ParsedTable {
  format: TableFormat;
  /** Nama kolom (baris pertama). Selalu ada, walau kosong. */
  headers: string[];
  /** Baris data (tanpa header). Panjang tiap baris disamakan dengan header. */
  rows: string[][];
}

/* ============================ CSV / TSV ============================ */

/**
 * Pisah teks ber-delimiter menjadi matriks string.
 * Mendukung tanda kutip ganda (`""` = kutip literal), pemisah baris `\n`/`\r\n`,
 * serta nilai multi-baris di dalam kutip.
 */
export function parseDelimited(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const src = text.replace(/^\uFEFF/, ""); // buang BOM

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < src.length) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"' && field.length === 0) {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === delimiter) {
      pushField();
      i++;
      continue;
    }
    if (ch === "\r") {
      // \r\n atau \r tunggal
      if (src[i + 1] === "\n") i++;
      pushRow();
      i++;
      continue;
    }
    if (ch === "\n") {
      pushRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }

  // Baris terakhir (bila tidak diakhiri newline).
  if (field.length > 0 || row.length > 0) pushRow();

  // Buang baris yang benar-benar kosong.
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Tebak delimiter dari baris pertama (koma, titik-koma, tab). */
export function detectDelimiter(text: string): "," | ";" | "\t" {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  const counts: Record<"," | ";" | "\t", number> = { ",": 0, ";": 0, "\t": 0 };
  for (const ch of firstLine) {
    if (ch === "," || ch === ";" || ch === "\t") counts[ch]++;
  }
  if (counts["\t"] >= counts[","] && counts["\t"] >= counts[";"]) return "\t";
  if (counts[";"] > counts[","]) return ";";
  return ",";
}

/* ================================ ZIP ================================ */

const EOCD_SIG = 0x06054b50;
const CDH_SIG = 0x02014b50;
const LFH_SIG = 0x04034b50;

function findEOCD(view: DataView): number {
  // EOCD minimal 22 byte; komentar maksimum 65535.
  const min = Math.max(0, view.byteLength - 22 - 0xffff);
  for (let i = view.byteLength - 22; i >= min; i--) {
    if (view.getUint32(i, true) === EOCD_SIG) return i;
  }
  return -1;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Buka arsip ZIP dari sebuah ArrayBuffer → Map nama-berkas → isi (Uint8Array).
 * Mendukung metode "store" (0) dan "deflate" (8) yang dipakai semua XLSX.
 */
export async function unzip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const files = new Map<string, Uint8Array>();

  const eocd = findEOCD(view);
  if (eocd < 0) throw new Error("Bukan berkas ZIP/XLSX yang valid.");

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);

  const decoder = new TextDecoder();

  for (let n = 0; n < count; n++) {
    if (view.getUint32(offset, true) !== CDH_SIG) break;
    const method = view.getUint16(offset + 10, true);
    const compSize = view.getUint32(offset + 20, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLen));

    if (view.getUint32(localOffset, true) === LFH_SIG) {
      const lNameLen = view.getUint16(localOffset + 26, true);
      const lExtraLen = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + lNameLen + lExtraLen;
      const raw = bytes.subarray(dataStart, dataStart + compSize);
      if (method === 0) {
        files.set(name, raw.slice());
      } else if (method === 8) {
        files.set(name, await inflateRaw(raw));
      }
    }

    offset += 46 + nameLen + extraLen + commentLen;
  }

  return files;
}

/* =============================== XLSX =============================== */

/** Ubah referensi kolom Excel ("A", "AB") menjadi indeks 0-based. */
export function columnIndex(ref: string): number {
  const letters = ref.replace(/[^A-Z]/gi, "").toUpperCase();
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

function parseSharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  const out: string[] = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml))) {
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let t: RegExpExecArray | null;
    let text = "";
    while ((t = tRe.exec(m[1]))) text += decodeXml(t[1]);
    out.push(text);
  }
  return out;
}

function parseSheet(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g;
  let rm: RegExpExecArray | null;

  while ((rm = rowRe.exec(xml))) {
    const cells: string[] = [];
    const cellRe = /<c\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm: RegExpExecArray | null;
    let auto = 0;

    while ((cm = cellRe.exec(rm[1]))) {
      const attrs = cm[1];
      const inner = cm[2] ?? "";
      const refMatch = attrs.match(/\br="([A-Z]+\d+)"/);
      const idx = refMatch ? columnIndex(refMatch[1]) : auto;
      auto = idx + 1;

      const typeMatch = attrs.match(/\bt="([^"]+)"/);
      const type = typeMatch ? typeMatch[1] : "n";

      let value = "";
      if (type === "inlineStr") {
        const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
        let t: RegExpExecArray | null;
        while ((t = tRe.exec(inner))) value += decodeXml(t[1]);
      } else {
        const vMatch = inner.match(/<v[^>]*>([\s\S]*?)<\/v>/);
        const raw = vMatch ? decodeXml(vMatch[1]) : "";
        if (type === "s") value = shared[Number(raw)] ?? "";
        else value = raw;
      }

      while (cells.length < idx) cells.push("");
      cells[idx] = value;
    }

    rows.push(cells);
  }

  return rows;
}

/** Baca sheet pertama dari berkas XLSX (ArrayBuffer) menjadi matriks string. */
export async function parseXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const files = await unzip(buffer);

  const shared = parseSharedStrings(
    files.has("xl/sharedStrings.xml")
      ? new TextDecoder().decode(files.get("xl/sharedStrings.xml"))
      : undefined,
  );

  // Cari sheet pertama: pakai sheet1.xml, atau yang pertama secara urut nama.
  let sheetName: string | undefined;
  if (files.has("xl/worksheets/sheet1.xml")) {
    sheetName = "xl/worksheets/sheet1.xml";
  } else {
    sheetName = [...files.keys()]
      .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
      .sort()[0];
  }
  if (!sheetName) throw new Error("Berkas XLSX tidak punya worksheet.");

  const xml = new TextDecoder().decode(files.get(sheetName));
  return parseSheet(xml, shared);
}

/* ============================== Umum ============================== */

function normalize(rows: string[][]): ParsedTable {
  const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const padded = rows.map((r) => {
    const copy = [...r];
    while (copy.length < width) copy.push("");
    return copy.map((c) => c.trim());
  });
  return {
    format: "csv",
    headers: padded[0] ?? [],
    rows: padded.slice(1),
  };
}

/** Susun tabel (matriks string) menjadi `ParsedTable` dengan header eksplisit. */
export function toParsedTable(rows: string[][], format: TableFormat): ParsedTable {
  const table = normalize(rows);
  return { ...table, format };
}

/**
 * Deteksi format dari nama berkas + isi, lalu uraikan menjadi `ParsedTable`.
 * Menerima `File`/`Blob` (browser) maupun buffer mentah.
 */
export async function parseTableFile(file: File): Promise<ParsedTable> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) {
    const buf = await file.arrayBuffer();
    return toParsedTable(await parseXlsx(buf), "xlsx");
  }

  const text = await file.text();
  const delimiter = name.endsWith(".tsv")
    ? "\t"
    : name.endsWith(".csv")
      ? ","
      : detectDelimiter(text);
  const format: TableFormat = delimiter === "\t" ? "tsv" : "csv";
  return toParsedTable(parseDelimited(text, delimiter), format);
}
