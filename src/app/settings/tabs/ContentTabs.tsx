"use client";

import { useState } from "react";
import { usePlatformData, updatePlatformData } from "@/lib/store";
import type { ContinuousQuestion } from "@/lib/types";
import type { VocabPair } from "@/lib/vocabulary";
import { TextBankEditor } from "@/components/TextBankEditor";

/** Tab "Bank Kalimat" (Sentence Battle). */
export function SentencesTab({ flash }: { flash: (msg: string) => void }) {
  const data = usePlatformData();
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <TextBankEditor
      title="Bank Kalimat"
      subtitle={
        <>
          Untuk game Sentence Battle. Pisahkan dengan tanda{" "}
          <code className="text-gold">|</code>
        </>
      }
      value={draft ?? data.sentences}
      onChange={setDraft}
      onLoad={() => setDraft(data.sentences)}
      onLoadLabel="Muat ke Editor"
      onSave={() => {
        const val = draft ?? data.sentences;
        if (val.trim().length === 0) {
          flash("Bank kalimat tidak boleh kosong.");
          return;
        }
        updatePlatformData({ sentences: val });
        flash("Bank kalimat disimpan.");
      }}
      saveLabel="💾 Simpan Bank Kalimat"
    />
  );
}

/** Tab "Soal Grammar" (Continuous Battle). */
export function QuestionsTab({ flash }: { flash: (msg: string) => void }) {
  const data = usePlatformData();
  const [draft, setDraft] = useState("");

  const toText = () =>
    data.questions
      .map((q) => `${q.q} | ${q.opts[0]} | ${q.opts[1]} | ${q.ans === 0 ? 1 : 2}`)
      .join("\n");

  const apply = () => {
    const rows = draft
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: ContinuousQuestion[] = [];
    for (const row of rows) {
      const parts = row.split("|").map((p) => p.trim());
      if (parts.length >= 4) {
        const ansNum = Number(parts[3]);
        if (parts[0] && parts[1] && parts[2] && (ansNum === 1 || ansNum === 2)) {
          parsed.push({
            q: parts[0],
            opts: [parts[1], parts[2]],
            ans: ansNum === 1 ? 0 : 1,
          });
        }
      }
    }
    if (parsed.length === 0) {
      flash("Format salah. Gunakan: SOAL | OPSI1 | OPSI2 | JAWABAN(1/2)");
      return;
    }
    updatePlatformData({ questions: parsed });
    flash(`${parsed.length} soal disimpan.`);
  };

  return (
    <TextBankEditor
      title="Soal Grammar"
      subtitle={<>Untuk game Continuous Battle. Total: {data.questions.length} soal</>}
      hint={
        <>
          Satu soal per baris:{" "}
          <code className="rounded bg-ink-soft px-1.5 py-0.5 text-gold">
            SOAL | OPSI1 | OPSI2 | JAWABAN(1/2)
          </code>
        </>
      }
      value={draft}
      onChange={setDraft}
      onLoad={() => setDraft(toText())}
      onLoadLabel="Muat Soal Saat Ini"
      onSave={apply}
      saveLabel="💾 Simpan Soal Grammar"
      placeholder="SHE ___ READING | IS | ARE | 1"
    />
  );
}

/** Tab "Kosakata" (Vocabulary Match dkk). */
export function VocabTab({ flash }: { flash: (msg: string) => void }) {
  const data = usePlatformData();
  const [draft, setDraft] = useState<string | null>(null);

  const toText = () => data.vocab.map((v) => `${v.en} = ${v.id} [${v.category}]`).join("\n");

  const apply = () => {
    const rows = (draft ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed: VocabPair[] = [];
    for (const row of rows) {
      const catMatch = row.match(/\[(.+?)\]\s*$/);
      const cat = catMatch ? catMatch[1].trim() : "Umum";
      const body = catMatch ? row.slice(0, catMatch.index).trim() : row;
      const parts = body.split("=").map((p) => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        parsed.push({ en: parts[0], id: parts[1], category: cat });
      }
    }
    if (parsed.length === 0) {
      flash("Format salah. Gunakan: english = indonesia [Kategori]");
      return;
    }
    updatePlatformData({ vocab: parsed });
    setDraft(null);
    flash(`${parsed.length} kosakata disimpan.`);
  };

  return (
    <TextBankEditor
      title="Kosakata"
      subtitle={<>Untuk game Vocabulary Match. Total: {data.vocab.length} kata</>}
      hint={
        <>
          Satu kata per baris:{" "}
          <code className="rounded bg-ink-soft px-1.5 py-0.5 text-gold">
            english = indonesia [Kategori]
          </code>
          . Kategori opsional (default: Umum); kata dengan kategori sama akan saling
          jadi pilihan pengecoh.
        </>
      }
      value={draft ?? toText()}
      onChange={setDraft}
      onLoad={() => setDraft(toText())}
      onLoadLabel="Muat Kosakata Saat Ini"
      onSave={apply}
      saveLabel="💾 Simpan Kosakata"
      placeholder="cat = Kucing [Hewan]"
      heightClass="h-80"
    />
  );
}
