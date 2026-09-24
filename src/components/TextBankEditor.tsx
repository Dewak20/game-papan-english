"use client";

import type { ReactNode } from "react";

const inputCls =
  "w-full rounded-xl border-2 border-line bg-ink-soft p-3 font-mono text-sm text-white outline-none focus:border-gold";

export interface TextBankEditorProps {
  title: string;
  subtitle?: ReactNode;
  /** Petunjuk format (ditampilkan di atas textarea). */
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  /** Isi textarea dengan data saat ini. */
  onLoad?: () => void;
  onLoadLabel?: string;
  onSave: () => void;
  saveLabel: string;
  placeholder?: string;
  /** Tinggi textarea (kelas Tailwind), default `h-72`. */
  heightClass?: string;
  /** Konten tambahan di atas textarea (mis. status cloud). */
  headerExtra?: ReactNode;
}

/**
 * Editor "bank teks" generik: judul + tombol "muat data saat ini" + textarea +
 * tombol simpan. Dipakai Panel Guru untuk siswa/kalimat/soal/kosakata agar
 * tiap tab tidak mengulang tata letak yang sama.
 */
export function TextBankEditor({
  title,
  subtitle,
  hint,
  value,
  onChange,
  onLoad,
  onLoadLabel = "Muat Data Saat Ini",
  onSave,
  saveLabel,
  placeholder,
  heightClass = "h-72",
  headerExtra,
}: TextBankEditorProps) {
  return (
    <section>
      {headerExtra}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-white">{title}</h2>
          {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
        </div>
        {onLoad ? (
          <button
            type="button"
            onClick={onLoad}
            className="focus-ring cursor-pointer rounded-xl bg-white/10 px-5 py-2.5 font-bold text-white transition-colors hover:bg-white/20"
          >
            {onLoadLabel}
          </button>
        ) : null}
      </div>

      {hint ? <div className="mb-2 text-sm text-muted">{hint}</div> : null}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} ${heightClass}`}
      />

      <button
        type="button"
        onClick={onSave}
        className="focus-ring mt-3 cursor-pointer rounded-xl bg-green px-5 py-2.5 font-bold text-ink transition-colors"
      >
        {saveLabel}
      </button>
    </section>
  );
}
