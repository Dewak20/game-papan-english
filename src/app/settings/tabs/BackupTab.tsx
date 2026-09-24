"use client";

import { useRef, useState } from "react";
import {
  usePlatformData,
  resetPlatformData,
  exportData,
  importData,
  defaultData,
} from "@/lib/store";
import { setPin } from "@/lib/pin";

const inputCls =
  "w-full rounded-xl border-2 border-line bg-ink-soft p-3 font-mono text-sm text-white outline-none focus:border-gold";
const btnCls = "focus-ring cursor-pointer rounded-xl px-5 py-2.5 font-bold transition-colors";

/** Tab "Cadangkan" — ekspor/impor JSON, reset, dan ganti PIN. */
export function BackupTab({ flash }: { flash: (msg: string) => void }) {
  const data = usePlatformData();
  const importRef = useRef<HTMLInputElement | null>(null);
  const [newPin, setNewPin] = useState("");

  const doExport = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `battle-learning-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash("Data diekspor.");
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importData(String(reader.result));
      flash(ok ? "Data berhasil diimpor." : "File tidak valid.");
    };
    reader.readAsText(file);
  };

  return (
    <section className="space-y-6">
      <h2 className="font-display text-2xl text-white">Cadangkan & Pulihkan</h2>
      <p className="-mt-4 text-sm text-muted">
        Semua data guru disimpan di browser (localStorage). Gunakan cadangan untuk
        memindahkan ke perangkat/papan lain.
      </p>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={doExport} className={`${btnCls} bg-blue text-ink`}>
          ⬇️ Ekspor ke JSON
        </button>
        <button
          type="button"
          onClick={() => importRef.current?.click()}
          className={`${btnCls} bg-gold text-ink`}
        >
          ⬆️ Impor dari JSON
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) doImport(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (confirm("Kembalikan semua data ke bawaan? Perubahan akan hilang.")) {
              resetPlatformData();
              flash("Data dikembalikan ke bawaan.");
            }
          }}
          className={`${btnCls} bg-red-deep text-white`}
        >
          ♻️ Reset ke Bawaan
        </button>
      </div>

      <div className="rounded-xl border border-line bg-ink-soft p-4 text-sm text-muted">
        <p>
          Ringkasan: <b className="text-white">{data.students.length}</b> siswa ·{" "}
          <b className="text-white">{data.questions.length}</b> soal grammar ·{" "}
          <b className="text-white">{data.sentences.split("|").filter(Boolean).length}</b>{" "}
          kalimat ·{" "}
          <b className="text-white">
            {data.nouns.length + data.verbs.length + data.adjectives.length}
          </b>{" "}
          kata klasifikasi · <b className="text-white">{data.animals.length}</b> hewan ·{" "}
          <b className="text-white">{data.vocab.length}</b> kosakata
        </p>
        <p className="mt-2">
          Bawaan: {defaultData.students.length} siswa · {defaultData.questions.length} soal
        </p>
      </div>

      <div className="rounded-xl border border-line bg-ink-soft p-4">
        <h3 className="mb-2 font-display text-xl text-white">🔑 Ganti PIN Panel</h3>
        <p className="mb-3 text-sm text-muted">
          PIN dipakai untuk membuka Panel Guru. Bawaan: <b>1234</b>.
        </p>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            inputMode="numeric"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder="PIN baru (min. 4 angka)"
            className={`${inputCls} max-w-xs`}
          />
          <button
            type="button"
            onClick={() => {
              const clean = newPin.trim();
              if (clean.length < 4) {
                flash("PIN minimal 4 karakter.");
                return;
              }
              setPin(clean);
              setNewPin("");
              flash("PIN berhasil diubah.");
            }}
            className={`${btnCls} bg-blue text-ink`}
          >
            Simpan PIN
          </button>
        </div>
      </div>
    </section>
  );
}
