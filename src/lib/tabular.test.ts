import { describe, expect, it } from "vitest";
import {
  columnIndex,
  detectDelimiter,
  parseDelimited,
  toParsedTable,
  parseXlsx,
  unzip,
} from "./tabular";
import {
  tableToGrammar,
  tableToSentenceBank,
  tableToStudents,
  tableToVocab,
  tableToWordList,
  toCsv,
  vocabToCsv,
} from "./importers";
import { buildZip, buildZipAsync, makeXlsx } from "./testZip";

describe("parseDelimited", () => {
  it("memisah baris & kolom sederhana", () => {
    expect(parseDelimited("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("mendukung kutip ganda & pemisah di dalam kutip", () => {
    expect(parseDelimited('name,note\n"cat, big","He said ""hi"""')).toEqual([
      ["name", "note"],
      ["cat, big", 'He said "hi"'],
    ]);
  });

  it("mendukung nilai multi-baris dalam kutip", () => {
    expect(parseDelimited('a\n"line1\nline2"')).toEqual([["a"], ["line1\nline2"]]);
  });

  it("menangani CRLF dan membuang baris kosong", () => {
    expect(parseDelimited("a,b\r\n\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("membuang BOM di awal", () => {
    expect(parseDelimited("\uFEFFa,b")).toEqual([["a", "b"]]);
  });
});

describe("detectDelimiter", () => {
  it("mendeteksi koma", () => {
    expect(detectDelimiter("a,b,c")).toBe(",");
  });
  it("mendeteksi titik-koma", () => {
    expect(detectDelimiter("a;b;c")).toBe(";");
  });
  it("mendeteksi tab", () => {
    expect(detectDelimiter("a\tb\tc")).toBe("\t");
  });
});

describe("columnIndex", () => {
  it("mengubah huruf kolom ke indeks 0-based", () => {
    expect(columnIndex("A1")).toBe(0);
    expect(columnIndex("B2")).toBe(1);
    expect(columnIndex("Z9")).toBe(25);
    expect(columnIndex("AA1")).toBe(26);
    expect(columnIndex("AB1")).toBe(27);
  });
});

describe("toParsedTable", () => {
  it("menyamakan lebar baris & memisah header", () => {
    const t = toParsedTable(
      [
        ["English", "Indonesia"],
        ["cat", "Kucing"],
        ["dog"],
      ],
      "csv",
    );
    expect(t.headers).toEqual(["English", "Indonesia"]);
    expect(t.rows).toEqual([
      ["cat", "Kucing"],
      ["dog", ""],
    ]);
  });
});

describe("unzip + parseXlsx", () => {
  it("membaca berkas XLSX minimal (inline + shared string)", async () => {
    const xlsx = makeXlsx({
      sheet: `<worksheet><sheetData>
        <row r="1"><c r="A1" t="inlineStr"><is><t>English</t></is></c><c r="B1" t="inlineStr"><is><t>Indonesia</t></is></c></row>
        <row r="2"><c r="A2" t="s"><v>0</v></c><c r="B2" t="inlineStr"><is><t>Kucing</t></is></c></row>
      </sheetData></worksheet>`,
      sharedStrings: `<sst><si><t>cat</t></si></sst>`,
    });
    const rows = await parseXlsx(xlsx);
    expect(rows[0]).toEqual(["English", "Indonesia"]);
    expect(rows[1]).toEqual(["cat", "Kucing"]);
  });

  it("membuka ZIP store (tanpa kompresi)", async () => {
    const zip = buildZip([{ name: "a.txt", data: new TextEncoder().encode("hello") }]);
    const files = await unzip(zip);
    expect(new TextDecoder().decode(files.get("a.txt"))).toBe("hello");
  });

  it("membuka ZIP terkompresi (deflate)", async () => {
    const zip = await buildZipAsync(
      [{ name: "a.txt", data: new TextEncoder().encode("hello world hello world") }],
      true,
    );
    const files = await unzip(zip);
    expect(new TextDecoder().decode(files.get("a.txt"))).toBe("hello world hello world");
  });

  it("melempar galat untuk buffer bukan ZIP", async () => {
    await expect(unzip(new Uint8Array([1, 2, 3, 4]).buffer)).rejects.toThrow();
  });
});

describe("importers", () => {
  const vocabTable = toParsedTable(
    [
      ["English", "Indonesia", "Kategori"],
      ["cat", "Kucing", "Hewan"],
      ["dog", "Anjing", ""],
      ["", "", ""],
    ],
    "csv",
  );

  it("tableToVocab memetakan kolom + default kategori", () => {
    const res = tableToVocab(vocabTable, { en: 0, id: 1, category: 2 });
    expect(res.data).toEqual([
      { en: "cat", id: "Kucing", category: "Hewan" },
      { en: "dog", id: "Anjing", category: "Umum" },
    ]);
    expect(res.errors).toHaveLength(0);
  });

  it("tableToVocab melaporkan baris rusak", () => {
    const t = toParsedTable([["English", "Indonesia"], ["cat", ""]], "csv");
    const res = tableToVocab(t, { en: 0, id: 1 });
    expect(res.data).toHaveLength(0);
    expect(res.errors[0].line).toBe(2);
  });

  it("tableToStudents memparse nilai & melaporkan nilai salah", () => {
    const t = toParsedTable(
      [
        ["NISN", "Nama", "Nilai"],
        ["001", "Adinda", "1288"],
        ["002", "Budi", "abc"],
        ["003", "Cici", ""],
      ],
      "csv",
    );
    const res = tableToStudents(t, { nisn: 0, nama: 1, nilai: 2 });
    expect(res.data).toEqual([
      { nisn: "001", nama: "Adinda", total_nilai: 1288 },
      { nisn: "003", nama: "Cici", total_nilai: 0 },
    ]);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].line).toBe(3);
  });

  it("tableToGrammar menerima indeks jawaban 1/2", () => {
    const t = toParsedTable(
      [
        ["Soal", "Opsi1", "Opsi2", "Jawaban"],
        ["She ___ reading", "is", "are", "1"],
        ["They ___ playing", "is", "are", "2"],
        ["Bad", "x", "y", "3"],
      ],
      "csv",
    );
    const res = tableToGrammar(t, { q: 0, options: [1, 2], answerIndex: 3 });
    expect(res.data).toEqual([
      { q: "She ___ reading", opts: ["is", "are"], ans: 0 },
      { q: "They ___ playing", opts: ["is", "are"], ans: 1 },
    ]);
    expect(res.errors).toHaveLength(1);
  });

  it("tableToGrammar menerima teks jawaban", () => {
    const t = toParsedTable(
      [
        ["Soal", "A", "B", "Kunci"],
        ["He ___ a boy", "is", "are", "is"],
      ],
      "csv",
    );
    const res = tableToGrammar(t, { q: 0, options: [1, 2], answerText: 3 });
    expect(res.data[0].ans).toBe(0);
  });

  it("tableToWordList & tableToSentenceBank membuang duplikat", () => {
    const t = toParsedTable([["Kata"], ["cat"], ["dog"], ["cat"], [" bird "]], "csv");
    expect(tableToWordList(t)).toEqual(["cat", "dog", "bird"]);
    expect(tableToSentenceBank(t)).toBe("cat|dog|bird");
  });

  it("toCsv mengutip sel yang perlu", () => {
    expect(toCsv([["a,b", 'x"y', "z\nq"]])).toBe('"a,b","x""y","z\nq"');
  });

  it("vocabToCsv menyertakan header", () => {
    const csv = vocabToCsv([{ en: "cat", id: "Kucing", category: "Hewan" }]);
    expect(csv.split("\r\n")[0]).toBe("English,Indonesia,Kategori");
    expect(csv).toContain("cat,Kucing,Hewan");
  });
});
