"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  usePlatformData,
  syncStudents,
  pushStudents,
  studentsSynced,
  exportData,
} from "@/lib/store";
import { apiDelete, apiGet, apiPost, useCloudStatus, initSync, flush } from "@/lib/sync";
import { games } from "@/lib/games";

interface HealthData {
  db: boolean;
  reachable: boolean;
  students?: number;
  results?: number;
  message: string;
}

interface AuthData {
  teacher: boolean;
}

const PLAYABLE = games.filter((g) => g.slug !== "rank");

export default function AdminClient() {
  const data = usePlatformData();
  const cloud = useCloudStatus();

  const [health, setHealth] = useState<HealthData | null>(null);
  const [teacher, setTeacher] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [synced, setSynced] = useState(false);

  // Fase 1.9 — cadangan (backup) + login guru bila sesi belum aktif.
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const refreshHealth = useCallback(async () => {
    const res = await apiGet<HealthData>("/api/health");
    setHealth(res.ok ? res.data : null);
  }, []);

  useEffect(() => {
    initSync();

    let active = true;
    void (async () => {
      if (active) {
        setOrigin(window.location.origin);
        setSynced(studentsSynced());
      }
      const auth = await apiGet<AuthData>("/api/auth");
      if (active) setTeacher(Boolean(auth.data?.teacher));
      await refreshHealth();
    })();

    const timer = window.setInterval(() => void refreshHealth(), 10_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refreshHealth]);

  /** "Unggah data lokal" — dorong seluruh data lokal ke cloud (sekali). */
  const uploadLocal = async () => {
    setBusy(true);
    const result = await syncStudents();
    if (result !== "none") {
      await pushStudents(data.students);
      await flush();
    }
    setBusy(false);
    setSynced(studentsSynced());
    await refreshHealth();

    if (result === "pushed") flash("Data lokal berhasil diunggah ke cloud.");
    else if (result === "pulled") flash("Cloud sudah punya data — data cloud dipakai.");
    else flash("Cloud belum aktif. Isi DATABASE_URL lalu coba lagi.");
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      flash("Tautan disalin.");
    } catch {
      flash("Gagal menyalin — salin manual dari kotak di bawah.");
    }
  };

  /* --------------------------- Cadangan (Fase 1.9) --------------------------- */

  /** Simpan `content` sebagai file unduhan di perangkat. */
  const saveAs = (content: string, filename: string) => {
    try {
      const blob = new Blob([content], { type: "application/json" });
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

  /** Unduh cadangan data LOKAL (isinya apa yang ada di browser ini). */
  const downloadLocal = () => {
    const ok = saveAs(
      exportData(),
      `blp-lokal-${new Date().toISOString().slice(0, 10)}.json`,
    );
    flash(ok ? "Cadangan lokal diunduh." : "Gagal membuat cadangan lokal.");
  };

  /** Unduh cadangan dari DATABASE (khusus login guru). */
  const downloadCloud = async () => {
    setAuthBusy(true);
    try {
      const res = await fetch("/api/export", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        flash(body?.error ?? "Gagal mengunduh cadangan cloud.");
        return;
      }
      const text = await res.text();
      const ok = saveAs(text, `blp-cloud-${new Date().toISOString().slice(0, 10)}.json`);
      flash(ok ? "Cadangan cloud diunduh." : "Gagal menyimpan berkas.");
    } finally {
      setAuthBusy(false);
    }
  };

  /** Login guru langsung dari /admin. */
  const doLogin = async () => {
    setAuthBusy(true);
    const res = await apiPost<AuthData>("/api/auth", { pin: pin.trim() });
    setAuthBusy(false);

    if (res.ok) {
      setTeacher(true);
      setPin("");
      setPinError(false);
      flash("Login guru berhasil.");
    } else {
      setPinError(true);
      flash(res.error ?? "PIN salah.");
    }
  };

  const doLogout = async () => {
    await apiDelete<AuthData>("/api/auth");
    setTeacher(false);
    flash("Logout guru berhasil.");
  };

  const studentUrl = origin ? `${origin}/leaderboard` : "/leaderboard";
  const qrSrc = origin
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        `${origin}/`,
      )}`
    : "";

  const dbLabel = health?.reachable
    ? "Tersambung"
    : health?.db
      ? "Tidak dapat diakses"
      : "Belum dikonfigurasi";
  const dbTone = health?.reachable
    ? "text-green"
    : health?.db
      ? "text-red"
      : "text-muted";

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8">
      <header className="mb-8 flex flex-wrap items-center gap-4">
        <Link
          href="/"
          className="focus-ring flex items-center gap-2 rounded-xl border border-line bg-white/5 px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-white/40 hover:text-white"
        >
          ← Menu
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-3xl text-white sm:text-4xl">🛠️ Admin</h1>
          <p className="text-sm text-muted">
            Pantau status cloud, sinkronkan data, dan bagikan tautan ke siswa.
          </p>
        </div>
        <span
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            cloud.configured
              ? "border-green/40 bg-green/10 text-green"
              : "border-line bg-white/5 text-muted"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              cloud.configured
                ? cloud.online
                  ? "animate-pulse-soft bg-green"
                  : "bg-gold"
                : "bg-muted"
            }`}
          />
          {cloud.configured ? (cloud.online ? "CLOUD AKTIF" : "OFFLINE") : "MODE LOKAL"}
        </span>
      </header>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Status database */}
        <div className="panel p-6">
          <p className="text-xs font-bold tracking-[0.25em] text-muted uppercase">
            Database
          </p>
          <p className={`mt-2 font-display text-2xl ${dbTone}`}>{dbLabel}</p>
          <p className="mt-1 text-xs text-muted">{health?.message ?? "Memeriksa…"}</p>
          {health?.reachable ? (
            <div className="mt-4 flex gap-4 text-sm">
              <span className="text-muted">
                Siswa: <b className="text-white">{health.students ?? 0}</b>
              </span>
              <span className="text-muted">
                Skor: <b className="text-white">{health.results ?? 0}</b>
              </span>
            </div>
          ) : null}
        </div>

        {/* Status sinkron */}
        <div className="panel p-6">
          <p className="text-xs font-bold tracking-[0.25em] text-muted uppercase">
            Sinkronisasi
          </p>
          <p className="mt-2 font-display text-2xl text-white">
            {cloud.pending > 0 ? `${cloud.pending} antre` : "Bersih"}
          </p>
          <p className="mt-1 text-xs text-muted">{cloud.message}</p>
          <p className="mt-4 text-sm text-muted">
            Login guru:{" "}
            <b className={teacher ? "text-green" : "text-red"}>
              {teacher ? "Aktif" : "Belum"}
            </b>
          </p>
        </div>

        {/* Data lokal */}
        <div className="panel p-6">
          <p className="text-xs font-bold tracking-[0.25em] text-muted uppercase">
            Data Lokal
          </p>
          <p className="mt-2 font-display text-2xl text-white">
            {data.students.length} siswa
          </p>
          <p className="mt-1 text-xs text-muted">
            {synced ? "Sudah pernah diunggah ke cloud." : "Belum diunggah ke cloud."}
          </p>
          <p className="mt-4 text-sm text-muted">
            Bank kata:{" "}
            <b className="text-white">
              {data.vocab.length + data.nouns.length + data.verbs.length}
            </b>
          </p>
        </div>
      </section>

      {/* Aksi utama */}
      <section className="panel mt-5 p-6">
        <h2 className="font-display text-xl text-white">Aksi Sinkronisasi</h2>
        <p className="mt-1 text-sm text-muted">
          Menjalankan sekali untuk memindahkan data yang sudah ada di perangkat ini ke
          cloud. Setelah itu sinkronisasi berjalan otomatis.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={uploadLocal}
            className="focus-ring cursor-pointer rounded-xl bg-gold px-5 py-2.5 font-bold text-ink transition-colors hover:brightness-110 disabled:opacity-50"
          >
            ⬆️ Unggah Data Lokal ke Cloud
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void refreshHealth()}
            className="focus-ring cursor-pointer rounded-xl border border-line bg-white/5 px-5 py-2.5 font-semibold text-muted transition-colors hover:text-white disabled:opacity-50"
          >
            🔄 Periksa Ulang
          </button>
          <Link
            href="/settings"
            className="focus-ring rounded-xl border border-line bg-white/5 px-5 py-2.5 font-semibold text-muted transition-colors hover:text-white"
          >
            ⚙️ Panel Guru
          </Link>
        </div>
      </section>

      {/* Fase 1.9 — Cadangan */}
      <section className="panel mt-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-white">Cadangan Data</h2>
            <p className="mt-1 text-sm text-muted">
              Unduh salinan data untuk disimpan atau dipindahkan ke perangkat lain.
            </p>
          </div>

          {teacher ? (
            <button
              type="button"
              onClick={() => void doLogout()}
              className="focus-ring cursor-pointer rounded-xl border border-line bg-white/5 px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-red/50 hover:text-red"
            >
              Keluar dari akun guru
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void doLogin();
              }}
              className="flex flex-wrap items-center gap-2"
            >
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setPinError(false);
                }}
                placeholder="PIN guru"
                aria-label="PIN guru"
                className={`focus-ring w-36 rounded-xl border-2 bg-ink-soft px-3 py-2 text-center text-lg tracking-[0.3em] text-white outline-none ${
                  pinError ? "border-red" : "border-line focus:border-gold"
                }`}
              />
              <button
                type="submit"
                disabled={authBusy}
                className="focus-ring cursor-pointer rounded-xl bg-green px-4 py-2 text-sm font-bold text-ink transition-transform active:scale-95 disabled:opacity-50"
              >
                🔓 Masuk
              </button>
            </form>
          )}
        </div>

        <p
          className={`mt-3 text-sm font-semibold ${teacher ? "text-green" : "text-muted"}`}
        >
          {teacher
            ? "Sesi guru aktif — cadangan cloud siap diunduh."
            : "Masuk sebagai guru untuk mengunduh cadangan dari database (PIN bawaan: 1234)."}
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={downloadLocal}
            className="focus-ring cursor-pointer rounded-xl bg-blue px-5 py-2.5 font-bold text-ink transition-colors hover:brightness-110"
          >
            💾 Unduh Cadangan Lokal
          </button>
          <button
            type="button"
            onClick={() => void downloadCloud()}
            disabled={!teacher || authBusy}
            title={teacher ? "Ambil semua data dari database" : "Butuh login guru"}
            className="focus-ring cursor-pointer rounded-xl bg-violet px-5 py-2.5 font-bold text-ink transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ☁️ Unduh Cadangan Cloud
          </button>
          <Link
            href="/settings"
            className="focus-ring rounded-xl border border-line bg-white/5 px-5 py-2.5 font-semibold text-muted transition-colors hover:text-white"
          >
            ⬆️ Impor / Ekspor di Panel Guru
          </Link>
        </div>
      </section>

      {/* Tautan siswa */}
      <section className="panel mt-5 p-6">
        <h2 className="font-display text-xl text-white">Akses Siswa</h2>
        <p className="mt-1 text-sm text-muted">
          Bagikan tautan ini agar siswa membuka platform dari HP mereka. Pastikan
          perangkat berada di jaringan yang sama atau aplikasi sudah online.
        </p>

        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
          {qrSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrSrc}
              alt="QR menuju platform"
              width={160}
              height={160}
              className="rounded-xl border border-line bg-white p-2"
            />
          ) : (
            <div className="flex h-[160px] w-[160px] items-center justify-center rounded-xl border border-line bg-ink-soft text-xs text-muted">
              QR tampil setelah halaman dimuat
            </div>
          )}

          <div className="flex-1">
            <p className="text-xs font-bold tracking-[0.25em] text-muted uppercase">
              Tautan Papan
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <code className="flex-1 truncate rounded-xl border border-line bg-ink-soft px-3 py-2 text-sm text-gold">
                {origin || "…"}
              </code>
              <button
                type="button"
                onClick={() => void copyLink(origin || "/")}
                className="focus-ring cursor-pointer rounded-xl bg-blue px-4 py-2 text-sm font-bold text-ink"
              >
                Salin
              </button>
            </div>

            <p className="mt-4 text-xs font-bold tracking-[0.25em] text-muted uppercase">
              Tautan Papan Peringkat
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <code className="flex-1 truncate rounded-xl border border-line bg-ink-soft px-3 py-2 text-sm text-gold">
                {studentUrl}
              </code>
              <button
                type="button"
                onClick={() => void copyLink(studentUrl)}
                className="focus-ring cursor-pointer rounded-xl bg-blue px-4 py-2 text-sm font-bold text-ink"
              >
                Salin
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pintasan game */}
      <section className="panel mt-5 p-6">
        <h2 className="font-display text-xl text-white">Pintasan Game</h2>
        <p className="mt-1 text-sm text-muted">
          Buka langsung salah satu game tanpa melewati menu.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PLAYABLE.map((g) => (
            <Link
              key={g.slug}
              href={`/${g.slug}`}
              className="focus-ring rounded-xl border border-line bg-white/5 px-3 py-2 text-sm font-semibold text-muted transition-colors hover:border-gold/60 hover:text-white"
            >
              {g.icon} {g.title}
            </Link>
          ))}
        </div>
      </section>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-pop rounded-2xl border border-green bg-green/20 px-6 py-3 font-bold text-green backdrop-blur">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
