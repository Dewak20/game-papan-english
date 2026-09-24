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
import type { TeamSide } from "@/lib/types";

type Phase = "menu" | "countdown" | "playing" | "result";

interface LetterChip {
  ch: string;
  id: number;
}

interface SideState {
  word: string;
  hint: string;
  chips: LetterChip[];
  idx: number;
  score: number;
  flash: "correct" | "wrong" | null;
}

const ACCENT = "#eab308";
const DURATIONS = [60, 180, 300];
const SCORE_WORD = 10;
const SCORE_WRONG = 5;
const SPEED_BONUS_MAX = 5;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initialSide(): SideState {
  return { word: "", hint: "", chips: [], idx: 0, score: 0, flash: null };
}

function scrambleWord(word: string): LetterChip[] {
  const letters = word.split("").map((ch, id) => ({ ch, id }));
  if (word.length <= 1) return letters;
  let out = shuffle(letters);
  let guard = 0;
  while (out.map((c) => c.ch).join("") === word && guard < 10) {
    out = shuffle(letters);
    guard++;
  }
  return out;
}

export default function AnagramClient() {
  const { play } = useSound();
  const { vocab } = usePlatformData();
  const juice = useJuice();
  const fireShake = useScreenShake();
  const theme = useMemo(() => musicTheme("anagram"), []);

  const [phase, setPhase] = useState<Phase>("menu");
  const [duration, setDuration] = useState(60);
  const [solo, setSolo] = useState(false);
  const [showSave, setShowSave] = useState(false);

  useMusic(theme, phase === "playing" || phase === "countdown");

  const [timeLeft, setTimeLeft] = useState(60);
  const [sides, setSides] = useState<Record<TeamSide, SideState>>({
    blue: initialSide(),
    red: initialSide(),
  });

  const nextTimer = useRef<Record<TeamSide, ReturnType<typeof setTimeout> | null>>({
    blue: null,
    red: null,
  });
  const wordStartRef = useRef<Record<TeamSide, number>>({ blue: 0, red: 0 });

  const bank = useMemo(
    () =>
      vocab
        .map((v) => ({ word: v.en.toUpperCase().replace(/[^A-Z]/g, ""), hint: v.id }))
        .filter((v) => v.word.length >= 3 && v.word.length <= 12),
    [vocab],
  );

  const nextWord = useCallback(
    (side: TeamSide) => {
      if (bank.length === 0) return;
      wordStartRef.current = { ...wordStartRef.current, [side]: nowMs() };
      const q = bank[Math.floor(Math.random() * bank.length)];
      setSides((prev) => ({
        ...prev,
        [side]: {
          ...prev[side],
          word: q.word,
          hint: q.hint,
          chips: scrambleWord(q.word),
          idx: 0,
          flash: null,
        },
      }));
    },
    [bank],
  );

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
    if (bank.length < 2) return;
    setSides({ blue: initialSide(), red: initialSide() });
    setShowSave(false);
    setTimeLeft(duration);
    setPhase("countdown");
    startCountdown();
    setTimeout(() => {
      nextWord("blue");
      if (!solo) nextWord("red");
    }, 0);
  };

  const check = (side: TeamSide, chip: LetterChip) => {
    if (phase !== "playing") return;
    const cfg = teamConfig(side);
    const cur = sides[side];
    const isWrong = cur.word.length > 0 && chip.ch !== cur.word[cur.idx];
    if (isWrong) fireShake(0.8);
    const bonus = speedBonus(wordStartRef.current[side], SPEED_BONUS_MAX, 8000);
    setSides((prev) => {
      const s = { ...prev[side] };
      const targetChar = s.word[s.idx];
      if (chip.ch === targetChar) {
        play("type");
        s.idx += 1;
        s.chips = s.chips.filter((c) => c.id !== chip.id);
        if (s.idx === s.word.length) {
          const gained = SCORE_WORD + bonus;
          s.score += gained;
          s.flash = "correct";
          play("win");
          juice.addBurst(cfg.hex, side);
          juice.addFloat(
            `+${gained}${bonus > 0 ? " ⚡" : ""}`,
            cfg.hex,
            side === "blue" ? "30%" : "70%",
            "34%",
          );
          juice.addFlash("rgba(234,179,8,0.2)");
          if (nextTimer.current[side]) clearTimeout(nextTimer.current[side]!);
          nextTimer.current[side] = setTimeout(() => nextWord(side), 550);
        }
      } else {
        play("wrong");
        s.flash = "wrong";
        s.idx = 0;
        s.score = Math.max(0, s.score - SCORE_WRONG);
        s.chips = scrambleWord(s.word);
        juice.addFlash("rgba(244,63,94,0.26)");
        if (nextTimer.current[side]) clearTimeout(nextTimer.current[side]!);
        nextTimer.current[side] = setTimeout(
          () => setSides((p) => ({ ...p, [side]: { ...p[side], flash: null } })),
          420,
        );
      }
      return { ...prev, [side]: s };
    });
  };

  const winner =
    sides.blue.score > sides.red.score
      ? { msg: "BLUE WINS!", color: "#38bdf8" }
      : sides.red.score > sides.blue.score
        ? { msg: "RED WINS!", color: "#fb7185" }
        : { msg: "DRAW!", color: "#ffffff" };

  return (
    <div id={GAME_ROOT_ID} className="relative flex h-screen flex-col overflow-hidden bg-ink">
      <GameHeader title="Anagram" subtitle="Meja Kayu · Susun Huruf Jadi Kata" accent={ACCENT} icon="🔀">
        <TimerBadge value={formatClock(timeLeft)} warning={timeLeft <= 10 && phase === "playing"} accent={ACCENT} />
      </GameHeader>

      {!solo ? (
        <div className="z-20 flex h-16 border-b-2 border-line bg-black/60">
          <div className="flex flex-1 items-center justify-start border-r border-white/10 bg-gradient-to-r from-sky-500 to-blue-700 pl-6 font-display text-2xl text-white">
            BLUE · {sides.blue.score}
          </div>
          <div className="flex flex-1 items-center justify-end bg-gradient-to-l from-rose-500 to-red-700 pr-6 font-display text-2xl text-white">
            {sides.red.score} · RED
          </div>
        </div>
      ) : (
        <div className="z-20 flex h-16 items-center justify-between border-b-2 border-line bg-black/60 px-6">
          <span className="font-display text-2xl text-blue">🧑 LATIHAN MANDIRI</span>
          <span className="font-display text-2xl text-gold">SKOR: {sides.blue.score}</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {((solo ? ["blue"] : ["blue", "red"]) as TeamSide[]).map((side) => {
          const cfg = teamConfig(side);
          const s = sides[side];
          return (
            <div
              key={side}
              className={`tex-wood vignette relative flex flex-1 flex-col items-center justify-center gap-6 p-6`}
            >
              <div
                className={`pointer-events-none absolute inset-0 ${
                  side === "blue"
                    ? "bg-gradient-to-b from-sky-900/40 to-transparent"
                    : "bg-gradient-to-b from-red-950/60 to-transparent"
                }`}
              />
              <div className="z-10 flex w-full items-center justify-between px-2">
                <span className={`font-display text-3xl ${cfg.text} stroke-text-sm`}>
                  {solo ? "🧑 KAMU" : cfg.name}
                </span>
                <span className={`font-display text-5xl ${cfg.text} stroke-text-sm`}>{s.score}</span>
              </div>

              <div className="z-10 w-[92%] text-center">
                <p className="text-xs tracking-widest text-amber-100/70 uppercase">Petunjuk</p>
                <p className="font-display text-4xl text-amber-50 stroke-text-sm">{s.hint || "…"}</p>
              </div>

              {/* Slot jawaban */}
              <div
                className={`z-10 flex min-h-[72px] flex-wrap items-center justify-center gap-2 rounded-2xl border-4 border-dashed px-4 py-3 transition-all ${
                  s.flash === "correct"
                    ? "border-green bg-green/25"
                    : s.flash === "wrong"
                      ? "animate-shake border-red bg-red/25"
                      : "border-amber-200/50 bg-black/30"
                }`}
              >
                {s.word
                  ? s.word.split("").map((ch, i) => (
                      <span
                        key={i}
                        className={`flex h-12 w-11 items-center justify-center rounded-lg text-2xl uppercase transition-all ${
                          i < s.idx
                            ? "tile animate-pop"
                            : "border-b-4 border-white/20 bg-black/30 text-transparent"
                        }`}
                      >
                        {i < s.idx ? ch : "_"}
                      </span>
                    ))
                  : null}
              </div>

              {/* Huruf acak — ubin kayu */}
              <div className="z-10 flex max-w-lg flex-wrap justify-center gap-3">
                {s.chips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => check(side, chip)}
                    className="tile focus-ring h-16 w-14 cursor-pointer rounded-xl text-3xl uppercase transition-transform hover:-translate-y-1 active:translate-y-0"
                  >
                    {chip.ch}
                  </button>
                ))}
              </div>

              {juice.burst && juice.burst.side === side ? (
                <Burst color={juice.burst.color} seed={juice.burst.id} />
              ) : null}
            </div>
          );
        })}

        {juice.floats.map((f) => (
          <div
            key={f.id}
            className="pointer-events-none absolute z-[130] animate-rise font-display text-6xl font-bold"
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

      {phase === "menu" ? (
        <Overlay>
          <div className="absolute inset-0 -z-10 tex-wood opacity-30" />
          <span className="mb-3 animate-wiggle text-6xl">🔀</span>
          <h1 className="font-display text-6xl text-amber-300 sm:text-7xl" style={{ textShadow: "0 0 44px #eab308, 0 4px 0 #000" }}>
            ANAGRAM
          </h1>
          <p className="mt-2 mb-8 text-lg text-muted">
            {bank.length} kata — susun huruf acak sesuai petunjuk artinya
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
            shadow="#a16207"
          />
        </Overlay>
      ) : null}

      {phase === "result" ? (
        <Overlay>
          {!solo && winner.msg !== "DRAW!" ? <Confetti count={100} /> : null}
          {solo ? (
            <>
              <span className="text-6xl">🪵</span>
              <h1 className="mb-4 mt-2 font-display text-6xl text-gold" style={{ textShadow: "0 0 40px #fbbf24, 3px 3px 0 #000" }}>
                LATIHAN SELESAI!
              </h1>
              <div className="mb-8 animate-glow rounded-3xl border-2 border-gold/40 bg-gold/10 px-16 py-6 text-center">
                <p className="text-sm tracking-widest text-muted uppercase">Skor Kamu</p>
                <p className="font-display text-8xl text-gold">{sides.blue.score}</p>
              </div>
            </>
          ) : (
            <>
              <WinnerBanner title={winner.msg} color={winner.color} emoji={winner.msg === "DRAW!" ? "🤝" : "🏆"} />
              <div className="my-8">
                <ScoreBoard blue={sides.blue.score} red={sides.red.score} />
              </div>
            </>
          )}
          <div className="flex flex-wrap justify-center gap-4">
            <StartButton label="PLAY AGAIN" onClick={startGame} color={ACCENT} shadow="#a16207" />
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

      <SaveScoreDialog game="anagram" score={sides.blue.score} open={showSave} onClose={() => setShowSave(false)} />
    </div>
  );
}
