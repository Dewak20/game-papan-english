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
import { usePlatformData } from "@/lib/store";
import { SaveScoreDialog } from "@/components/SaveScoreDialog";
import { FloatLayer, GameFooter } from "@/components/gameParts";
import type { ContinuousQuestion, TeamSide } from "@/lib/types";

type Phase = "menu" | "countdown" | "playing" | "result";

const ACCENT = "#a78bfa";
const SCORE_CORRECT = 10;
const SCORE_WRONG = 5;
const SPEED_BONUS_MAX = 5;

const PRESETS = [
  { label: "30s (Warm Up)", seconds: 30 },
  { label: "1 Min (Normal)", seconds: 60 },
];

function pickQuestion(pool: ContinuousQuestion[], prev?: ContinuousQuestion | null): ContinuousQuestion {
  let q = pool[Math.floor(Math.random() * pool.length)];
  let guard = 0;
  while (prev && q.q === prev.q && guard < 8) {
    q = pool[Math.floor(Math.random() * pool.length)];
    guard++;
  }
  return q;
}

export default function ContinuousClient() {
  const { play } = useSound();
  const { questions: pool } = usePlatformData();
  const juice = useJuice();
  const fireShake = useScreenShake();
  const theme = useMemo(() => musicTheme("continuous-battle"), []);

  const [phase, setPhase] = useState<Phase>("menu");
  const [duration, setDuration] = useState(30);
  const [customMin, setCustomMin] = useState("");
  const [solo, setSolo] = useState(false);
  const [showSave, setShowSave] = useState(false);

  useMusic(theme, phase === "playing" || phase === "countdown");

  const [timeLeft, setTimeLeft] = useState(30);
  const [teams, setTeams] = useState<Record<TeamSide, number>>({ blue: 0, red: 0 });
  const [questions, setQuestions] = useState<Record<TeamSide, ContinuousQuestion | null>>({
    blue: null,
    red: null,
  });
  const [flash, setFlash] = useState<Record<TeamSide, "correct" | "wrong" | null>>({
    blue: null,
    red: null,
  });

  const flashTimer = useRef<Record<TeamSide, ReturnType<typeof setTimeout> | null>>({
    blue: null,
    red: null,
  });
  const qStartRef = useRef<Record<TeamSide, number>>({ blue: 0, red: 0 });

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
    if (pool.length === 0) return;
    const manual = parseFloat(customMin);
    const finalDuration = manual > 0 ? Math.round(manual * 60) : duration;
    setTeams({ blue: 0, red: 0 });
    setQuestions({ blue: pickQuestion(pool), red: solo ? null : pickQuestion(pool) });
    setFlash({ blue: null, red: null });
    setShowSave(false);
    setTimeLeft(finalDuration);
    setPhase("countdown");
    const now = nowMs();
    qStartRef.current = { blue: now, red: now };
    startCountdown();
  };

  const answer = (side: TeamSide, choice: 0 | 1) => {
    if (phase !== "playing") return;
    const q = questions[side];
    if (!q) return;

    const cfg = teamConfig(side);
    const correct = choice === q.ans;
    const bonus = correct ? speedBonus(qStartRef.current[side], SPEED_BONUS_MAX) : 0;
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
        "36%",
      );
      juice.addFlash("rgba(167,139,250,0.2)");
    } else {
      juice.addFloat(`-${SCORE_WRONG}`, "#fb7185", side === "blue" ? "30%" : "70%", "36%");
      juice.addFlash("rgba(244,63,94,0.28)");
      fireShake();
    }

    setFlash((prev) => ({ ...prev, [side]: correct ? "correct" : "wrong" }));
    if (flashTimer.current[side]) clearTimeout(flashTimer.current[side]!);
    flashTimer.current[side] = setTimeout(() => setFlash((prev) => ({ ...prev, [side]: null })), 350);

    setQuestions((prev) => ({ ...prev, [side]: pickQuestion(pool, q) }));
    qStartRef.current = { ...qStartRef.current, [side]: nowMs() };
  };

  const winner =
    teams.blue > teams.red
      ? { msg: "BLUE WINS!", color: "#38bdf8" }
      : teams.red > teams.blue
        ? { msg: "RED WINS!", color: "#fb7185" }
        : { msg: "DRAW!", color: "#ffffff" };

  return (
    <div id={GAME_ROOT_ID} className="tex-time relative flex h-screen flex-col overflow-hidden">
      <GameHeader title="Continuous Battle" subtitle="Lab Waktu · Present Continuous" accent={ACCENT} icon="⏳">
        <TimerBadge value={formatClock(timeLeft)} warning={timeLeft <= 10 && phase === "playing"} accent={ACCENT} />
      </GameHeader>

      <div className="relative flex flex-1 overflow-hidden">
        {((solo ? ["blue"] : ["blue", "red"]) as TeamSide[]).map((side) => {
          const cfg = teamConfig(side);
          const q = questions[side];
          const f = flash[side];
          return (
            <div
              key={side}
              className={`relative flex flex-1 flex-col items-center justify-center gap-6 p-6 transition-colors duration-200 ${
                side === "blue"
                  ? "bg-[radial-gradient(circle_at_center,#312e81_0%,#0b0a1f_100%)]"
                  : "bg-[radial-gradient(circle_at_center,#4c1d95_0%,#120a1f_100%)]"
              } ${f === "correct" ? "bg-green/25" : f === "wrong" ? "bg-red/25" : ""}`}
            >
              {/* roda gigi dekoratif */}
              <div
                className={`pointer-events-none absolute text-[9rem] opacity-10 ${
                  side === "blue" ? "top-4 left-2 animate-spin-slow" : "right-2 bottom-4 animate-spin-rev"
                }`}
              >
                ⚙️
              </div>

              <div className="flex w-full items-center justify-between px-2">
                <span className={`font-display text-3xl ${cfg.text}`}>{solo ? "🧑 KAMU" : cfg.name}</span>
                <span className={`font-display text-6xl ${cfg.text}`}>{teams[side]}</span>
              </div>

              <div
                key={q?.q}
                className="flex min-h-[160px] w-[92%] animate-bounce-in items-center justify-center rounded-3xl border-4 border-violet/30 bg-white/95 px-8 py-8 text-center font-display text-4xl text-ink shadow-[0_0_50px_-10px_rgba(167,139,250,0.8)] sm:text-5xl"
              >
                {q ? q.q : "Loading…"}
              </div>

              <div className="flex w-[92%] gap-5">
                {([0, 1] as const).map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => answer(side, i)}
                    className={`btn-3d focus-ring flex-1 px-4 py-8 font-display text-3xl text-white ${
                      side === "blue"
                        ? "bg-gradient-to-b from-indigo-500 to-indigo-800 shadow-[0_8px_0_#312e81]"
                        : "bg-gradient-to-b from-violet-500 to-violet-800 shadow-[0_8px_0_#4c1d95]"
                    }`}
                  >
                    {q ? q.opts[i] : "…"}
                  </button>
                ))}
              </div>

              {juice.burst && juice.burst.side === side ? (
                <Burst color={juice.burst.color} seed={juice.burst.id} />
              ) : null}
            </div>
          );
        })}

      <FloatLayer floats={juice.floats} sizeClass="text-6xl" />
      </div>

      <GameFooter />

      {juice.flash ? <ScreenFlash color={juice.flash.color} trigger={juice.flash.id} /> : null}

      {counting && count !== null ? <Countdown count={count} accent={ACCENT} /> : null}

      {phase === "menu" ? (
        <Overlay>
          <div className="absolute inset-0 -z-10 tex-time opacity-60" />
          <span className="mb-3 animate-spin-slow text-6xl">⏳</span>
          <h1
            className="font-display text-6xl sm:text-7xl"
            style={{ color: ACCENT, textShadow: `0 0 50px ${ACCENT}, 0 4px 0 #000` }}
          >
            CONTINUOUS BATTLE
          </h1>
          <p className="mt-2 mb-8 text-lg text-muted">Present Continuous Edition</p>

          <div className="mb-6 w-full max-w-2xl text-center">
            <SectionLabel accent={ACCENT}>Tipe Permainan</SectionLabel>
            <div className="flex flex-wrap justify-center gap-3">
              <ChoiceButton label="👥 Duel 2 Tim" active={!solo} onClick={() => setSolo(false)} accent={ACCENT} />
              <ChoiceButton label="🧑 Latihan Mandiri" active={solo} onClick={() => setSolo(true)} accent={ACCENT} />
            </div>
          </div>

          <div className="mb-6 w-full max-w-2xl text-center">
            <SectionLabel accent={ACCENT}>Duration</SectionLabel>
            <div className="flex flex-wrap justify-center gap-3">
              {PRESETS.map((p) => (
                <ChoiceButton
                  key={p.seconds}
                  label={p.label}
                  active={!customMin && duration === p.seconds}
                  onClick={() => {
                    setDuration(p.seconds);
                    setCustomMin("");
                  }}
                  accent={ACCENT}
                />
              ))}
            </div>
          </div>

          <div className="mb-10 flex flex-col items-center gap-3">
            <p className="text-sm font-semibold text-muted">Atau isi manual (dalam menit):</p>
            <input
              type="number"
              min={1}
              value={customMin}
              onChange={(e) => setCustomMin(e.target.value)}
              placeholder="Contoh: 5"
              className="focus-ring w-52 rounded-xl border-2 border-violet/40 bg-ink-soft px-5 py-3 text-center text-2xl text-white outline-none"
            />
          </div>

          <SpeedHint />
          <StartButton label="START GAME" onClick={startGame} color={ACCENT} shadow="#5b21b6" />
        </Overlay>
      ) : null}

      {phase === "result" ? (
        <Overlay>
          {!solo && winner.msg !== "DRAW!" ? <Confetti count={100} /> : null}
          {solo ? (
            <>
              <span className="text-6xl">⏱️</span>
              <h1 className="mb-4 mt-2 font-display text-6xl text-gold" style={{ textShadow: "0 0 40px #fbbf24, 3px 3px 0 #000" }}>
                LATIHAN SELESAI!
              </h1>
              <div className="mb-8 animate-glow rounded-3xl border-2 border-gold/40 bg-gold/10 px-16 py-6 text-center">
                <p className="text-sm tracking-widest text-muted uppercase">Skor Kamu</p>
                <p className="font-display text-8xl text-gold">{teams.blue}</p>
              </div>
            </>
          ) : (
            <>
              <WinnerBanner title={winner.msg} color={winner.color} emoji={winner.msg === "DRAW!" ? "🤝" : "🏆"} />
              <div className="my-8">
                <ScoreBoard blue={teams.blue} red={teams.red} />
              </div>
            </>
          )}
          <div className="flex flex-wrap justify-center gap-4">
            <StartButton label="PLAY AGAIN" onClick={startGame} color={ACCENT} shadow="#5b21b6" />
            {solo ? (
              <button
                type="button"
                onClick={() => setShowSave(true)}
                className="btn-3d focus-ring flex items-center bg-gold px-8 py-4 text-2xl text-ink shadow-[0_10px_0_#b45309]"
              >
                💾 SIMPAN SKOR
              </button>
            ) : null}
            <Link href="/" className="btn-3d focus-ring flex items-center bg-line px-8 py-4 text-2xl text-white shadow-[0_10px_0_#0b1226]">
              MENU
            </Link>
          </div>
        </Overlay>
      ) : null}

      <SaveScoreDialog game="continuous-battle" score={teams.blue} open={showSave} onClose={() => setShowSave(false)} />
    </div>
  );
}
