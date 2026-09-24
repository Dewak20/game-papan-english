"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { GameHeader, TimerBadge, formatClock } from "@/components/GameChrome";
import { Overlay, ChoiceButton, StartButton, teamConfig, SectionLabel, SpeedHint } from "@/components/ui";
import { Confetti, Burst, ScreenFlash, Countdown, WinnerBanner, ScoreBoard } from "@/components/juice";
import { useJuice } from "@/lib/useJuice";
import { useSound } from "@/lib/useSound";
import { useMusic } from "@/lib/useMusic";
import { musicTheme } from "@/lib/musicThemes";
import { useScreenShake, GAME_ROOT_ID } from "@/lib/useScreenShake";
import { nowMs } from "@/lib/clock";
import { speedBonus } from "@/lib/scoring";
import { useCountdown } from "@/lib/useCountdown";
import { useSpeech } from "@/lib/useSpeech";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { SaveScoreDialog } from "@/components/SaveScoreDialog";
import { usePlatformData } from "@/lib/store";
import {
  buildPronounceWord,
  judgePronunciation,
  type PronounceVerdict,
} from "@/lib/pronounce";
import type { ReviewItem, TeamSide } from "@/lib/types";
import type { VocabPair } from "@/lib/vocabulary";

type Phase = "menu" | "countdown" | "playing" | "result";

const ACCENT = "#f472b6";
const SCORE_CORRECT = 20;
const SCORE_PARTIAL = 10;
const SPEED_BONUS_MAX = 8;
const DURATIONS = [60, 180, 300, 600];

interface SideResult {
  heard: string;
  verdict: PronounceVerdict;
}

/** Bar gelombang suara beranimasi (tampil saat merekam). */
function MicWaves({ active, color }: { active: boolean; color: string }) {
  return (
    <div className="flex h-10 items-end justify-center gap-1">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <span
          key={i}
          className="w-2 rounded-full"
          style={{
            backgroundColor: color,
            height: active ? "100%" : "14%",
            opacity: active ? 1 : 0.3,
            animation: active ? `soundbar 0.6s ease-in-out ${i * 0.07}s infinite alternate` : "none",
          }}
        />
      ))}
    </div>
  );
}

export default function PronounceClient() {
  const { play } = useSound();
  const { vocab } = usePlatformData();
  const juice = useJuice();
  const fireShake = useScreenShake();
  const { speak } = useSpeech();
  const { supported: micSupported, listening, interim, start: recStart, stop: recStop } =
    useSpeechRecognition();
  const theme = useMemo(() => musicTheme("pronounce-it"), []);

  const [phase, setPhase] = useState<Phase>("menu");
  const [duration, setDuration] = useState(180);
  const [solo, setSolo] = useState(false);
  const [teacherMode, setTeacherMode] = useState(false);
  const [showSave, setShowSave] = useState(false);

  useMusic(theme, phase === "playing" || phase === "countdown");

  const [timeLeft, setTimeLeft] = useState(180);
  const [teams, setTeams] = useState<Record<TeamSide, number>>({ blue: 0, red: 0 });
  const [words, setWords] = useState<Record<TeamSide, VocabPair | null>>({
    blue: null,
    red: null,
  });
  const [results, setResults] = useState<Record<TeamSide, SideResult | null>>({
    blue: null,
    red: null,
  });
  const [activeSide, setActiveSide] = useState<TeamSide | null>(null);
  const [wrongLog, setWrongLog] = useState<ReviewItem[]>([]);
  const [micError, setMicError] = useState<string | null>(null);

  const qStartRef = useRef<Record<TeamSide, number>>({ blue: 0, red: 0 });
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pool = useMemo(() => vocab, [vocab]);

  const { count, active: counting, start: startCountdown } = useCountdown(
    useCallback(() => setPhase("playing"), []),
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          recStop();
          setPhase("result");
          play("finish");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, play, recStop]);

  const startGame = () => {
    if (pool.length < 1) return;
    const now = nowMs();
    setTeams({ blue: 0, red: 0 });
    setWrongLog([]);
    setResults({ blue: null, red: null });
    setActiveSide(null);
    setMicError(null);
    setWords({
      blue: buildPronounceWord(pool),
      red: solo ? null : buildPronounceWord(pool),
    });
    setShowSave(false);
    setTimeLeft(duration);
    setPhase("countdown");
    qStartRef.current = { blue: now, red: now };
    startCountdown();
  };

  /** Terapkan hasil penilaian untuk satu sisi. */
  const applyResult = useCallback(
    (side: TeamSide, word: VocabPair, heard: string, verdict: PronounceVerdict) => {
      const cfg = teamConfig(side);
      const bonus = verdict.ok ? speedBonus(qStartRef.current[side], SPEED_BONUS_MAX, 9000) : 0;
      const gained = verdict.ok ? SCORE_CORRECT + bonus : verdict.partial ? SCORE_PARTIAL : 0;

      if (verdict.ok || verdict.partial) {
        setTeams((prev) => ({ ...prev, [side]: prev[side] + gained }));
        play(verdict.ok ? "correct" : "coin");
        juice.addBurst(cfg.hex, side);
        juice.addFloat(
          `+${gained}${bonus > 0 ? " ⚡" : ""}`,
          cfg.hex,
          side === "blue" ? "30%" : "70%",
          "34%",
        );
        juice.addFlash(verdict.ok ? "rgba(244,114,182,0.2)" : "rgba(251,191,36,0.18)");
      } else {
        play("wrong");
        juice.addFloat("😅", cfg.hex, side === "blue" ? "30%" : "70%", "34%");
        juice.addFlash("rgba(244,63,94,0.24)");
        setWrongLog((log) => [...log, { word: word.en, expected: word.id }]);
        fireShake();
      }

      setResults((prev) => ({ ...prev, [side]: { heard, verdict } }));
      setActiveSide(null);

      // Beri jeda agar siswa melihat hasil, lalu ganti kata.
      if (resultTimer.current) clearTimeout(resultTimer.current);
      resultTimer.current = setTimeout(() => {
        setWords((prev) => ({ ...prev, [side]: buildPronounceWord(pool, word) }));
        setResults((prev) => ({ ...prev, [side]: null }));
        qStartRef.current = { ...qStartRef.current, [side]: nowMs() };
      }, 1500);
    },
    [juice, play, fireShake, pool],
  );

  /** Mulai merekam suara siswa (mode otomatis). */
  const beginRecording = (side: TeamSide) => {
    if (phase !== "playing" || listening) return;
    const word = words[side];
    if (!word) return;
    setMicError(null);
    setActiveSide(side);

    const ok = recStart(
      (heard) => {
        if (!heard) {
          setActiveSide(null);
          setMicError("Tidak terdengar suara. Coba lagi lebih dekat ke mikrofon.");
          return;
        }
        applyResult(side, word, heard, judgePronunciation(word.en, heard));
      },
      (code) => {
        setActiveSide(null);
        setMicError(
          code === "not-allowed" || code === "service-not-allowed"
            ? "Izin mikrofon ditolak. Aktifkan izin mic, atau pakai Mode Guru."
            : code === "no-speech"
              ? "Tidak ada suara terdeteksi. Coba lagi."
              : "Pengenalan suara gagal. Coba lagi atau pakai Mode Guru.",
        );
      },
    );

    if (!ok) {
      setActiveSide(null);
      setMicError("Mikrofon tidak bisa diakses. Pakai Mode Guru (nilai manual).");
    }
  };

  /** Mode guru: guru menilai manual benar/salah. */
  const manualJudge = (side: TeamSide, correct: boolean) => {
    if (phase !== "playing") return;
    const word = words[side];
    if (!word) return;
    applyResult(side, word, correct ? word.en : "(dinilai guru)", {
      ratio: correct ? 1 : 0,
      ok: correct,
      partial: correct,
    });
  };

  const winner =
    teams.blue > teams.red
      ? { msg: "BLUE WINS!", color: "#38bdf8" }
      : teams.red > teams.blue
        ? { msg: "RED WINS!", color: "#fb7185" }
        : { msg: "DRAW!", color: "#ffffff" };

  const uniqueMistakes = useMemo(() => {
    const seen = new Set<string>();
    return wrongLog.filter((item) => {
      const key = `${item.word}|${item.expected}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [wrongLog]);

  const sides: TeamSide[] = solo ? ["blue"] : ["blue", "red"];

  return (
    <div id={GAME_ROOT_ID} className="tex-stage relative flex h-screen flex-col overflow-hidden bg-ink">
      <GameHeader
        title="Pronounce It"
        subtitle="Panggung Karaoke · Latihan Pengucapan"
        accent={ACCENT}
        icon="🎤"
      >
        <TimerBadge
          value={formatClock(timeLeft)}
          warning={timeLeft <= 10 && phase === "playing"}
          accent={ACCENT}
        />
      </GameHeader>

      {!solo ? (
        <div className="relative z-20 flex h-16 w-full border-b-2 border-line bg-black/50">
          <div className="flex flex-1 items-center justify-start border-r border-white/10 bg-gradient-to-r from-sky-500 to-blue-700 pl-6 font-display text-2xl text-white">
            TEAM BLUE · {teams.blue}
          </div>
          <div className="flex flex-1 items-center justify-end bg-gradient-to-l from-rose-500 to-red-700 pr-6 font-display text-2xl text-white">
            {teams.red} · TEAM RED
          </div>
        </div>
      ) : (
        <div className="relative z-20 flex h-16 w-full items-center justify-between border-b-2 border-line bg-black/50 px-6">
          <span className="font-display text-2xl text-pink">🧑 LATIHAN MANDIRI</span>
          <span className="font-display text-2xl text-gold">SKOR: {teams.blue}</span>
        </div>
      )}

      {micError && phase === "playing" ? (
        <div className="relative z-20 border-b border-red/30 bg-red/10 px-6 py-2 text-center text-sm font-semibold text-red">
          ⚠️ {micError}
        </div>
      ) : null}

      <div className="relative flex flex-1 overflow-hidden">
        {sides.map((side) => {
          const cfg = teamConfig(side);
          const word = words[side];
          const res = results[side];
          const isRecording = activeSide === side && listening;
          const isBusy = activeSide === side;
          return (
            <div
              key={side}
              className={`relative flex flex-1 flex-col items-center justify-center gap-4 p-5 ${
                solo ? "" : side === "blue" ? "border-r-2 border-white/10" : ""
              }`}
            >
              <div
                className={`pointer-events-none absolute inset-0 ${
                  side === "blue"
                    ? "bg-gradient-to-b from-sky-900/25 to-transparent"
                    : "bg-gradient-to-b from-red-950/35 to-transparent"
                }`}
              />

              <div className="z-10 flex w-full items-center justify-between px-2">
                <span className={`font-display text-xl ${cfg.text}`}>
                  {solo ? "🧑 KAMU" : cfg.name}
                </span>
                <span className={`font-display text-4xl ${cfg.text}`}>{teams[side]}</span>
              </div>

              {/* Kartu kata */}
              <div className="z-10 w-full max-w-xl animate-slide-up rounded-3xl border-2 border-pink/30 bg-black/50 p-6 text-center shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                <p className="mb-1 text-xs tracking-[0.3em] text-white/50 uppercase">
                  Ucapkan kata ini
                </p>
                <p
                  className="font-display text-5xl text-white sm:text-6xl"
                  style={{ textShadow: `0 0 30px ${ACCENT}66` }}
                >
                  {word ? word.en : "…"}
                </p>
                <p className="mt-2 text-lg text-pink">artinya: {word ? word.id : "…"}</p>
                <button
                  type="button"
                  onClick={() => word && speak(word.en, { rate: 0.8 })}
                  disabled={!word}
                  className="focus-ring mt-3 rounded-xl border border-pink/40 px-4 py-1.5 text-sm font-semibold text-pink transition-colors hover:bg-pink/10 disabled:opacity-40"
                >
                  🔊 DENGARKAN CONTOH
                </button>
              </div>

              {/* Hasil */}
              {res ? (
                <div
                  className={`z-10 w-full max-w-xl rounded-2xl border-2 px-4 py-3 text-center ${
                    res.verdict.ok
                      ? "border-emerald-400/50 bg-emerald-500/15"
                      : res.verdict.partial
                        ? "border-gold/50 bg-gold/15"
                        : "border-red/50 bg-red/15"
                  }`}
                >
                  <p className="text-sm text-white/70">
                    Terdengar: <b className="text-white">“{res.heard}”</b>
                  </p>
                  <p className="font-display text-xl">
                    {res.verdict.ok ? "✅ TEPAT!" : res.verdict.partial ? "🟡 HAMPIR BENAR" : "❌ BELUM TEPAT"}
                    <span className="ml-2 text-base text-white/70">
                      ({Math.round(res.verdict.ratio * 100)}%)
                    </span>
                  </p>
                </div>
              ) : null}

              {/* Kontrol utama */}
              {teacherMode ? (
                <div className="z-10 flex w-full max-w-xl gap-3">
                  <button
                    type="button"
                    onClick={() => manualJudge(side, true)}
                    disabled={isBusy || !!res}
                    className="btn-3d focus-ring flex-1 bg-gradient-to-b from-emerald-500 to-emerald-800 px-4 py-4 text-xl text-white shadow-[0_8px_0_#064e3b] disabled:opacity-40"
                  >
                    ✔ BENAR
                  </button>
                  <button
                    type="button"
                    onClick={() => manualJudge(side, false)}
                    disabled={isBusy || !!res}
                    className="btn-3d focus-ring flex-1 bg-gradient-to-b from-rose-500 to-red-800 px-4 py-4 text-xl text-white shadow-[0_8px_0_#7f1d1d] disabled:opacity-40"
                  >
                    ✘ SALAH
                  </button>
                </div>
              ) : (
                <div className="z-10 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => beginRecording(side)}
                    disabled={isBusy || !!res || listening || micSupported === false}
                    className={`focus-ring flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-pink-400 to-pink-700 text-4xl text-white shadow-[0_8px_0_#9d174d] transition-transform disabled:opacity-40 ${
                      isRecording ? "animate-mic" : "active:scale-95"
                    }`}
                  >
                    🎤
                  </button>
                  <MicWaves active={isRecording} color={ACCENT} />
                  <span className="text-sm font-semibold tracking-wide text-white/70">
                    {isRecording
                      ? "MEREKAM… ucapkan sekarang"
                      : isBusy
                        ? "MENILAI…"
                        : "TEKAN & BICARA"}
                  </span>
                  {isRecording && interim ? (
                    <span className="rounded-lg bg-black/40 px-3 py-1 text-sm text-white/80">
                      “{interim}”
                    </span>
                  ) : null}
                </div>
              )}

              {juice.burst && juice.burst.side === side ? (
                <Burst color={juice.burst.color} seed={juice.burst.id} />
              ) : null}
            </div>
          );
        })}

        {juice.floats.map((f) => (
          <div
            key={f.id}
            className="pointer-events-none absolute z-[130] animate-rise font-display text-5xl font-bold"
            style={{ left: f.x, top: f.y, color: f.color, textShadow: "0 6px 18px rgba(0,0,0,0.8)" }}
          >
            {f.text}
          </div>
        ))}
      </div>

      <footer className="pointer-events-none z-10 bg-gradient-to-t from-black/80 to-transparent py-2 text-center text-xs tracking-widest text-white/60">
        © {new Date().getFullYear()} Dewa Krishnadana
      </footer>

      {juice.flash ? <ScreenFlash color={juice.flash.color} trigger={juice.flash.id} /> : null}

      {counting && count !== null ? <Countdown count={count} accent={ACCENT} /> : null}

      {phase === "menu" ? (
        <Overlay>
          <div className="absolute inset-0 -z-10 tex-stage opacity-90" />
          <span className="mb-3 animate-bob text-6xl">🎤</span>
          <h1 className="font-display text-6xl text-white drop-shadow-[0_4px_20px_rgba(244,114,182,0.55)] sm:text-7xl">
            PRONOUNCE IT
          </h1>
          <p className="mt-2 mb-8 max-w-2xl text-lg text-white/70">
            Ucapkan kata bahasa Inggris dengan jelas — browser menilai kemiripannya
          </p>

          <div className="mb-6 w-full max-w-2xl text-center">
            <SectionLabel accent={ACCENT}>Tipe Permainan</SectionLabel>
            <div className="flex flex-wrap justify-center gap-3">
              <ChoiceButton
                label="👥 Duel 2 Tim"
                active={!solo}
                onClick={() => setSolo(false)}
                accent={ACCENT}
              />
              <ChoiceButton
                label="🧑 Latihan Mandiri"
                active={solo}
                onClick={() => setSolo(true)}
                accent={ACCENT}
              />
            </div>
          </div>

          <div className="mb-6 w-full max-w-2xl text-center">
            <SectionLabel accent={ACCENT}>Cara Menilai</SectionLabel>
            <div className="flex flex-wrap justify-center gap-3">
              <ChoiceButton
                label="🎙️ Otomatis (mikrofon)"
                active={!teacherMode}
                onClick={() => setTeacherMode(false)}
                accent={ACCENT}
              />
              <ChoiceButton
                label="👩‍🏫 Guru menilai manual"
                active={teacherMode}
                onClick={() => setTeacherMode(true)}
                accent={ACCENT}
              />
            </div>
            {!teacherMode && micSupported === false ? (
              <p className="mt-3 text-sm font-semibold text-red">
                ⚠️ Browser ini tidak mendukung pengenalan suara. Pakai Chrome/Edge, atau pilih Mode Guru.
              </p>
            ) : null}
          </div>

          <div className="mb-10 w-full max-w-2xl text-center">
            <SectionLabel accent={ACCENT}>Duration</SectionLabel>
            <div className="flex flex-wrap justify-center gap-3">
              {DURATIONS.map((d) => (
                <ChoiceButton
                  key={d}
                  label={d < 60 ? `${d}s` : `${d / 60} Min`}
                  active={duration === d}
                  onClick={() => setDuration(d)}
                  accent={ACCENT}
                />
              ))}
            </div>
          </div>

          <SpeedHint />
          <StartButton
            label="START GAME"
            onClick={startGame}
            color={ACCENT}
            shadow="#9d174d"
          />
        </Overlay>
      ) : null}

      {phase === "result" ? (
        <Overlay>
          {!solo && winner.msg !== "DRAW!" ? <Confetti count={100} /> : null}
          {solo ? (
            <>
              <span className="text-6xl">🎓</span>
              <h1
                className="mt-2 mb-4 font-display text-6xl text-gold"
                style={{ textShadow: "0 0 40px #fbbf24, 3px 3px 0 #000" }}
              >
                LATIHAN SELESAI!
              </h1>
              <div className="mb-6 animate-glow rounded-3xl border-2 border-gold/40 bg-gold/10 px-16 py-6 text-center">
                <p className="text-sm tracking-widest text-muted uppercase">Skor Kamu</p>
                <p className="font-display text-8xl text-gold">{teams.blue}</p>
              </div>
            </>
          ) : (
            <>
              <WinnerBanner
                title={winner.msg}
                color={winner.color}
                emoji={winner.msg === "DRAW!" ? "🤝" : "🏆"}
              />
              <div className="my-8">
                <ScoreBoard blue={teams.blue} red={teams.red} />
              </div>
            </>
          )}

          <div className="mb-6 max-h-56 w-full max-w-2xl overflow-y-auto rounded-2xl border-2 border-gold/30 bg-black/50 p-5 text-left">
            <h3 className="mb-3 text-center font-display text-2xl text-gold">🗣️ Kata untuk Dilatih</h3>
            {uniqueMistakes.length === 0 ? (
              <p className="text-center text-pink">Luar biasa! Semua pengucapan tepat. 🌟</p>
            ) : (
              uniqueMistakes.slice(0, 12).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-white/10 py-1.5 text-lg"
                >
                  <span>
                    <b className="text-white">{item.word}</b> ={" "}
                    <span className="rounded bg-pink/20 px-2 font-bold text-pink">
                      {item.expected}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => speak(item.word, { rate: 0.8 })}
                    className="focus-ring rounded-lg border border-pink/40 px-3 py-1 text-sm text-pink hover:bg-pink/10"
                  >
                    🔊
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <StartButton label="PLAY AGAIN" onClick={startGame} color={ACCENT} shadow="#9d174d" />
            {solo ? (
              <button
                type="button"
                onClick={() => setShowSave(true)}
                className="btn-3d focus-ring flex items-center bg-gold px-8 py-4 text-2xl text-ink shadow-[0_10px_0_#b45309]"
              >
                💾 SIMPAN SKOR
              </button>
            ) : null}
            <Link
              href="/"
              className="btn-3d focus-ring flex items-center bg-line px-8 py-4 text-2xl text-white shadow-[0_10px_0_#0b1226]"
            >
              MENU
            </Link>
          </div>
        </Overlay>
      ) : null}

      <SaveScoreDialog
        game="pronounce-it"
        score={teams.blue}
        open={showSave}
        onClose={() => setShowSave(false)}
      />
    </div>
  );
}
