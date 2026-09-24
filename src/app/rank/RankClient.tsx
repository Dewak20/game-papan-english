"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePlatformData } from "@/lib/store";
import { rankStudent } from "@/lib/students";
import { motivationalQuote } from "@/lib/students";

interface RankView {
  nama: string;
  nisn: string;
  rank: number;
  total_nilai: number;
  quote: string;
}

type View = "login" | "loading" | "result";

export default function RankClient() {
  const { students } = usePlatformData();
  const [view, setView] = useState<View>("login");
  const [nisn, setNisn] = useState("");
  const [data, setData] = useState<RankView | null>(null);

  const fireConfetti = useCallback(async () => {
    const { default: confetti } = await import("canvas-confetti");
    const duration = 3000;
    const end = Date.now() + duration;
    const colors = ["#667eea", "#764ba2", "#F6AD55", "#ffffff"];

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 60,
        origin: { x: 0 },
        colors,
        zIndex: 200,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 60,
        origin: { x: 1 },
        colors,
        zIndex: 200,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const cekData = async () => {
    const clean = nisn.trim();
    if (!clean) {
      if (navigator.vibrate) navigator.vibrate(200);
      alert("Mohon masukkan NISN terlebih dahulu!");
      return;
    }

    setView("loading");
    // jeda kecil agar animasi loading terasa
    await new Promise((r) => setTimeout(r, 400));
    const result = rankStudent(students, clean);
    if (result) {
      setData({
        nama: result.nama,
        nisn: result.nisn,
        rank: result.rank,
        total_nilai: result.total_nilai,
        quote: motivationalQuote(result.rank),
      });
      setView("result");
      void fireConfetti();
    } else {
      setView("login");
      alert("NISN tidak ditemukan. Pastikan NISN sudah benar.");
    }
  };

  const rank = data?.rank ?? 0;
  const rankBadge =
    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🏅";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="relative flex h-[100svh] max-h-[900px] w-full max-w-md flex-col overflow-hidden rounded-[30px] bg-white text-ink shadow-2xl sm:h-[90vh]">
        <Link
          href="/"
          className="absolute top-4 left-4 z-20 flex items-center gap-1 rounded-full bg-black/10 px-3 py-1.5 text-sm font-bold text-ink backdrop-blur"
        >
          ← Menu
        </Link>

        {view === "login" ? (
          <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
            <div className="mb-8">
              <div className="text-lg font-black tracking-wide text-indigo-500 uppercase">
                SMP Dharma Wiweka
              </div>
              <div className="mt-1 inline-block rounded-full border border-slate-200 bg-slate-100 px-4 py-1.5 text-sm font-bold text-slate-600">
                Kelas IX A
              </div>
            </div>

            <div className="mb-4 animate-bounce text-7xl">🚀</div>
            <h1 className="text-2xl font-extrabold text-slate-800">Cek Ranking</h1>
            <p className="mb-8 text-sm text-slate-400">
              Lihat pencapaian nilai rapormu
            </p>

            <div className="mb-5 flex w-full items-center gap-3 rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-1 transition-colors focus-within:border-indigo-500 focus-within:bg-white">
              <span className="text-xl text-slate-400">🔎</span>
              <input
                type="tel"
                inputMode="numeric"
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && cekData()}
                placeholder="Masukkan NISN"
                className="w-full border-none bg-transparent py-4 text-base font-bold text-slate-700 outline-none"
              />
            </div>

            <button
              type="button"
              onClick={cekData}
              className="focus-ring w-full cursor-pointer rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 py-4 text-base font-extrabold text-white shadow-[0_10px_20px_-6px_rgba(118,75,162,0.5)] transition-transform active:scale-95"
            >
              LIHAT HASIL
            </button>

            <div className="mt-auto pt-8 text-xs font-semibold text-slate-300">
              Copyright © Dewa Krishnadana
            </div>
          </div>
        ) : null}

        {view === "loading" ? (
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-indigo-500" />
            <p className="mt-5 text-sm font-bold text-slate-500">
              Sedang memuat data...
            </p>
          </div>
        ) : null}

        {view === "result" && data ? (
          <div className="flex flex-1 flex-col overflow-y-auto bg-slate-50">
            <div className="relative rounded-b-[40px] bg-gradient-to-r from-indigo-500 to-purple-600 px-8 pt-16 pb-16 text-center text-white">
              <div className="text-sm font-semibold opacity-90">
                Selamat atas pencapaianmu,
              </div>
              <div className="text-2xl font-extrabold capitalize">{data.nama}</div>
              <div className="mt-2 inline-block rounded-full bg-white/25 px-4 py-1 text-xs backdrop-blur">
                NISN: {data.nisn}
              </div>
            </div>

            <div className="-mt-14 flex justify-center">
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border-[6px] border-slate-50 bg-white shadow-xl">
                <span className="text-xs font-black tracking-widest text-slate-400 uppercase">
                  Ranking
                </span>
                <span className="text-5xl leading-none font-black text-amber-500">
                  #{data.rank}
                </span>
                <span className="text-2xl">{rankBadge}</span>
              </div>
            </div>

            <div className="flex flex-1 flex-col p-8 text-center">
              <div className="mb-6 flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="text-left">
                  <div className="text-xs font-black tracking-widest text-slate-400 uppercase">
                    Total Nilai
                  </div>
                  <div className="text-3xl font-black text-slate-800">
                    {data.total_nilai}
                  </div>
                </div>
                <div className="text-3xl">📝</div>
              </div>

              <div className="mb-6 rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50 p-6 text-base leading-relaxed font-bold text-sky-700 italic">
                &ldquo;{data.quote}&rdquo;
              </div>

              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setNisn("");
                  setData(null);
                }}
                className="focus-ring mt-auto w-full cursor-pointer rounded-2xl border-2 border-slate-200 bg-white py-4 font-bold text-slate-500 transition-colors hover:bg-slate-100"
              >
                Cek Teman Lainnya
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
