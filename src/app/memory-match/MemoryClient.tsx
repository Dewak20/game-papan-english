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

interface MemCard {
  /** id pasangan — dua kartu dengan pairId sama = sepasang. */
  pairId: number;
  /** teks yang tampil saat kartu terbuka. */
  text: string;
  /** "en" (Inggris) atau "id" (Indonesia) — hanya untuk warna label. */
  kind: "en" | "id";
}

interface SideState {
  cards: MemCard[];
  flipped: number[];
  matched: number[];
  score: number;
  /** true saat kartu salah sedang "ditunggu" — klik diblokir. */
  locked: boolean;
  cleared: boolean;
}

const ACCENT = "#fbbf24";
const DURATIONS = [60, 180, 300];
const PAIRS = 6; // 6 pasang = 12 kartu (grid 3×4)
const SCORE_MATCH = 10;
const SCORE_WRONG = 2;
const SPEED_BONUS_MAX = 5;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildBoard(vocab: { en: string; id: string }[]): MemCard[] {
  const picks = shuffle(vocab).slice(0, PAIRS);
  const cards: MemCard[] = [];
  picks.forEach((p, i) => {
    cards.push({ pairId: i, text: p.en.toUpperCase(), kind: "en" });
    cards.push({ pairId: i, text: p.id, kind: "id" });
  });
  return shuffle(cards);
}

function initialSide(vocab: { en: string; id: string }[]): SideState {
  return {
    cards: buildBoard(vocab),
    flipped: [],
    matched: [],
    score: 0,
    locked: false,
    cleared: false,
  };
}

export default function MemoryClient() {
  const { play } = useSound();
  const { vocab } = usePlatformData();
  const juice = useJuice();
  const fireShake = useScreenShake();
  const theme = useMemo(() => musicTheme("memory-match"), []);

  const [phase, setPhase] = useState<Phase>("menu");
  const [duration, setDuration] = useState(180);
  const [solo, setSolo] = useState(false);
  const [showSave, setShowSave] = useState(false);

  useMusic(theme, phase === "playing" || phase === "countdown");

  const [timeLeft, setTimeLeft] = useState(180);
  const [sides, setSides] = useState<Record<TeamSide, SideState>>({
    blue: initialSide([]),
    red: initialSide([]),
  });
  const [winnerMsg, setWinnerMsg] = useState("DRAW GAME!");

  const sidesRef = useRef(sides);
  const flipTimers = useRef<Record<TeamSide, ReturnType<typeof setTimeout> | null>>({
    blue: null,
    red: null,
  });
  const matchStartRef = useRef<Record<TeamSide, number>>({ blue: 0, red: 0 });

  useEffect(() => {
    sidesRef.current = sides;
  }, [sides]);

  const bank = useMemo(() => vocab.filter((v) => v.en && v.id), [vocab]);

  const endGame = useCallback(
    (winner: TeamSide | "TIME" | "DRAW") => {
      const snap = sidesRef.current;
      let final = winner;
      if (winner === "TIME") {
        if (snap.blue.score > snap.red.score) final = "blue";
        else if (snap.red.score > snap.blue.score) final = "red";
        else final = "DRAW";
      }
      setWinnerMsg(
        final === "DRAW" ? "DRAW GAME!" : final === "blue" ? "BLUE WINS!" : "RED WINS!",
      );
      setPhase("result");
      play("finish");
    },
    [play],
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
          endGame("TIME");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, endGame]);

  const startGame = () => {
    if (bank.length < PAIRS) return;
    const fresh: Record<TeamSide, SideState> = {
      blue: initialSide(bank),
      red: solo ? initialSide([]) : initialSide(bank),
    };
    sidesRef.current = fresh;
    setSides(fresh);
    const now = nowMs();
    matchStartRef.current = { blue: now, red: now };
    setShowSave(false);
    setTimeLeft(duration);
    setPhase("countdown");
    startCountdown();
  };

  const flip = (side: TeamSide, index: number) => {
    if (phase !== "playing") return;
    const s = sidesRef.current[side];
    if (s.locked || s.cleared) return;
    if (s.flipped.includes(index) || s.matched.includes(s.cards[index].pairId)) return;

    play("type");
    const nextFlipped = [...s.flipped, index];

    if (nextFlipped.length < 2) {
      const next: SideState = { ...s, flipped: nextFlipped };
      sidesRef.current = { ...sidesRef.current, [side]: next };
      setSides((prev) => ({ ...prev, [side]: next }));
      return;
    }

    // Dua kartu terbuka → cek pasangan
    const [a, b] = nextFlipped;
    const cardA = s.cards[a];
    const cardB = s.cards[b];
    const isMatch = cardA.pairId === cardB.pairId;
    const cfg = teamConfig(side);

    if (isMatch) {
      play("correct");
      const bonus = speedBonus(matchStartRef.current[side], SPEED_BONUS_MAX, 5000);
      const gained = SCORE_MATCH + bonus;
      const matched = [...s.matched, cardA.pairId];
      const cleared = matched.length === PAIRS;
      const next: SideState = {
        ...s,
        flipped: [],
        matched,
        score: s.score + gained,
        cleared,
      };
      sidesRef.current = { ...sidesRef.current, [side]: next };
      setSides((prev) => ({ ...prev, [side]: next }));
      matchStartRef.current = { ...matchStartRef.current, [side]: nowMs() };

      juice.addBurst(cfg.hex, side);
      juice.addFloat(
        `+${gained}${bonus > 0 ? " ⚡" : ""}`,
        cfg.hex,
        side === "blue" ? "30%" : "70%",
        "40%",
      );
      juice.addFlash("rgba(251,191,36,0.18)");

      if (cleared) {
        if (flipTimers.current[side]) clearTimeout(flipTimers.current[side]!);
        flipTimers.current[side] = setTimeout(() => endGame(side), 700);
      }
    } else {
      play("wrong");
      fireShake(0.7);
      const next: SideState = { ...s, flipped: nextFlipped, locked: true };
      sidesRef.current = { ...sidesRef.current, [side]: next };
      setSides((prev) => ({ ...prev, [side]: next }));
      juice.addFlash("rgba(244,63,94,0.22)");
      juice.addFloat(`-${SCORE_WRONG}`, "#fb7185", side === "blue" ? "30%" : "70%", "40%");

      if (flipTimers.current[side]) clearTimeout(flipTimers.current[side]!);
      flipTimers.current[side] = setTimeout(() => {
        const cur = sidesRef.current[side];
        const settled: SideState = {
          ...cur,
          flipped: [],
          locked: false,
          score: Math.max(0, cur.score - SCORE_WRONG),
        };
        sidesRef.current = { ...sidesRef.current, [side]: settled };
        setSides((prev) => ({ ...prev, [side]: settled }));
      }, 900);
    }
  };

  const winnerColor = winnerMsg.startsWith("BLUE")
    ? "#38bdf8"
    : winnerMsg.startsWith("RED")
      ? "#fb7185"
      : "#ffffff";

  return (
    <div id={GAME_ROOT_ID} className="tex-felt relative flex h-screen flex-col overflow-hidden bg-ink">
      <GameHeader
        title="Memory Match"
        subtitle="Meja Kartu · Jodohkan Kata & Artinya"
        accent={ACCENT}
        icon="🃏"
      >
        <TimerBadge
          value={formatClock(timeLeft)}
          warning={timeLeft <= 10 && phase === "playing"}
          accent={ACCENT}
        />
      </GameHeader>

      {/* HUD gaya chip kasino */}
      {!solo ? (
        <div className="z-20 flex h-16 items-center justify-between gap-4 border-b-2 border-line bg-black/60 px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-white/40 bg-gradient-to-br from-sky-400 to-blue-700 font-display text-lg text-white shadow-[0_4px_0_#172554]">
              {sides.blue.matched.length}
            </span>
            <span className="font-display text-3xl text-blue">{sides.blue.score}</span>
          </div>
          <span className="font-display text-lg tracking-[0.3em] text-gold/70">
            🂡 MEJA KARTU 🂱
          </span>
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl text-red">{sides.red.score}</span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-white/40 bg-gradient-to-br from-rose-400 to-red-700 font-display text-lg text-white shadow-[0_4px_0_#450a0a]">
              {sides.red.matched.length}
            </span>
          </div>
        </div>
      ) : (
        <div className="z-20 flex h-16 items-center justify-between border-b-2 border-line bg-black/60 px-6">
          <span className="font-display text-2xl text-blue">🧑 LATIHAN MANDIRI</span>
          <span className="font-display text-2xl text-gold">
            SKOR: {sides.blue.score} · {sides.blue.matched.length}/{PAIRS} pasang
          </span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {((solo ? ["blue"] : ["blue", "red"]) as TeamSide[]).map((side) => {
          const cfg = teamConfig(side);
          const s = sides[side];
          return (
            <div
              key={side}
              className={`tex-felt vignette relative flex flex-1 flex-col items-center justify-center p-4`}
            >
              <div
                className={`pointer-events-none absolute inset-0 ${
                  side === "blue"
                    ? "bg-gradient-to-b from-sky-900/35 to-transparent"
                    : "bg-gradient-to-b from-red-950/55 to-transparent"
                }`}
              />
              {/* bingkai meja */}
              <div className="pointer-events-none absolute inset-3 rounded-[2rem] border-8 border-amber-900/40 shadow-[inset_0_0_60px_rgba(0,0,0,0.6)]" />
              <div className="pointer-events-none absolute top-5 left-6 text-3xl opacity-25">
                🎲
              </div>
              <div className="pointer-events-none absolute right-6 bottom-5 text-3xl opacity-25">
                🪙
              </div>

              <span className={`z-10 mb-3 font-display text-2xl ${cfg.text} stroke-text-sm`}>
                {solo ? "🧑 KAMU" : cfg.name}
              </span>

              <div className="z-10 grid w-full max-w-2xl grid-cols-4 gap-2 sm:gap-3">
                {s.cards.map((card, i) => {
                  const isMatched = s.matched.includes(card.pairId);
                  const isOpen = isMatched || s.flipped.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => flip(side, i)}
                      disabled={isMatched}
                      className={`relative aspect-[4/3] cursor-pointer [perspective:900px] ${
                        isMatched ? "pointer-events-none" : ""
                      }`}
                    >
                      <div
                        className={`relative h-full w-full rounded-xl transition-transform duration-500 [transform-style:preserve-3d] ${
                          isOpen ? "[transform:rotateY(180deg)]" : ""
                        } ${isMatched ? "opacity-80" : ""}`}
                      >
                        {/* punggung kartu */}
                        <div className="card-back absolute inset-0 flex items-center justify-center rounded-xl text-2xl text-white/70 [backface-visibility:hidden]">
                          🂠
                        </div>
                        {/* muka kartu */}
                        <div
                          className={`absolute inset-0 flex items-center justify-center rounded-xl border-2 p-1 text-center font-display [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                            card.kind === "en"
                              ? "border-gold bg-gradient-to-br from-amber-50 to-amber-200 text-amber-900"
                              : "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-200 text-emerald-900"
                          } ${isMatched ? "animate-pop ring-4 ring-gold/60" : ""}`}
                        >
                          <span
                            className={`text-xs leading-tight font-bold sm:text-sm ${
                              card.kind === "en" ? "uppercase" : ""
                            }`}
                          >
                            {card.text}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* progres pasangan */}
              <div className="z-10 mt-4 flex gap-1.5">
                {Array.from({ length: PAIRS }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 w-6 rounded-full transition-colors ${
                      i < s.matched.length ? "bg-gold shadow-[0_0_12px_#fbbf24]" : "bg-white/20"
                    }`}
                  />
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
          <div className="absolute inset-0 -z-10 tex-felt opacity-40" />
          <span className="mb-3 animate-bob text-6xl">🃏</span>
          <h1
            className="font-display text-6xl sm:text-7xl"
            style={{ color: ACCENT, textShadow: `0 0 50px ${ACCENT}, 0 4px 0 #000` }}
          >
            MEMORY MATCH
          </h1>
          <p className="mt-2 mb-8 text-lg text-muted">
            Balik kartu & jodohkan kata Inggris dengan artinya
          </p>

          <div className="mb-6 text-center">
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

          <div className="mb-10 text-center">
            <SectionLabel accent={ACCENT}>Duration</SectionLabel>
            <div className="flex flex-wrap justify-center gap-3">
              {DURATIONS.map((d) => (
                <ChoiceButton
                  key={d}
                  label={`${d / 60} Min`}
                  active={duration === d}
                  onClick={() => setDuration(d)}
                  accent={ACCENT}
                />
              ))}
            </div>
          </div>

          <SpeedHint />
          <StartButton
            label={bank.length < PAIRS ? "KATA KURANG" : "START GAME"}
            onClick={startGame}
            disabled={bank.length < PAIRS}
            color={ACCENT}
            shadow="#b45309"
          />
        </Overlay>
      ) : null}

      {phase === "result" ? (
        <Overlay>
          {!solo && winnerMsg !== "DRAW GAME!" ? <Confetti count={100} /> : null}
          {solo ? (
            <>
              <span className="text-6xl">{sides.blue.cleared ? "🎉" : "⏰"}</span>
              <h1
                className="mt-2 mb-4 font-display text-6xl text-gold"
                style={{ textShadow: "0 0 40px #fbbf24, 3px 3px 0 #000" }}
              >
                {sides.blue.cleared ? "SEMUA PASANGAN DITEMUKAN!" : "WAKTU HABIS!"}
              </h1>
              <div className="mb-8 animate-glow rounded-3xl border-2 border-gold/40 bg-gold/10 px-16 py-6 text-center">
                <p className="text-sm tracking-widest text-muted uppercase">Skor Kamu</p>
                <p className="font-display text-8xl text-gold">{sides.blue.score}</p>
                <p className="mt-1 text-sm text-muted">
                  {sides.blue.matched.length}/{PAIRS} pasangan
                </p>
              </div>
            </>
          ) : (
            <>
              <WinnerBanner
                title={winnerMsg}
                color={winnerColor}
                emoji={winnerMsg === "DRAW GAME!" ? "🤝" : "🏆"}
              />
              <div className="my-8">
                <ScoreBoard blue={sides.blue.score} red={sides.red.score} />
              </div>
            </>
          )}
          <div className="flex flex-wrap justify-center gap-4">
            <StartButton label="PLAY AGAIN" onClick={startGame} color={ACCENT} shadow="#b45309" />
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
        game="memory-match"
        score={sides.blue.score}
        open={showSave}
        onClose={() => setShowSave(false)}
      />
    </div>
  );
}
