"use client";

import { useState } from "react";
import { usePlatformData, updatePlatformData } from "@/lib/store";

const inputCls =
  "w-full rounded-xl border-2 border-line bg-ink-soft p-3 font-mono text-sm text-white outline-none focus:border-gold";

function parseList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const GROUPS = [
  { key: "nouns", label: "Noun (Kata Benda)", color: "text-blue" },
  { key: "verbs", label: "Verb (Kata Kerja)", color: "text-red" },
  { key: "adjectives", label: "Adjective (Kata Sifat)", color: "text-gold" },
  { key: "animals", label: "Animals (Spelling Battle)", color: "text-green" },
] as const;

/** Tab "Bank Kata" (Word Battle & Spelling Battle). */
export function WordsTab({ flash }: { flash: (msg: string) => void }) {
  const data = usePlatformData();
  const [draft, setDraft] = useState<Record<string, string>>({});

  return (
    <section className="space-y-6">
      <h2 className="font-display text-2xl text-white">Bank Kata</h2>
      <p className="-mt-4 text-sm text-muted">
        Untuk game Word Battle & Spelling Battle. Pisahkan dengan koma atau baris baru.
      </p>

      {GROUPS.map(({ key, label, color }) => (
        <div key={key}>
          <label className={`mb-2 block font-bold ${color}`}>
            {label} · {data[key].length} kata
          </label>
          <textarea
            value={draft[key] ?? data[key].join(", ")}
            onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
            className={`${inputCls} h-32`}
          />
          <button
            type="button"
            onClick={() => {
              const val = draft[key] ?? data[key].join(", ");
              const list = parseList(val);
              if (list.length === 0) {
                flash("Daftar kata tidak boleh kosong.");
                return;
              }
              updatePlatformData({ [key]: list } as never);
              setDraft((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
              });
              flash(`${label}: ${list.length} kata disimpan.`);
            }}
            className="focus-ring mt-2 cursor-pointer rounded-xl bg-green px-5 py-2.5 font-bold text-ink transition-colors"
          >
            💾 Simpan {label.split(" ")[0]}
          </button>
        </div>
      ))}
    </section>
  );
}
