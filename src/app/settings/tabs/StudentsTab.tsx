"use client";

import { useState } from "react";
import { usePlatformData, updatePlatformData, pushStudents, syncStudents } from "@/lib/store";
import { useCloudStatus } from "@/lib/sync";
import type { Student } from "@/lib/types";
import { TextBankEditor } from "@/components/TextBankEditor";

/**
 * Tab "Data Siswa" — editor teks NISN,Nama,Nilai + status & sinkronisasi cloud.
 */
export function StudentsTab({
  flash,
  teacherAuth,
}: {
  flash: (msg: string) => void;
  teacherAuth: "unknown" | "yes" | "no";
}) {
  const data = usePlatformData();
  const cloud = useCloudStatus();
  const [studentDraft, setStudentDraft] = useState("");
  const [cloudBusy, setCloudBusy] = useState(false);

  const studentsToText = () =>
    data.students.map((s) => `${s.nisn},${s.nama},${s.total_nilai}`).join("\n");

  const applyStudentsFromText = () => {
    const rows = studentDraft
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: Student[] = [];
    for (const row of rows) {
      const parts = row.split(",").map((p) => p.trim());
      if (parts.length >= 3) {
        const nilai = Number(parts[2]);
        if (parts[0] && parts[1] && !Number.isNaN(nilai)) {
          parsed.push({ nisn: parts[0], nama: parts[1], total_nilai: nilai });
        }
      }
    }
    if (parsed.length === 0) {
      flash("Format salah. Gunakan: NISN,Nama,Nilai per baris.");
      return;
    }
    updatePlatformData({ students: parsed });
    flash(`${parsed.length} siswa disimpan.`);
    if (cloud.configured && teacherAuth === "yes") {
      void pushStudents(parsed).then((okPush) => {
        if (okPush) flash(`${parsed.length} siswa disimpan & diunggah ke cloud.`);
      });
    }
  };

  const pullFromCloud = async () => {
    setCloudBusy(true);
    const result = await syncStudents();
    setCloudBusy(false);
    if (result === "pulled") flash("Data siswa ditarik dari cloud.");
    else if (result === "pushed") flash("Cloud kosong — data lokal diunggah ke cloud.");
    else flash("Cloud belum aktif. Data lokal tetap dipakai.");
  };

  const pushToCloud = async () => {
    if (!teacherAuth || teacherAuth === "no") {
      flash("Butuh login guru untuk mengunggah ke cloud.");
      return;
    }
    setCloudBusy(true);
    const okPush = await pushStudents(data.students);
    setCloudBusy(false);
    flash(okPush ? "Data siswa diunggah ke cloud." : "Gagal mengunggah (cloud belum aktif).");
  };

  return (
    <TextBankEditor
      title="Data Siswa"
      subtitle={`Total tersimpan: ${data.students.length} siswa`}
      hint={
        <>
          Satu siswa per baris, format:{" "}
          <code className="rounded bg-ink-soft px-1.5 py-0.5 text-gold">NISN,Nama,Nilai</code>
        </>
      }
      value={studentDraft}
      onChange={setStudentDraft}
      onLoad={() => setStudentDraft(studentsToText())}
      onSave={applyStudentsFromText}
      saveLabel="💾 Simpan Data Siswa"
      placeholder="0091234501,Adinda Putri,1288"
      headerExtra={
        <div
          className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
            cloud.configured ? "border-green/40 bg-green/5" : "border-line bg-ink-soft"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                cloud.configured
                  ? cloud.online
                    ? "animate-pulse-soft bg-green"
                    : "bg-gold"
                  : "bg-muted"
              }`}
            />
            <div>
              <p className="text-sm font-bold text-white">
                {cloud.configured ? "Cloud Aktif" : "Mode Lokal"}
              </p>
              <p className="text-xs text-muted">{cloud.message}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={cloudBusy}
              onClick={pullFromCloud}
              className="focus-ring cursor-pointer rounded-xl bg-blue px-5 py-2.5 font-bold text-ink transition-colors disabled:opacity-50"
            >
              ⬇️ Tarik dari Cloud
            </button>
            <button
              type="button"
              disabled={cloudBusy}
              onClick={pushToCloud}
              className="focus-ring cursor-pointer rounded-xl bg-violet px-5 py-2.5 font-bold text-ink transition-colors disabled:opacity-50"
            >
              ⬆️ Unggah ke Cloud
            </button>
          </div>
        </div>
      }
    />
  );
}
