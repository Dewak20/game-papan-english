"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { GameHeader, TimerBadge, formatClock } from "@/components/GameChrome";
import { Overlay, ChoiceButton, StartButton, teamConfig, SectionLabel, SpeedHint } from "@/components/ui";
import { Confetti, Burst, ScreenFlash, ComboMeter, Countdown, WinnerBanner, ScoreBoard } from "@/components/juice";
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
import type { ReviewItem, TeamSide } from "@/lib/types";

type Mode = 1 | 2 | 3;
type Phase = "menu" | "countdown" | "playing" | "result";

interface Card {
  word: string;
  type: "A" | "B";
  label: string;
}

const ACCENT = "#38bdf8";

const MODES: { id: Mode; label: string }[] = [
  { id: 1, label: "Noun vs Verb" },
  { id: 2, label: "Noun vs Adjective" },
  { id: 3, label: "Verb vs Adjective" },
];

const DURATIONS = [60, 300, 600, 900, 1200, 1800];

const SCORE_NORMAL = 10;
const SCORE_COMBO = 15;
const SCORE_PENALTY = 5;
const STREAK_THRESHOLD = 3;
const SPEED_BONUS_MAX = 5;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function WordBattleClient() {
  const { play } = useSound();
  const data = usePlatformData();
  const { nouns, verbs, adjectives } = data;
  const juice = useJuice();
  const fireShake = useScreenShake();
  const theme = useMemo(() => musicTheme("word-battle"), []);

  const [phase, setPhase] = useState<Phase>("menu");
  const [mode, setMode] = useState<Mode>(1);
  const [duration, setDuration] = useState(60);
  const [solo, setSolo] = useState(false);
  const [showSave, setShowSave] = useState(false);

  useMusic(theme, phase === "playing" || phase === "countdown");

  const [timeLeft, setTimeLeft] = useState(60);
  const [cards, setCards] = useState<Record<TeamSide, Card | null>>({ blue: null, red: null });
  const [teams, setTeams] = useState<Record<TeamSide, { score: number; streak: number }>>({
    blue: { score: 0, streak: 0 },
    red: { score: 0, streak: 0 },
  });
  const [shakeSide, setShakeSide] = useState<TeamSide | null>(null);
  const [flashSide, setFlashSide] = useState<TeamSide | null>(null);
  const [wrongLog, setWrongLog] = useState<ReviewItem[]>([]);
  const cardStartRef = useRef<Record<TeamSide, number>>({ blue: 0, red: 0 });

  const { catA, catB, labelA, labelB } = useMemo(() => {
    if (mode === 1) return { catA: nouns, catB: verbs, labelA: "NOUN", labelB: "VERB" };
    if (mode === 2)
      return { catA: nouns, catB: adjectives, labelA: "NOUN", labelB: "ADJECTIVE" };
    return { catA: verbs, catB: adjectives, labelA: "VERB", labelB: "ADJECTIVE" };
  }, [mode, nouns, verbs, adjectives]);

  const makeCard = useCallback((): Card => {
    const isA = Math.random() < 0.5;
    if (isA) return { word: pick(catA), type: "A", label: labelA };
    return { word: pick(catB), type: "B", label: labelB };
  }, [catA, catB, labelA, labelB]);

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
    setTeams({ blue: { score: 0, streak: 0 }, red: { score: 0, streak: 0 } });
    setCards({ blue: makeCard(), red: solo ? null : makeCard() });
    const now = nowMs();
    cardStartRef.current = { blue: now, red: now };
    setWrongLog([]);
    setShakeSide(null);
    setShowSave(false);
    setTimeLeft(duration);
    setPhase("countdown");
    startCountdown();
  };

  const handleAnswer = (side: TeamSide, answer: "A" | "B") => {
    if (phase !== "playing") return;
    const card = cards[side];
    if (!card) return;

    const cfg = teamConfig(side);
    const correct = answer === card.type;
    const nextStreak = correct ? teams[side].streak + 1 : 0;
    const bonus = correct ? speedBonus(cardStartRef.current[side], SPEED_BONUS_MAX) : 0;
    const basePoints = correct
      ? nextStreak >= STREAK_THRESHOLD
        ? SCORE_COMBO
        : SCORE_NORMAL
      : SCORE_PENALTY;
    const points = basePoints + bonus;

    setTeams((prev) => {
      const t = { ...prev[side] };
      if (correct) {
        t.streak = nextStreak;
        t.score += points;
      } else {
        t.streak = 0;
        t.score = Math.max(0, t.score - SCORE_PENALTY);
      }
      return { ...prev, [side]: t };
    });

    if (correct) {
      play("correct");
      juice.addFloat(`+${points}${bonus > 0 ? " ⚡" : ""}`, cfg.hex, side === "blue" ? "32%" : "68%", "38%");
      juice.addBurst(cfg.hex, side);
      juice.addFlash("rgba(56,189,248,0.18)");
    } else {
      play("wrong");
      juice.addFloat(`-${SCORE_PENALTY}`, "#fb7185", side === "blue" ? "32%" : "68%", "38%");
      juice.addFlash("rgba(244,63,94,0.28)");
      setWrongLog((log) => [...log, { word: card.word, expected: card.label }]);
      setShakeSide(side);
      fireShake();
      setTimeout(() => setShakeSide(null), 420);
    }

    setFlashSide(side);
    setTimeout(() => setFlashSide(null), 320);
    setCards((prev) => ({ ...prev, [side]: makeCard() }));
    cardStartRef.current = { ...cardStartRef.current, [side]: nowMs() };
  };

  const winner =
    teams.blue.score > teams.red.score
      ? "BLUE WINS!"
      : teams.red.score > teams.blue.score
        ? "RED WINS!"
        : "DRAW!";

  const uniqueMistakes = useMemo(() => {
    const seen = new Set<string>();
    return wrongLog.filter((item) => {
      const key = `${item.word}|${item.expected}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [wrongLog]);

  const total = teams.blue.score + teams.red.score;
  const bluePct =
    total > 0 ? Math.min(Math.max((teams.blue.score / total) * 100, 12), 88) : 50;

  return (
    <div id={GAME_ROOT_ID} className="tex-neon scanlines relative flex h-screen flex-col overflow-hidden">
      <GameHeader
        title="Word Battle"
        subtitle="Noun · Verb · Adjective"
        accent={ACCENT}
        icon="🎯"
      >
        <TimerBadge value={formatClock(timeLeft)} warning={timeLeft <= 10 && phase === "playing"} accent={ACCENT} />
      </GameHeader>

      {/* Battle bar */}
      {!solo ? (
        <div className="relative z-20 flex h-16 w-full border-b-2 border-line bg-black/50">
          <div
            className="flex items-center justify-start overflow-hidden border-r border-white/10 bg-gradient-to-r from-sky-500 to-blue-700 pl-6 font-display text-2xl text-white transition-[width] duration-500"
            style={{ width: `${bluePct}%` }}
          >
            {bluePct > 20 ? "TEAM BLUE" : ""}
          </div>
          <div
            className="flex items-center justify-end overflow-hidden bg-gradient-to-l from-rose-500 to-red-700 pr-6 font-display text-2xl text-white transition-[width] duration-500"
            style={{ width: `${100 - bluePct}%` }}
          >
            {bluePct < 80 ? "TEAM RED" : ""}
          </div>
          <div className="absolute top-1/2 left-1/2 flex h-14 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center border-4 border-white/70 bg-gradient-to-br from-white to-slate-300 font-display text-2xl text-ink [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]">
            VS
          </div>
        </div>
      ) : (
        <div className="relative z-20 flex h-16 w-full items-center justify-between border-b-2 border-line bg-black/50 px-6">
          <span className="font-display text-2xl text-blue">🧑 LATIHAN MANDIRI</span>
          <span className="font-display text-2xl text-gold">SKOR: {teams.blue.score}</span>
        </div>
      )}

      {/* Arena */}
      <div className="relative flex flex-1 overflow-hidden">
        {((solo ? ["blue"] : ["blue", "red"]) as TeamSide[]).map((side) => {
          const cfg = teamConfig(side);
          const team = teams[side];
          const card = cards[side];
          const fire = team.streak >= STREAK_THRESHOLD;
          return (
            <div
              key={side}
              className={`relative flex flex-1 flex-col items-center justify-center p-6 ${
                side === "blue"
                  ? "bg-[radial-gradient(circle_at_center,#1e3a8a_0%,#050a1a_100%)]"
                  : "bg-[radial-gradient(circle_at_center,#7f1d1d_0%,#1a0508_100%)]"
              } ${shakeSide === side ? "animate-shake" : ""}`}
            >
              {/* garis neon vertikal */}
              <div
                className="pointer-events-none absolute inset-y-0 w-1 opacity-60"
                style={{
                  [side === "blue" ? "right" : "left"]: 0,
                  background: `linear-gradient(180deg, transparent, ${cfg.hex}, transparent)`,
                }}
              />

              {flashSide === side ? (
                <div
                  className="pointer-events-none absolute inset-0 animate-flash"
                  style={{
                    backgroundColor:
                      teams[side].streak > 0 ? "rgba(56,189,248,0.25)" : "rgba(244,63,94,0.25)",
                  }}
                />
              ) : null}

              {/* skor raksasa di belakang */}
              <div
                className={`pointer-events-none absolute top-[6%] font-display text-[11rem] leading-none transition-all ${
                  fire ? "text-orange-400/40 [text-shadow:0_0_40px_#f97316]" : "text-white/12"
                }`}
              >
                {team.score}
              </div>

              {fire ? (
                <div className="absolute top-[24%] z-10 animate-wiggle rounded-full border-2 border-orange-400/60 bg-black/60 px-5 py-1.5 font-display text-xl text-yellow-300">
                  🔥 STREAK x{team.streak}
                </div>
              ) : null}

              <div
                key={card?.word}
                className="z-10 mb-8 flex min-h-[150px] w-[82%] animate-bounce-in items-center justify-center rounded-3xl border-4 border-white/20 bg-gradient-to-b from-white to-slate-200 px-6 py-8 text-center font-display text-5xl text-ink shadow-[0_14px_40px_rgba(0,0,0,0.6)] sm:text-6xl"
              >
                {card ? card.word.toUpperCase() : "..."}
              </div>

              <div className="z-10 flex w-[90%] gap-5">
                {(["A", "B"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleAnswer(side, opt)}
                    className={`btn-3d focus-ring flex-1 px-4 py-6 font-display text-2xl tracking-wider text-white ${
                      side === "blue"
                        ? "bg-gradient-to-b from-blue-deep to-blue-900 shadow-[0_8px_0_#172554]"
                        : "bg-gradient-to-b from-red-deep to-red-900 shadow-[0_8px_0_#450a0a]"
                    }`}
                  >
                    {opt === "A" ? labelA : labelB}
                  </button>
                ))}
              </div>

              {/* efek */}
              {juice.burst && juice.burst.side === side ? (
                <Burst color={juice.burst.color} seed={juice.burst.id} />
              ) : null}
              <div className="absolute bottom-4 left-0 w-full px-6">
                <ComboMeter value={team.streak} max={5} label={side === "blue" ? "COMBO" : "COMBO"} />
              </div>
            </div>
          );
        })}

        {juice.floats.map((f) => (
          <div
            key={f.id}
            className="pointer-events-none absolute z-[130] animate-rise font-display text-7xl font-bold"
            style={{ left: f.x, top: f.y, color: f.color, textShadow: "0 6px 18px rgba(0,0,0,0.8)" }}
          >
            {f.text}
          </div>
        ))}
      </div>

      <footer className="pointer-events-none z-10 bg-gradient-to-t from-black/80 to-transparent py-3 text-center text-xs tracking-widest text-white/60">
        © {new Date().getFullYear()} Dewa Krishnadana
      </footer>

      {juice.flash ? <ScreenFlash color={juice.flash.color} trigger={juice.flash.id} /> : null}

      {counting && count !== null ? <Countdown count={count} accent={ACCENT} /> : null}

      {/* Menu */}
      {phase === "menu" ? (
        <Overlay className="bg-ink/95">
          <div className="absolute inset-0 -z-10 tex-neon opacity-60" />
          <span className="mb-3 animate-pulse-soft text-6xl">🎯</span>
          <h1
            className="font-display text-6xl sm:text-7xl"
            style={{ color: ACCENT, textShadow: `0 0 50px ${ACCENT}, 0 4px 0 #000` }}
          >
            WORD BATTLE
          </h1>
          <p className="mt-2 mb-8 text-lg text-muted">Klasifikasi kata sebelum waktu habis!</p>

          <div className="mb-6 w-full max-w-2xl text-center">
            <SectionLabel accent={ACCENT}>Tipe Permainan</SectionLabel>
            <div className="flex flex-wrap justify-center gap-3">
              <ChoiceButton label="👥 Duel 2 Tim" active={!solo} onClick={() => setSolo(false)} accent={ACCENT} />
              <ChoiceButton label="🧑 Latihan Mandiri" active={solo} onClick={() => setSolo(true)} accent={ACCENT} />
            </div>
          </div>

          <div className="mb-6 w-full max-w-2xl text-center">
            <SectionLabel accent={ACCENT}>Game Mode</SectionLabel>
            <div className="flex flex-wrap justify-center gap-3">
              {MODES.map((m) => (
                <ChoiceButton key={m.id} label={m.label} active={mode === m.id} onClick={() => setMode(m.id)} accent={ACCENT} />
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
          <StartButton label="START GAME" onClick={startGame} color={ACCENT} shadow="#0369a1" />
        </Overlay>
      ) : null}

      {/* Hasil */}
      {phase === "result" ? (
        <Overlay>
          {!solo && winner !== "DRAW!" ? <Confetti count={100} /> : null}
          {solo ? (
            <>
              <span className="text-6xl">🎉</span>
              <h1 className="mb-4 mt-2 font-display text-6xl text-gold" style={{ textShadow: "0 0 40px #fbbf24, 3px 3px 0 #000" }}>
                LATIHAN SELESAI!
              </h1>
              <div className="mb-8 rounded-3xl border-2 border-gold/40 bg-gold/10 px-16 py-6 text-center animate-glow">
                <p className="text-sm tracking-widest text-muted uppercase">Skor Kamu</p>
                <p className="font-display text-8xl text-gold">{teams.blue.score}</p>
              </div>
            </>
          ) : (
            <>
              <WinnerBanner
                title={winner}
                color={winner === "DRAW!" ? "#fff" : winner.startsWith("BLUE") ? "#38bdf8" : "#fb7185"}
                emoji={winner === "DRAW!" ? "🤝" : "🏆"}
              />
              <div className="my-8">
                <ScoreBoard blue={teams.blue.score} red={teams.red.score} />
              </div>
            </>
          )}

          <div className="mb-6 max-h-56 w-full max-w-2xl overflow-y-auto rounded-2xl border-2 border-gold/30 bg-black/50 p-5 text-left">
            <h3 className="mb-3 text-center font-display text-2xl text-gold">📖 Words to Review</h3>
            {uniqueMistakes.length === 0 ? (
              <p className="text-center text-green">Perfect Game! No mistakes. 🌟</p>
            ) : (
              uniqueMistakes.slice(0, 15).map((item, i) => (
                <div key={i} className="border-b border-white/10 py-1.5 text-lg">
                  <b>{item.word}</b> →{" "}
                  <span className="rounded bg-green/20 px-2 font-bold text-green">{item.expected}</span>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <StartButton label="PLAY AGAIN" onClick={startGame} color={ACCENT} shadow="#0369a1" />
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

      <SaveScoreDialog game="word-battle" score={teams.blue.score} open={showSave} onClose={() => setShowSave(false)} />
    </div>
  );
}
