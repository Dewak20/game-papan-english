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
import { SaveScoreDialog } from "@/components/SaveScoreDialog";
import { FloatLayer, GameFooter } from "@/components/gameParts";
import {
  buildReadingRound,
  readingByLevel,
  type ReadingLevel,
  type ReadingRound,
} from "@/lib/reading";
import type { ReviewItem, TeamSide } from "@/lib/types";

type Phase = "menu" | "countdown" | "playing" | "result";

const ACCENT = "#2dd4bf";
const SCORE_CORRECT = 15;
const SCORE_WRONG = 5;
const SPEED_BONUS_MAX = 8;
const DURATIONS = [60, 180, 300, 600];

const LEVELS: { id: ReadingLevel; label: string; hint: string }[] = [
  { id: "easy", label: "Mudah", hint: "Teks pendek" },
  { id: "medium", label: "Sedang", hint: "Teks sedang" },
  { id: "hard", label: "Sulit", hint: "Teks panjang" },
];

export default function ReadingClient() {
  const { play } = useSound();
  const juice = useJuice();
  const fireShake = useScreenShake();
  const theme = useMemo(() => musicTheme("reading-race"), []);

  const [phase, setPhase] = useState<Phase>("menu");
  const [duration, setDuration] = useState(180);
  const [level, setLevel] = useState<ReadingLevel>("easy");
  const [solo, setSolo] = useState(false);
  const [showSave, setShowSave] = useState(false);

  useMusic(theme, phase === "playing" || phase === "countdown");

  const [timeLeft, setTimeLeft] = useState(180);
  const [teams, setTeams] = useState<Record<TeamSide, number>>({ blue: 0, red: 0 });
  const [rounds, setRounds] = useState<Record<TeamSide, ReadingRound | null>>({
    blue: null,
    red: null,
  });
  const [flash, setFlash] = useState<Record<TeamSide, "correct" | "wrong" | null>>({
    blue: null,
    red: null,
  });
  const [wrongLog, setWrongLog] = useState<ReviewItem[]>([]);

  const flashTimer = useRef<Record<TeamSide, ReturnType<typeof setTimeout> | null>>({
    blue: null,
    red: null,
  });
  const qStartRef = useRef<Record<TeamSide, number>>({ blue: 0, red: 0 });

  const pool = useMemo(() => readingByLevel(level), [level]);

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

  const startGame = () => {
    setTeams({ blue: 0, red: 0 });
    setWrongLog([]);
    setRounds({
      blue: buildReadingRound(pool),
      red: solo ? null : buildReadingRound(pool),
    });
    setFlash({ blue: null, red: null });
    setShowSave(false);
    setTimeLeft(duration);
    setPhase("countdown");
    const now = nowMs();
    qStartRef.current = { blue: now, red: now };
    startCountdown();
  };

  const answer = (side: TeamSide, choice: 0 | 1 | 2) => {
    if (phase !== "playing") return;
    const round = rounds[side];
    if (!round) return;

    const cfg = teamConfig(side);
    const correct = choice === round.question.answer;
    const bonus = correct ? speedBonus(qStartRef.current[side], SPEED_BONUS_MAX, 8000) : 0;
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
        side === "blue" ? "30%" : "70%",
        "30%",
      );
      juice.addFlash("rgba(45,212,191,0.2)");
    } else {
      juice.addFloat(`-${SCORE_WRONG}`, "#fb7185", side === "blue" ? "30%" : "70%", "30%");
      juice.addFlash("rgba(244,63,94,0.28)");
      setWrongLog((log) => [
        ...log,
        { word: round.passage.title, expected: round.question.options[round.question.answer] },
      ]);
      fireShake();
    }

    setFlash((prev) => ({ ...prev, [side]: correct ? "correct" : "wrong" }));
    if (flashTimer.current[side]) clearTimeout(flashTimer.current[side]!);
    flashTimer.current[side] = setTimeout(
      () => setFlash((prev) => ({ ...prev, [side]: null })),
      350,
    );

    setRounds((prev) => ({ ...prev, [side]: buildReadingRound(pool, round) }));
    qStartRef.current = { ...qStartRef.current, [side]: nowMs() };
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

  return (
    <div id={GAME_ROOT_ID} className="tex-read relative flex h-screen flex-col overflow-hidden bg-ink">
      <GameHeader
        title="Reading Race"
        subtitle="Perpustakaan · Pemahaman Bacaan"
        accent={ACCENT}
        icon="📖"
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
          <span className="font-display text-2xl text-teal">🧑 LATIHAN MANDIRI</span>
          <span className="font-display text-2xl text-gold">SKOR: {teams.blue}</span>
        </div>
      )}

      <div className="relative flex flex-1 overflow-hidden">
        {((solo ? ["blue"] : ["blue", "red"]) as TeamSide[]).map((side) => {
          const cfg = teamConfig(side);
          const round = rounds[side];
          const f = flash[side];
          return (
            <div
              key={side}
              className={`relative flex flex-1 flex-col items-center gap-3 border-white/10 p-4 ${
                solo ? "" : side === "blue" ? "border-r-2" : ""
              }`}
            >
              <div
                className={`pointer-events-none absolute inset-0 transition-colors ${
                  f === "correct" ? "bg-teal/20" : f === "wrong" ? "bg-red/20" : ""
                }`}
              />

              {/* HUD tim */}
              <div className="z-10 flex w-full items-center justify-between px-2">
                <span className={`font-display text-xl ${cfg.text}`}>
                  {solo ? "🧑 KAMU" : cfg.name}
                </span>
                <span className={`font-display text-4xl ${cfg.text}`}>{teams[side]}</span>
              </div>

              {/* Bacaan */}
              <div
                key={round?.passage.id}
                className="z-10 w-full flex-1 animate-slide-up overflow-y-auto rounded-2xl border-2 border-teal/30 bg-[#f7f1e0] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
              >
                <h3 className="mb-2 border-b-2 border-amber-800/30 pb-2 font-display text-2xl text-amber-900">
                  {round ? round.passage.title : "…"}
                </h3>
                <p className="text-lg leading-relaxed text-stone-800 sm:text-xl">
                  {round ? round.passage.text : "…"}
                </p>
              </div>

              {/* Pertanyaan + pilihan */}
              <div className="z-10 w-full rounded-2xl border-2 border-line bg-black/40 p-4">
                <p className="mb-3 text-center text-lg font-semibold text-white sm:text-xl">
                  {round ? round.question.q : "…"}
                </p>
                <div className="flex flex-col gap-2">
                  {([0, 1, 2] as const).map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => answer(side, i)}
                      className={`btn-3d focus-ring px-4 py-3 text-left text-base text-white sm:text-lg ${
                        side === "blue"
                          ? "bg-gradient-to-b from-teal-600 to-teal-900 shadow-[0_6px_0_#134e4a]"
                          : "bg-gradient-to-b from-rose-600 to-red-900 shadow-[0_6px_0_#450a0a]"
                      }`}
                    >
                      <span className="mr-2 font-display opacity-70">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {round ? round.question.options[i] : "…"}
                    </button>
                  ))}
                </div>
              </div>

              {juice.burst && juice.burst.side === side ? (
                <Burst color={juice.burst.color} seed={juice.burst.id} />
              ) : null}
            </div>
          );
        })}

      <FloatLayer floats={juice.floats} sizeClass="text-5xl" />
      </div>

      <GameFooter />

      {juice.flash ? <ScreenFlash color={juice.flash.color} trigger={juice.flash.id} /> : null}

      {counting && count !== null ? <Countdown count={count} accent={ACCENT} /> : null}

      {phase === "menu" ? (
        <Overlay>
          <div className="absolute inset-0 -z-10 tex-read opacity-90" />
          <span className="mb-3 animate-bob text-6xl">📖</span>
          <h1 className="font-display text-6xl text-white drop-shadow-[0_4px_20px_rgba(45,212,191,0.5)] sm:text-7xl">
            READING RACE
          </h1>
          <p className="mt-2 mb-8 text-lg text-white/70">
            Baca teksnya, jawab pertanyaannya secepat mungkin
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
            <SectionLabel accent={ACCENT}>Tingkat Kesulitan ({pool.length} bacaan)</SectionLabel>
            <div className="flex flex-wrap justify-center gap-3">
              {LEVELS.map((l) => (
                <ChoiceButton
                  key={l.id}
                  label={`${l.label} · ${l.hint}`}
                  active={level === l.id}
                  onClick={() => setLevel(l.id)}
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
          <StartButton
            label="START GAME"
            onClick={startGame}
            color={ACCENT}
            shadow="#0f766e"
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
            <h3 className="mb-3 text-center font-display text-2xl text-gold">📌 Yang Perlu Diulang</h3>
            {uniqueMistakes.length === 0 ? (
              <p className="text-center text-teal">Sempurna! Tidak ada kesalahan. 🌟</p>
            ) : (
              uniqueMistakes.slice(0, 12).map((item, i) => (
                <div key={i} className="border-b border-white/10 py-1.5 text-lg">
                  <b>{item.word}</b> →{" "}
                  <span className="rounded bg-teal/20 px-2 font-bold text-teal">
                    {item.expected}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <StartButton label="PLAY AGAIN" onClick={startGame} color={ACCENT} shadow="#0f766e" />
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
        game="reading-race"
        score={teams.blue}
        open={showSave}
        onClose={() => setShowSave(false)}
      />
    </div>
  );
}
