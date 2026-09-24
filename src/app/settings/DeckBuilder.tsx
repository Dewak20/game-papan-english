"use client";

import { useMemo, useRef, useState } from "react";
import { usePlatformData, updatePlatformData } from "@/lib/store";
import {
  buildDeck,
  deckToCsv,
  deckToJson,
  parseDeck,
  type BuiltDeck,
  type DeckSkill,
} from "@/lib/deckBuilder";
import { useSavedDecks, saveDeck, removeDeck } from "@/lib/savedDecks";
import type { PlatformData } from "@/lib/store";

const SKILLS: { id: DeckSkill; label: string; icon: string; desc: string }[] = [
  { id: "vocabulary", label: "Kosakata", icon: "📚", desc: "English = Indonesia (Vocabulary Match)." },
  { id: "picture", label: "Tebak Gambar", icon: "🖼️", desc: "Kata + gambar AI (Tebak Gambar)." },
  { id: "spelling", label: "Ejaan", icon: "🐘", desc: "Ejaan dari gambar (Spelling Battle)." },
  { id: "sentence", label: "Kalimat", icon: "💬", desc: "Susun kalimat (Sentence Battle)." },
  { id: "grammar", label: "Grammar", icon: "📝", desc: "Present continuous (Continuous Battle)." },
  { id: "word-class", label: "Kelas Kata", icon: "🔤", desc: "Noun / Verb / Adjective (Word Battle)." },
];

const inputCls =
  "w-full rounded-xl border-2 border-line bg-ink-soft p-2.5 text-sm text-white outline-none focus:border-gold";
const btnCls = "focus-ring cursor-pointer rounded-xl px-5 py-2.5 font-bold transition-colors";

export function DeckBuilder({ onFlash }: { onFlash: (msg: string) => void }) {
  const data = usePlatformData();
  const importRef = useRef<HTMLInputElement | null>(null);

  const [skill, setSkill] = useState<DeckSkill>("vocabulary");
  const [title, setTitle] = useState("Deck Saya");
  const [limit, setLimit] = useState(0);
  const [category, setCategory] = useState("");
  const [deck, setDeck] = useState<BuiltDeck | null>(null);
  const saved = useSavedDecks();

  const categories = useMemo(
    () => Array.from(new Set(data.vocab.map((v) => v.category))).sort(),
    [data.vocab],
  );

  const showCategory = skill === "vocabulary" || skill === "picture";

  const build = () => {
    const built = buildDeck(data, {
      title,
      skill,
      limit: limit > 0 ? limit : undefined,
      category: showCategory && category ? category : undefined,
    });
    setDeck(built);
    if (built.items.length === 0) onFlash("Deck kosong — bank data untuk skill ini belum ada.");
    else onFlash(`Deck "${built.title}" dibuat: ${built.items.length} soal.`);
  };

  const download = (content: string, filename: string, mime: string) => {
    try {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  };

  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "deck";

  const exportJson = () => {
    if (!deck) return;
    const ok = download(deckToJson(deck), `${slug(deck.title)}.json`, "application/json");
    onFlash(ok ? "Deck diekspor ke JSON." : "Gagal mengekspor deck.");
  };

  const exportCsv = () => {
    if (!deck) return;
    const ok = download(deckToCsv(deck), `${slug(deck.title)}.csv`, "text/csv");
    onFlash(ok ? "Deck diekspor ke CSV (bisa dibuka di Excel)." : "Gagal mengekspor deck.");
  };

  const saveDeckNow = () => {
    if (!deck) return;
    saveDeck(deck);
    onFlash("Deck disimpan di perangkat ini.");
  };

  const doImportDeck = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseDeck(String(reader.result));
      if (!parsed) {
        onFlash("Berkas deck tidak valid.");
        return;
      }
      setDeck(parsed);
      setTitle(parsed.title);
      setSkill((parsed.skill as DeckSkill) ?? "vocabulary");
      onFlash(`Deck "${parsed.title}" diimpor: ${parsed.items.length} soal.`);
    };
    reader.readAsText(file);
  };

  /** Impor deck sebagai konten: kosakata → tab kosakata; kata → bank kata. */
  const applyToContent = () => {
    if (!deck) return;
    if (deck.skill === "vocabulary" || deck.skill === "picture") {
      const items = deck.items.filter((i) => i.answer && i.prompt);
      if (items.length === 0) {
        onFlash("Tidak ada item yang bisa dimasukkan.");
        return;
      }
      const patch: Partial<PlatformData> = {
        vocab: items.map((i) => ({
          en: i.prompt,
          id: i.answer,
          category: i.hint ?? "Impor",
        })),
      };
      updatePlatformData(patch);
      onFlash(`${items.length} kosakata dimasukkan ke bank data.`);
    } else if (deck.skill === "sentence") {
      updatePlatformData({ sentences: deck.items.map((i) => i.prompt).join("|") });
      onFlash(`${deck.items.length} kalimat dimasukkan ke bank data.`);
    } else {
      onFlash("Skill ini tidak punya pemetaan otomatis — gunakan Impor Excel/CSV.");
    }
  };

  const removeSaved = (t: string) => {
    removeDeck(t);
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-white">🧱 Pembuat Deck</h2>
        <p className="mt-1 text-sm text-muted">
          Rakit kumpulan soal dari bank data, lalu ekspor sebagai JSON/CSV untuk
          dibagikan ke papan lain atau diunggah ke cloud.
        </p>
      </div>

      {/* Pilih skill */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SKILLS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSkill(s.id)}
            className={`focus-ring cursor-pointer rounded-xl border-2 p-3 text-left transition-all ${
              skill === s.id
                ? "border-gold bg-gold/10"
                : "border-line bg-white/5 hover:border-white/40"
            }`}
          >
            <span className="text-lg">{s.icon}</span>{" "}
            <span className={`font-semibold ${skill === s.id ? "text-gold" : "text-white"}`}>
              {s.label}
            </span>
            <span className="mt-1 block text-xs text-muted">{s.desc}</span>
          </button>
        ))}
      </div>

      {/* Pengaturan deck */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-muted">Judul Deck</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-muted">Batas Soal (0 = semua)</span>
          <input
            type="number"
            min={0}
            value={limit}
            onChange={(e) => setLimit(Math.max(0, Number(e.target.value) || 0))}
            className={inputCls}
          />
        </label>
        {showCategory ? (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-muted">Kategori (opsional)</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              <option value="">Semua kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={build} className={`${btnCls} bg-green text-ink`}>
          🧱 Rakit Deck
        </button>
        <button
          type="button"
          onClick={() => importRef.current?.click()}
          className={`${btnCls} bg-gold text-ink`}
        >
          📂 Impor Deck (JSON)
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) doImportDeck(f);
            e.target.value = "";
          }}
        />
      </div>

      {deck ? (
        <div className="rounded-xl border border-line bg-ink-soft p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-xl text-white">{deck.title}</h3>
              <p className="text-sm text-muted">
                {deck.items.length} soal · skill: {deck.skill} · tag: {deck.tags.join(", ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={saveDeckNow} className={`${btnCls} bg-blue text-ink`}>
                💾 Simpan
              </button>
              <button type="button" onClick={exportJson} className={`${btnCls} bg-violet text-ink`}>
                ⬇️ JSON
              </button>
              <button type="button" onClick={exportCsv} className={`${btnCls} bg-teal text-ink`}>
                ⬇️ CSV
              </button>
              <button type="button" onClick={applyToContent} className={`${btnCls} bg-gold text-ink`}>
                ➕ Masukkan ke Bank Data
              </button>
            </div>
          </div>

          <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-line/60">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-white/5 text-left text-muted">
                  <th className="px-3 py-1.5">Prompt</th>
                  <th className="px-3 py-1.5">Jawaban</th>
                  <th className="px-3 py-1.5">Opsi</th>
                </tr>
              </thead>
              <tbody>
                {deck.items.slice(0, 50).map((it, i) => (
                  <tr key={i} className="border-b border-line/60">
                    <td className="px-3 py-1.5 text-white">{it.prompt}</td>
                    <td className="px-3 py-1.5 text-lime">{it.answer}</td>
                    <td className="px-3 py-1.5 text-muted">{it.options.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {saved.length > 0 ? (
        <div className="rounded-xl border border-line bg-ink-soft p-4">
          <h3 className="mb-2 font-display text-lg text-white">Deck Tersimpan ({saved.length})</h3>
          <ul className="space-y-1.5">
            {saved.map((d) => (
              <li key={d.title} className="flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setDeck(d);
                    setTitle(d.title);
                    setSkill((d.skill as DeckSkill) ?? "vocabulary");
                  }}
                  className="flex-1 text-left text-muted hover:text-white"
                >
                  📦 <b className="text-white">{d.title}</b> — {d.items.length} soal
                </button>
                <button
                  type="button"
                  onClick={() => removeSaved(d.title)}
                  className="focus-ring cursor-pointer rounded-lg border border-line px-2 py-1 text-xs text-muted hover:border-red/50 hover:text-red"
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
