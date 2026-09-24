"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
import { imageUrlFor } from "@/lib/words";
import type { AnimalQuestion, TeamSide } from "@/lib/types";

type Phase = "menu" | "playing" | "result";

interface Player {
  input: string;
  target: string;
  image: string;
  idx: number;
  score: number;
}

const ACCENT = "#fbbf24";
const DURATIONS = [60, 180, 300];
const TUG_STEP = 5;
const HINT_COOLDOWN = 5000;
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

const emptyPlayer = (): Player => ({ input: "", target: "", image: "", idx: 0, score: 0 });

export default function SpellingBattleClient() {
  const { play } = useSound();
  const { animals } = usePlatformData();
  const juice = useJuice();
  const fireShake = useScreenShake();
  const theme = useMemo(() => musicTheme("spelling-battle"), []);

  const [phase, setPhase] = useState<Phase>("menu");
  const [duration, setDuration] = useState(180);
  const [solo, setSolo] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);

  useMusic(theme, phase === "playing");
  const [tug, setTug] = useState(50);
  const [players, setPlayers] = useState<Record<TeamSide, Player>>({
    blue: emptyPlayer(),
    red: emptyPlayer(),
  });
  const [hintDisabled, setHintDisabled] = useState<Record<TeamSide, boolean>>({
    blue: false,
    red: false,
  });
  const [winnerMsg, setWinnerMsg] = useState("DRAW GAME!");

  const decks = useRef<Record<TeamSide, AnimalQuestion[]>>({ blue: [], red: [] });
  const playersRef = useRef(players);
  const wordStartRef = useRef<Record<TeamSide, number>>({ blue: 0, red: 0 });
  const hintTimers = useRef<Record<TeamSide, ReturnType<typeof setTimeout> | null>>({
    blue: null,
    red: null,
  });

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const bank = useMemo<AnimalQuestion[]>(
    () => animals.filter(Boolean).map((word) => ({ word, image: imageUrlFor(word) })),
    [animals],
  );

  const loadLevel = useCallback((side: TeamSide) => {
    wordStartRef.current = { ...wordStartRef.current, [side]: nowMs() };
    setPlayers((prev) => {
      const p = { ...prev[side] };
      const deck = decks.current[side];
      if (deck.length === 0) return prev;
      if (p.idx >= deck.length) {
        decks.current[side] = shuffle(deck);
        p.idx = 0;
      }
      const q = decks.current[side][p.idx];
      p.target = q.word.toUpperCase().trim();
      p.image = q.image;
      p.input = "";
      return { ...prev, [side]: p };
    });
    setHintDisabled((prev) => ({ ...prev, [side]: false }));
  }, []);

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
    setTug(50);
    setShowSave(false);
    setTimeLeft(duration);
    setPhase("playing");
    setTimeout(() => {
      loadLevel("blue");
      if (!solo) loadLevel("red");
    }, 0);
  };

  const advance = useCallback(
    (side: TeamSide) => {
      play("win");
      const cfg = teamConfig(side);
      const bonus = speedBonus(wordStartRef.current[side], SPEED_BONUS_MAX, 6000);
      const gained = SCORE_WORD + bonus;
      juice.addBurst(cfg.hex, side);
      juice.addFloat(
        `+${gained}${bonus > 0 ? " ⚡" : ""}`,
        cfg.hex,
        side === "blue" ? "28%" : "72%",
        "34%",
      );
      setPlayers((prev) => {
        const p = { ...prev[side] };
        p.score += gained;
        p.idx += 1;
        return { ...prev, [side]: p };
      });

      if (solo) {
        setTimeout(() => loadLevel(side), 350);
        return;
      }

      const nextTug = Math.min(100, Math.max(0, tug + (side === "blue" ? -TUG_STEP : TUG_STEP)));
      setTug(nextTug);
      if (nextTug <= 0) return endGame("blue");
      if (nextTug >= 100) return endGame("red");
      setTimeout(() => loadLevel(side), 350);
    },
    [tug, play, loadLevel, endGame, solo, juice],
  );

  const handleInput = (side: TeamSide, char: string) => {
    if (phase !== "playing") return;
    const p = players[side];
    if (p.input.length >= p.target.length) return;
    const nextInput = p.input + char;
    const isPrefix = p.target.startsWith(nextInput);
    if (!isPrefix) {
      play("wrong");
      juice.addFlash("rgba(244,63,94,0.22)");
      fireShake(0.6);
    } else {
      play("type");
    }
    setPlayers((prev) => ({ ...prev, [side]: { ...prev[side], input: nextInput } }));
    if (nextInput === p.target) advance(side);
  };

  const handleDelete = (side: TeamSide) => {
    if (phase !== "playing") return;
    const p = players[side];
    if (p.input.length === 0) return;
    play("type");
    setPlayers((prev) => ({
      ...prev,
      [side]: { ...prev[side], input: prev[side].input.slice(0, -1) },
    }));
  };

  const applyHint = (side: TeamSide) => {
    if (phase !== "playing" || hintDisabled[side]) return;
    const { target, input } = players[side];
    let fixIndex = -1;
    if (input.length < target.length) {
      fixIndex = input.length;
      for (let i = 0; i < input.length; i++) {
        if (input[i] !== target[i]) {
          fixIndex = i;
          break;
        }
      }
    } else {
      for (let i = 0; i < target.length; i++) {
        if (input[i] !== target[i]) {
          fixIndex = i;
          break;
        }
      }
    }
    if (fixIndex === -1) return;
    play("hint");
    const nextInput = target.substring(0, fixIndex + 1);
    setPlayers((prev) => ({ ...prev, [side]: { ...prev[side], input: nextInput } }));
    setHintDisabled((prev) => ({ ...prev, [side]: true }));
    if (hintTimers.current[side]) clearTimeout(hintTimers.current[side]!);
    hintTimers.current[side] = setTimeout(
      () => setHintDisabled((prev) => ({ ...prev, [side]: false })),
      HINT_COOLDOWN,
    );
    if (nextInput === target) advance(side);
  };

  const keys = useMemo(() => "QWERTYUIOPASDFGHJKLZXCVBNM".split(""), []);
  const winnerColor = winnerMsg.startsWith("BLUE")
    ? "#38bdf8"
    : winnerMsg.startsWith("RED")
      ? "#fb7185"
      : "#ffffff";

  return (
    <div id={GAME_ROOT_ID} className="relative flex h-screen flex-col overflow-hidden bg-ink">
      <GameHeader title="Spelling Battle" subtitle="Safari · Tebak Kata dari Gambar" accent={ACCENT} icon="🦁">
        <TimerBadge value={formatClock(timeLeft)} warning={timeLeft <= 10 && phase === "playing"} accent={ACCENT} />
      </GameHeader>

      {/* HUD skor + tarik tambang */}
      {!solo ? (
        <div className="z-20 flex h-24 items-center justify-between gap-4 border-b-2 border-line bg-black/60 px-4 sm:px-8">
          <div className="text-center">
            <div className="text-xs tracking-widest text-muted">BLUE</div>
            <div className="font-display text-4xl text-blue sm:text-5xl">{players.blue.score}</div>
          </div>

          <div className="relative h-6 flex-1 overflow-hidden rounded-full border-2 border-amber-700/60 bg-ink-soft">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-deep to-blue transition-[width] duration-500"
              style={{ width: `${tug}%` }}
            />
            <div
              className="absolute inset-y-0 right-0 bg-gradient-to-l from-red-deep to-red transition-[width] duration-500"
              style={{ width: `${100 - tug}%` }}
            />
            <div
              className="absolute top-[-6px] bottom-[-6px] w-2.5 -translate-x-1/2 bg-white shadow-[0_0_18px_#fff] transition-[left] duration-500"
              style={{ left: `${tug}%` }}
            />
          </div>

          <div className="text-center">
            <div className="text-xs tracking-widest text-muted">RED</div>
            <div className="font-display text-4xl text-red sm:text-5xl">{players.red.score}</div>
          </div>
        </div>
      ) : (
        <div className="z-20 flex h-24 items-center justify-between border-b-2 border-line bg-black/60 px-6 sm:px-10">
          <span className="font-display text-2xl text-blue sm:text-3xl">🧑 LATIHAN MANDIRI</span>
          <div className="text-center">
            <div className="text-xs tracking-widest text-muted">SKOR</div>
            <div className="font-display text-4xl text-gold sm:text-5xl">{players.blue.score}</div>
          </div>
        </div>
      )}

      {/* Arena */}
      <div className="flex flex-1 overflow-hidden">
        {((solo ? ["blue"] : ["blue", "red"]) as TeamSide[]).map((side) => {
          const cfg = teamConfig(side);
          const p = players[side];
          const correctSoFar = p.input === p.target.slice(0, p.input.length);
          return (
            <div
              key={side}
              className={`tex-savanna relative flex flex-1 flex-col items-center gap-4 p-4 ${
                side === "blue" ? "" : "brightness-[0.92]"
              }`}
            >
              {/* label tim */}
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-1.5 ${
                  side === "blue" ? "bg-blue/70" : "bg-red/70"
                }`}
              />
              {/* siluet rumput & matahari */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="pointer-events-none absolute right-4 bottom-2 text-4xl opacity-30">
                {side === "blue" ? "🌴" : "🦒"}
              </div>

              <div className="relative h-44 w-full max-w-md overflow-hidden rounded-2xl border-4 border-amber-900/70 bg-black shadow-[0_16px_40px_rgba(0,0,0,0.7)]">
                {p.image ? (
                  <Image
                    src={p.image}
                    alt="Tebak gambar"
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 90vw, 40vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted">
                    Menyiapkan gambar…
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <button
                  type="button"
                  onClick={() => applyHint(side)}
                  disabled={hintDisabled[side]}
                  className="focus-ring absolute right-3 bottom-3 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-gold text-2xl text-ink shadow-[0_4px_0_#b45309] disabled:cursor-wait disabled:opacity-50"
                  aria-label="Petunjuk"
                >
                  💡
                </button>
              </div>

              {/* slot huruf gaya ubin */}
              <div className="z-10 flex min-h-[56px] flex-wrap justify-center gap-1.5">
                {Array.from({ length: p.target.length }).map((_, i) => {
                  const filled = i < p.input.length;
                  const wrong = filled && !correctSoFar;
                  return (
                    <div
                      key={i}
                      className={`flex h-12 w-11 items-center justify-center rounded-lg font-display text-2xl uppercase transition-all ${
                        filled
                          ? wrong
                            ? "animate-shake bg-red text-white shadow-lg"
                            : "tile -translate-y-0.5"
                          : "border-b-4 border-white/25 bg-black/40 text-white"
                      }`}
                    >
                      {p.input[i] ?? ""}
                    </div>
                  );
                })}
              </div>

              <div className="z-10 flex max-w-lg flex-wrap justify-center gap-1.5">
                {keys.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleInput(side, k);
                    }}
                    className={`flex h-11 w-10 cursor-pointer items-center justify-center rounded-lg border-b-4 border-white/10 bg-black/50 font-display text-lg text-white backdrop-blur transition-colors ${
                      side === "blue" ? "hover:bg-blue hover:text-ink" : "hover:bg-red hover:text-ink"
                    }`}
                  >
                    {k}
                  </button>
                ))}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleDelete(side);
                  }}
                  className="flex h-11 w-16 cursor-pointer items-center justify-center rounded-lg border-b-4 border-red-900 bg-red-600 text-lg text-white"
                >
                  ⌫
                </button>
              </div>

              <span className={`z-10 font-display text-sm tracking-widest ${cfg.text}`}>
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
          <div className="absolute inset-0 -z-10 tex-savanna opacity-50" />
          <span className="mb-3 animate-bob text-6xl">🦁</span>
          <h1
            className="font-display text-6xl sm:text-7xl"
            style={{ color: ACCENT, textShadow: `0 0 50px ${ACCENT}, 0 4px 0 #000` }}
          >
            SPELLING BATTLE
          </h1>
          <p className="mt-2 mb-8 text-lg text-muted">{bank.length} gambar hewan siap ditebak!</p>

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
            label={bank.length < 2 ? "MEMUAT…" : "START BATTLE"}
            onClick={startGame}
            disabled={bank.length < 2}
            color={ACCENT}
            shadow="#b45309"
          />
        </Overlay>
      ) : null}

      {phase === "result" ? (
        <Overlay>
          {!solo && winnerMsg !== "DRAW GAME!" ? <Confetti count={110} /> : null}
          {solo ? (
            <>
              <span className="text-6xl">🐾</span>
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
            <StartButton label="REMATCH" onClick={startGame} color={ACCENT} shadow="#b45309" />
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

      <SaveScoreDialog game="spelling-battle" score={players.blue.score} open={showSave} onClose={() => setShowSave(false)} />
    </div>
  );
}
