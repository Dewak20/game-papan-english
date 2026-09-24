"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { GameHeader, TimerBadge, formatClock } from "@/components/GameChrome";
import { Overlay, ChoiceButton, StartButton, teamConfig, SectionLabel, SpeedHint } from "@/components/ui";
import { Confetti, Burst, ScreenFlash, WinnerBanner, ScoreBoard } from "@/components/juice";
import { useJuice } from "@/lib/useJuice";
import { useSound } from "@/lib/useSound";
import { useMusic } from "@/lib/useMusic";
import { musicTheme } from "@/lib/musicThemes";
import { useScreenShake, GAME_ROOT_ID } from "@/lib/useScreenShake";
import { nowMs } from "@/lib/clock";
import { speedBonus } from "@/lib/scoring";
import { usePlatformData } from "@/lib/store";
import { SaveScoreDialog } from "@/components/SaveScoreDialog";
import { FloatLayer, GameFooter } from "@/components/gameParts";
import type { TeamSide } from "@/lib/types";

type Phase = "menu" | "playing" | "result";

interface Player {
  target: string;
  hint: string;
  guessed: string[];
  wrong: number;
  score: number;
}

const ACCENT = "#a78bfa";
const DURATIONS = [60, 180, 300];
const MAX_WRONG = 6;
const SCORE_WORD = 100;
const SPEED_BONUS_MAX = 50;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const emptyPlayer = (): Player => ({ target: "", hint: "", guessed: [], wrong: 0, score: 0 });

/** Tiang gantungan + boneka jerami yang muncul bertahap. */
function Gallows({ wrong, side }: { wrong: number; side: TeamSide }) {
  const stroke = side === "blue" ? "#7dd3fc" : "#fda4af";
  const parts = [
    <circle key="head" cx="70" cy="46" r="12" fill="rgba(255,255,255,0.08)" stroke={stroke} strokeWidth="4" />,
    <line key="body" x1="70" y1="58" x2="70" y2="95" stroke={stroke} strokeWidth="4" />,
    <line key="larm" x1="70" y1="68" x2="52" y2="80" stroke={stroke} strokeWidth="4" />,
    <line key="rarm" x1="70" y1="68" x2="88" y2="80" stroke={stroke} strokeWidth="4" />,
    <line key="lleg" x1="70" y1="95" x2="55" y2="115" stroke={stroke} strokeWidth="4" />,
    <line key="rleg" x1="70" y1="95" x2="85" y2="115" stroke={stroke} strokeWidth="4" />,
  ];
  return (
    <svg viewBox="0 0 140 130" className="h-32 w-36 drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]">
      <line x1="20" y1="122" x2="100" y2="122" stroke="#7c5a3a" strokeWidth="5" />
      <line x1="45" y1="122" x2="45" y2="14" stroke="#7c5a3a" strokeWidth="5" />
      <line x1="45" y1="16" x2="70" y2="16" stroke="#7c5a3a" strokeWidth="5" />
      <g className={wrong > 0 ? "origin-top animate-swing" : ""}>
        <line x1="70" y1="16" x2="70" y2="34" stroke="#7c5a3a" strokeWidth="4" />
        {parts.slice(0, wrong)}
      </g>
    </svg>
  );
}

export default function HangmanClient() {
  const { play } = useSound();
  const { vocab } = usePlatformData();
  const juice = useJuice();
  const fireShake = useScreenShake();
  const theme = useMemo(() => musicTheme("hangman"), []);

  const [phase, setPhase] = useState<Phase>("menu");
  const [duration, setDuration] = useState(180);
  const [solo, setSolo] = useState(false);
  const [showSave, setShowSave] = useState(false);

  useMusic(theme, phase === "playing");

  const [timeLeft, setTimeLeft] = useState(180);
  const [players, setPlayers] = useState<Record<TeamSide, Player>>({
    blue: emptyPlayer(),
    red: emptyPlayer(),
  });
  const [winnerMsg, setWinnerMsg] = useState("DRAW GAME!");

  const decks = useRef<Record<TeamSide, { en: string; id: string }[]>>({ blue: [], red: [] });
  const playersRef = useRef(players);
  const wordStartRef = useRef<Record<TeamSide, number>>({ blue: 0, red: 0 });
  const nextTimer = useRef<Record<TeamSide, ReturnType<typeof setTimeout> | null>>({
    blue: null,
    red: null,
  });

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const bank = useMemo(
    () =>
      vocab
        .map((v) => ({ en: v.en.toUpperCase().replace(/[^A-Z]/g, ""), id: v.id }))
        .filter((v) => v.en.length >= 3),
    [vocab],
  );

  const nextWord = useCallback(
    (side: TeamSide) => {
      wordStartRef.current = { ...wordStartRef.current, [side]: nowMs() };
      setPlayers((prev) => {
        if (decks.current[side].length === 0) decks.current[side] = shuffle(bank);
        const q = decks.current[side].shift();
        if (!q) return prev;
        return { ...prev, [side]: { ...prev[side], target: q.en, hint: q.id, guessed: [], wrong: 0 } };
      });
    },
    [bank],
  );

  const endGame = useCallback(
    (winner: TeamSide | "TIME" | "DRAW") => {
      const snap = playersRef.current;
      let final = winner;
      if (winner === "TIME") {
        if (snap.blue.score > snap.red.score) final = "blue";
        else if (snap.red.score > snap.blue.score) final = "red";
        else final = "DRAW";
      }
      setWinnerMsg(final === "DRAW" ? "DRAW GAME!" : final === "blue" ? "BLUE WINS!" : "RED WINS!");
      setPhase("result");
      play("finish");
    },
    [play],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          endGame("TIME");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, endGame]);

  const startGame = () => {
    if (bank.length < 2) return;
    decks.current.blue = shuffle(bank);
    decks.current.red = solo ? [] : shuffle(bank);
    setPlayers({ blue: emptyPlayer(), red: emptyPlayer() });
    setShowSave(false);
    setTimeLeft(duration);
    setPhase("playing");
    setTimeout(() => {
      nextWord("blue");
      if (!solo) nextWord("red");
    }, 0);
  };

  const guess = (side: TeamSide, letter: string) => {
    if (phase !== "playing") return;
    const p = players[side];
    if (!p.target || p.guessed.includes(letter) || p.wrong >= MAX_WRONG) return;

    const cfg = teamConfig(side);
    const correct = p.target.includes(letter);
    play(correct ? "type" : "wrong");
    const nextWrong = correct ? p.wrong : p.wrong + 1;

    setPlayers((prev) => {
      const cur = { ...prev[side] };
      cur.guessed = [...cur.guessed, letter];
      cur.wrong = nextWrong;
      return { ...prev, [side]: cur };
    });

    if (!correct) {
      juice.addFlash("rgba(244,63,94,0.22)");
      fireShake(0.7);
      if (nextWrong >= MAX_WRONG) {
        if (nextTimer.current[side]) clearTimeout(nextTimer.current[side]!);
        nextTimer.current[side] = setTimeout(() => nextWord(side), 900);
      }
      return;
    }

    const solved = p.target.split("").every((ch) => ch === letter || p.guessed.includes(ch));
    if (solved) {
      play("win");
      const bonus = speedBonus(wordStartRef.current[side], SPEED_BONUS_MAX, 20000);
      const gained = SCORE_WORD + bonus;
      juice.addBurst(cfg.hex, side);
      juice.addFloat(
        `+${gained}${bonus > 0 ? " ⚡" : ""}`,
        cfg.hex,
        side === "blue" ? "28%" : "72%",
        "34%",
      );
      juice.addFlash("rgba(167,139,250,0.22)");
      setPlayers((prev) => ({
        ...prev,
        [side]: { ...prev[side], score: prev[side].score + gained },
      }));
      if (nextTimer.current[side]) clearTimeout(nextTimer.current[side]!);
      nextTimer.current[side] = setTimeout(() => nextWord(side), 600);
    }
  };

  const winnerColor = winnerMsg.startsWith("BLUE")
    ? "#38bdf8"
    : winnerMsg.startsWith("RED")
      ? "#fb7185"
      : "#ffffff";

  const keys = useMemo(() => "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), []);

  return (
    <div id={GAME_ROOT_ID} className="relative flex h-screen flex-col overflow-hidden bg-ink">
      <GameHeader title="Hangman" subtitle="Papan Tebak Kata · Inggris" accent={ACCENT} icon="🪢">
        <TimerBadge value={formatClock(timeLeft)} warning={timeLeft <= 10 && phase === "playing"} accent={ACCENT} />
      </GameHeader>

      {!solo ? (
        <div className="z-20 flex h-20 items-center justify-between border-b-2 border-line bg-black/60 px-6">
          <div className="text-center">
            <div className="text-xs tracking-widest text-muted">BLUE</div>
            <div className="font-display text-3xl text-blue">{players.blue.score}</div>
          </div>
          <div className="font-display text-2xl text-muted">VS</div>
          <div className="text-center">
            <div className="text-xs tracking-widest text-muted">RED</div>
            <div className="font-display text-3xl text-red">{players.red.score}</div>
          </div>
        </div>
      ) : (
        <div className="z-20 flex h-20 items-center justify-between border-b-2 border-line bg-black/60 px-6">
          <span className="font-display text-2xl text-blue">🧑 LATIHAN MANDIRI</span>
          <div className="text-center">
            <div className="text-xs tracking-widest text-muted">SKOR</div>
            <div className="font-display text-3xl text-gold">{players.blue.score}</div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {((solo ? ["blue"] : ["blue", "red"]) as TeamSide[]).map((side) => {
          const cfg = teamConfig(side);
          const p = players[side];
          const done = p.target ? p.target.split("").every((ch) => p.guessed.includes(ch)) : false;
          const dying = p.wrong >= MAX_WRONG - 1;
          return (
            <div
              key={side}
              className={`relative flex flex-1 flex-col items-center gap-3 p-4 ${
                side === "blue"
                  ? "bg-[radial-gradient(circle_at_top,#1e3a8a_0%,#060a1a_100%)]"
                  : "bg-[radial-gradient(circle_at_top,#7f1d1d_0%,#180607_100%)]"
              }`}
            >
              <div
                className={`flex items-center gap-4 rounded-2xl border-2 px-4 py-2 transition-colors ${
                  dying ? "animate-heartbeat border-red bg-red/15" : "border-white/10 bg-black/40"
                }`}
              >
                <Gallows wrong={p.wrong} side={side} />
                <div className="text-left">
                  <p className="text-xs tracking-widest text-muted uppercase">Arti</p>
                  <p className={`font-display text-3xl ${cfg.text}`}>{p.hint || "…"}</p>
                  <p className="mt-2 flex gap-0.5 text-lg">
                    {Array.from({ length: MAX_WRONG }).map((_, i) => (
                      <span key={i} className={i < MAX_WRONG - p.wrong ? "" : "opacity-25 grayscale"}>
                        ❤️
                      </span>
                    ))}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {p.target
                  ? p.target.split("").map((ch, i) => (
                      <span
                        key={i}
                        className={`flex h-12 w-10 items-center justify-center rounded-lg border-b-4 font-display text-2xl uppercase transition-all ${
                          p.guessed.includes(ch)
                            ? done
                              ? "animate-pop border-green bg-green/25 text-green"
                              : "animate-pop border-amber-300 bg-amber-100 text-amber-900"
                            : "border-white/20 bg-white/10 text-white"
                        }`}
                      >
                        {p.guessed.includes(ch) ? ch : ""}
                      </span>
                    ))
                  : null}
              </div>

              <div className="flex max-w-lg flex-wrap justify-center gap-1.5">
                {keys.map((k) => {
                  const used = p.guessed.includes(k);
                  const hit = used && p.target.includes(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={used || p.wrong >= MAX_WRONG}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        guess(side, k);
                      }}
                      className={`flex h-11 w-10 items-center justify-center rounded-lg border-b-4 font-display text-lg transition-all ${
                        used
                          ? hit
                            ? "border-green-deep bg-green/30 text-green"
                            : "border-red-deep bg-red/20 text-red/60"
                          : side === "blue"
                            ? "cursor-pointer border-white/10 bg-white/10 text-white hover:-translate-y-0.5 hover:bg-blue hover:text-ink"
                            : "cursor-pointer border-white/10 bg-white/10 text-white hover:-translate-y-0.5 hover:bg-red hover:text-ink"
                      } disabled:cursor-not-allowed`}
                    >
                      {k}
                    </button>
                  );
                })}
              </div>

              <span className={`font-display text-sm tracking-widest ${cfg.text}`}>
                {solo ? "KAMU" : cfg.name}
              </span>

              {juice.burst && juice.burst.side === side ? (
                <Burst color={juice.burst.color} seed={juice.burst.id} />
              ) : null}
            </div>
          );
        })}
      </div>

      <GameFooter />

      <FloatLayer floats={juice.floats} sizeClass="text-6xl" />

      {juice.flash ? <ScreenFlash color={juice.flash.color} trigger={juice.flash.id} /> : null}

      {phase === "menu" ? (
        <Overlay>
          <div className="absolute inset-0 -z-10 tex-wood opacity-25" />
          <span className="mb-3 animate-swing text-6xl">🪢</span>
          <h1
            className="font-display text-6xl sm:text-7xl"
            style={{ color: ACCENT, textShadow: `0 0 50px ${ACCENT}, 0 4px 0 #000` }}
          >
            HANGMAN
          </h1>
          <p className="mt-2 mb-8 text-lg text-muted">
            {bank.length} kata siap — tebak hurufnya dari arti Indonesia
          </p>

          <div className="mb-6 text-center">
            <SectionLabel accent={ACCENT}>Tipe Permainan</SectionLabel>
            <div className="flex flex-wrap justify-center gap-3">
              <ChoiceButton label="👥 Duel 2 Tim" active={!solo} onClick={() => setSolo(false)} accent={ACCENT} />
              <ChoiceButton label="🧑 Latihan Mandiri" active={solo} onClick={() => setSolo(true)} accent={ACCENT} />
            </div>
          </div>

          <div className="mb-10 text-center">
            <SectionLabel accent={ACCENT}>Duration</SectionLabel>
            <div className="flex flex-wrap justify-center gap-3">
              {DURATIONS.map((d) => (
                <ChoiceButton key={d} label={`${d / 60} Min`} active={duration === d} onClick={() => setDuration(d)} accent={ACCENT} />
              ))}
            </div>
          </div>

          <SpeedHint />
          <StartButton
            label={bank.length < 2 ? "KATA KURANG" : "START GAME"}
            onClick={startGame}
            disabled={bank.length < 2}
            color={ACCENT}
            shadow="#5b21b6"
          />
        </Overlay>
      ) : null}

      {phase === "result" ? (
        <Overlay>
          {!solo && winnerMsg !== "DRAW GAME!" ? <Confetti count={100} /> : null}
          {solo ? (
            <>
              <span className="text-6xl">🧠</span>
              <h1 className="mb-4 mt-2 font-display text-6xl text-gold" style={{ textShadow: "0 0 40px #fbbf24, 3px 3px 0 #000" }}>
                LATIHAN SELESAI!
              </h1>
              <div className="mb-8 animate-glow rounded-3xl border-2 border-gold/40 bg-gold/10 px-16 py-6 text-center">
                <p className="text-sm tracking-widest text-muted uppercase">Skor Kamu</p>
                <p className="font-display text-8xl text-gold">{players.blue.score}</p>
              </div>
            </>
          ) : (
            <>
              <WinnerBanner title={winnerMsg} color={winnerColor} emoji={winnerMsg === "DRAW GAME!" ? "🤝" : "🏆"} />
              <div className="my-8">
                <ScoreBoard blue={players.blue.score} red={players.red.score} />
              </div>
            </>
          )}
          <div className="flex flex-wrap justify-center gap-4">
            <StartButton label="REMATCH" onClick={startGame} color={ACCENT} shadow="#5b21b6" />
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

      <SaveScoreDialog game="hangman" score={players.blue.score} open={showSave} onClose={() => setShowSave(false)} />
    </div>
  );
}
