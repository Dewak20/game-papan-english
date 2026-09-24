"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { GameHeader, TimerBadge, formatClock } from "@/components/GameChrome";
import { Overlay, ChoiceButton, StartButton, teamConfig, SectionLabel, SpeedHint, KeyboardHint } from "@/components/ui";
import { Confetti, Burst, ScreenFlash, Countdown, WinnerBanner, ScoreBoard } from "@/components/juice";
import { useJuice } from "@/lib/useJuice";
import { useSound } from "@/lib/useSound";
import { useMusic } from "@/lib/useMusic";
import { musicTheme } from "@/lib/musicThemes";
import { useScreenShake, GAME_ROOT_ID } from "@/lib/useScreenShake";
import { nowMs } from "@/lib/clock";
import { speedBonus } from "@/lib/scoring";
import { useCountdown } from "@/lib/useCountdown";
import { useKeyboardChoices, BUZZER_KEYS } from "@/lib/useKeyboardChoices";
import { preloadImage } from "@/lib/preloadImage";
import { SaveScoreDialog } from "@/components/SaveScoreDialog";
import { TeamScoreBar, FloatLayer, TeamPanelHeader, GameFooter } from "@/components/gameParts";
import {
  buildPictureQuestion,
  pictureByCategory,
  pictureCategories,
  type PictureQuestion,
} from "@/lib/picture";
import type { ReviewItem, TeamSide } from "@/lib/types";

type Phase = "menu" | "countdown" | "playing" | "result";

const ACCENT = "#a3e635";
const SCORE_CORRECT = 15;
const SCORE_WRONG = 5;
const SPEED_BONUS_MAX = 8;
const DURATIONS = [60, 180, 300, 600];
const LETTERS = ["A", "B", "C", "D"];

/** Kartu foto bergaya bingkai galeri + keadaan memuat. */
function PhotoFrame({
  src,
  alt,
  loaded,
  onLoad,
  className = "",
}: {
  src: string;
  alt: string;
  loaded: boolean;
  onLoad: () => void;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-4 border-white/80 bg-black shadow-[0_18px_50px_rgba(0,0,0,0.7)] ring-1 ring-black/40 ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          sizes="(max-width: 768px) 90vw, 40vw"
          className={`object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={onLoad}
        />
      ) : null}
      {!loaded ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-800 to-slate-950 text-muted">
          <span className="animate-spin-slow text-4xl">🖼️</span>
          <span className="text-sm font-semibold tracking-widest uppercase">
            Menyiapkan gambar…
          </span>
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
    </div>
  );
}

export default function TebakGambarClient() {
  const { play } = useSound();
  const juice = useJuice();
  const fireShake = useScreenShake();
  const theme = useMemo(() => musicTheme("tebak-gambar"), []);

  const [phase, setPhase] = useState<Phase>("menu");
  const [duration, setDuration] = useState(180);
  const [category, setCategory] = useState("Semua");
  const [solo, setSolo] = useState(false);
  const [showSave, setShowSave] = useState(false);

  useMusic(theme, phase === "playing" || phase === "countdown");

  const [timeLeft, setTimeLeft] = useState(180);
  const [teams, setTeams] = useState<Record<TeamSide, number>>({ blue: 0, red: 0 });
  const [question, setQuestion] = useState<PictureQuestion | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [answered, setAnswered] = useState<Record<TeamSide, boolean>>({
    blue: false,
    red: false,
  });
  const [feedback, setFeedback] = useState<Record<TeamSide, "correct" | "wrong" | null>>({
    blue: null,
    red: null,
  });
  const [wrongLog, setWrongLog] = useState<ReviewItem[]>([]);

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qStartRef = useRef(0);
  /** Soal berikutnya yang sudah dibangun lebih awal (agar gambarnya bisa dipreload). */
  const peekRef = useRef<PictureQuestion | null>(null);

  const pool = useMemo(() => pictureByCategory(category), [category]);

  const { count, active: counting, start: startCountdown } = useCountdown(
    useCallback(() => setPhase("playing"), []),
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          setPhase("result");
          play("finish");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, play]);

  // Bila kategori berubah, soal "intipan" (peek) lama tidak lagi relevan.
  useEffect(() => {
    peekRef.current = null;
  }, [pool]);

  const dealQuestion = useCallback(
    (prev: PictureQuestion | null) => {
      const next = peekRef.current ?? buildPictureQuestion(pool, prev);
      setImgLoaded(false);
      setQuestion(next);
      setAnswered({ blue: false, red: false });
      setFeedback({ blue: null, red: null });
      qStartRef.current = nowMs();

      // Siapkan & preload gambar soal berikutnya supaya sudah hangat.
      const peek = buildPictureQuestion(pool, next);
      peekRef.current = peek;
      preloadImage(peek.item.image);
    },
    [pool],
  );

  const startGame = () => {
    setTeams({ blue: 0, red: 0 });
    setWrongLog([]);
    setShowSave(false);
    setTimeLeft(duration);
    setPhase("countdown");
    dealQuestion(null);
    startCountdown();
  };

  const answer = (side: TeamSide, choice: number) => {
    if (phase !== "playing" || !question || answered[side]) return;

    const cfg = teamConfig(side);
    const correct = choice === question.answer;
    const bonus = correct ? speedBonus(qStartRef.current, SPEED_BONUS_MAX, 9000) : 0;
    const gained = SCORE_CORRECT + bonus;

    setTeams((prev) => ({
      ...prev,
      [side]: correct ? prev[side] + gained : Math.max(0, prev[side] - SCORE_WRONG),
    }));
    play(correct ? "correct" : "wrong");

    if (correct) {
      juice.addBurst(cfg.hex, side);
      juice.addFloat(
        `+${gained}${bonus > 0 ? " ⚡" : ""}`,
        cfg.hex,
        side === "blue" ? "28%" : "72%",
        "46%",
      );
      juice.addFlash("rgba(163,230,53,0.2)");
    } else {
      juice.addFloat(`-${SCORE_WRONG}`, "#fb7185", side === "blue" ? "28%" : "72%", "46%");
      juice.addFlash("rgba(244,63,94,0.28)");
      setWrongLog((log) => [
        ...log,
        { word: question.item.en, expected: question.item.id },
      ]);
      fireShake();
    }

    setFeedback((prev) => ({ ...prev, [side]: correct ? "correct" : "wrong" }));
    const nextAnswered: Record<TeamSide, boolean> = { ...answered, [side]: true };
    setAnswered(nextAnswered);

    const done = solo ? true : nextAnswered.blue && nextAnswered.red;
    if (done) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => {
        const cur = question;
        dealQuestion(cur);
      }, 1200);
    }
  };

  // Buzzer keyboard: host menekan angka (BLUE: 1–4, RED: 7 8 9 0).
  useKeyboardChoices({
    enabled: phase === "playing" && !!question,
    solo,
    onChoice: answer,
    optionCount: LETTERS.length,
  });

  const winner =
    teams.blue > teams.red
      ? { msg: "BLUE WINS!", color: "#38bdf8" }
      : teams.red > teams.blue
        ? { msg: "RED WINS!", color: "#fb7185" }
        : { msg: "DRAW!", color: "#ffffff" };

  const uniqueMistakes = useMemo(() => {
    const seen = new Set<string>();
    return wrongLog.filter((it) => {
      const key = `${it.word}|${it.expected}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [wrongLog]);

  return (
    <div id={GAME_ROOT_ID} className="tex-gallery relative flex h-screen flex-col overflow-hidden bg-ink">
      <GameHeader
        title="Tebak Gambar"
        subtitle="Galeri Foto · Lihat Gambar, Pilih Katanya"
        accent={ACCENT}
        icon="🖼️"
      >
        <TimerBadge
          value={formatClock(timeLeft)}
          warning={timeLeft <= 10 && phase === "playing"}
          accent={ACCENT}
        />
      </GameHeader>

      <TeamScoreBar teams={teams} solo={solo} soloAccent="text-lime" />

      {/* Panel gambar (dipakai bersama kedua tim) */}
      <div className="relative z-20 flex flex-col items-center gap-2 border-b-2 border-line bg-black/40 py-3">
        <PhotoFrame
          src={question?.item.image ?? ""}
          alt="Tebak gambar ini"
          loaded={imgLoaded}
          onLoad={() => setImgLoaded(true)}
          className="h-40 w-64 sm:h-52 sm:w-80"
        />
        <p className="text-sm tracking-widest text-white/60 uppercase">
          {question ? "Gambar apa ini? Pilih nama Inggris yang tepat" : "—"}
        </p>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {((solo ? ["blue"] : ["blue", "red"]) as TeamSide[]).map((side) => {
          const f = feedback[side];
          const locked = answered[side];
          return (
            <div
              key={side}
              className={`relative flex flex-1 flex-col items-center justify-center gap-4 p-4 ${
                solo ? "" : side === "blue" ? "border-r-2 border-white/10" : ""
              }`}
            >
              <div
                className={`pointer-events-none absolute inset-0 transition-colors ${
                  f === "correct" ? "bg-lime/20" : f === "wrong" ? "bg-red/20" : ""
                }`}
              />

              <TeamPanelHeader side={side} score={teams[side]} solo={solo} />

              <div className="z-10 grid w-full max-w-md grid-cols-2 gap-3">
                {LETTERS.map((_, i) => {
                  const isCorrectOpt = question ? i === question.answer : false;
                  const reveal = locked && isCorrectOpt;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => answer(side, i)}
                      disabled={locked}
                      className={`btn-3d focus-ring flex items-center gap-2 px-4 py-4 text-left text-lg text-white sm:text-xl ${
                        reveal
                          ? "bg-gradient-to-b from-emerald-500 to-emerald-800 shadow-[0_6px_0_#064e3b]"
                          : side === "blue"
                            ? "bg-gradient-to-b from-sky-600 to-blue-900 shadow-[0_6px_0_#172554]"
                            : "bg-gradient-to-b from-rose-600 to-red-900 shadow-[0_6px_0_#450a0a]"
                      } ${locked && !reveal ? "opacity-40" : ""}`}
                    >
                      <span className="font-display opacity-70">{LETTERS[i]}.</span>
                      <span className="flex-1">{question ? question.options[i] : "…"}</span>
                      <span className="hidden rounded-md border border-white/25 bg-black/30 px-2 py-0.5 font-timer text-xs text-white/60 sm:inline">
                        {BUZZER_KEYS[side][i]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {locked ? (
                <span
                  className={`z-10 rounded-full px-4 py-1 font-display text-lg ${
                    f === "correct" ? "bg-emerald-500/20 text-emerald-300" : "bg-red/20 text-red"
                  }`}
                >
                  {f === "correct" ? "✔ BENAR!" : "✘ BELUM TEPAT"}
                </span>
              ) : null}

              {juice.burst && juice.burst.side === side ? (
                <Burst color={juice.burst.color} seed={juice.burst.id} />
              ) : null}
            </div>
          );
        })}

        <FloatLayer floats={juice.floats} />
      </div>

      <GameFooter />

      {juice.flash ? <ScreenFlash color={juice.flash.color} trigger={juice.flash.id} /> : null}

      {counting && count !== null ? <Countdown count={count} accent={ACCENT} /> : null}

      {phase === "menu" ? (
        <Overlay>
          <div className="absolute inset-0 -z-10 tex-gallery opacity-90" />
          <span className="mb-3 animate-bob text-6xl">🖼️</span>
          <h1
            className="font-display text-6xl text-white sm:text-7xl"
            style={{ textShadow: "0 0 50px #a3e635, 0 4px 0 #000" }}
          >
            TEBAK GAMBAR
          </h1>
          <p className="mt-2 mb-8 text-lg text-white/70">
            Lihat gambarnya, lalu pilih nama Inggris yang benar
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

          <div className="mb-6 w-full max-w-3xl text-center">
            <SectionLabel accent={ACCENT}>Kategori ({pool.length} gambar)</SectionLabel>
            <div className="flex max-h-40 flex-wrap justify-center gap-2 overflow-y-auto">
              {pictureCategories.map((c) => (
                <ChoiceButton
                  key={c}
                  label={c}
                  active={category === c}
                  onClick={() => setCategory(c)}
                  accent={ACCENT}
                />
              ))}
            </div>
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
          <KeyboardHint solo={solo} className="mb-6" />
          <StartButton
            label={pool.length < 4 ? "GAMBAR KURANG" : "START GAME"}
            onClick={startGame}
            disabled={pool.length < 4}
            color={ACCENT}
            shadow="#3f6212"
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

          <div className="mb-6 max-h-56 w-full max-w-2xl overflow-y-auto rounded-2xl border-2 border-lime/30 bg-black/50 p-5 text-left">
            <h3 className="mb-3 text-center font-display text-2xl text-lime">
              📸 Kosakata untuk Diulang
            </h3>
            {uniqueMistakes.length === 0 ? (
              <p className="text-center text-lime">Sempurna! Tidak ada kesalahan. 🌟</p>
            ) : (
              uniqueMistakes.slice(0, 15).map((it, i) => (
                <div key={i} className="border-b border-white/10 py-1.5 text-lg">
                  <b className="uppercase text-white">{it.word}</b> ={" "}
                  <span className="rounded bg-lime/20 px-2 font-bold text-lime">
                    {it.expected}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <StartButton label="PLAY AGAIN" onClick={startGame} color={ACCENT} shadow="#3f6212" />
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
        game="tebak-gambar"
        score={teams.blue}
        open={showSave}
        onClose={() => setShowSave(false)}
      />
    </div>
  );
}
