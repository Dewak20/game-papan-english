"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { GameHeader, TimerBadge, formatClock } from "@/components/GameChrome";
import { Overlay, ChoiceButton, StartButton, teamConfig, SpeedHint } from "@/components/ui";
import { Confetti, Burst, ScreenFlash, Countdown, WinnerBanner, ScoreBoard } from "@/components/juice";
import { useJuice } from "@/lib/useJuice";
import { useSound } from "@/lib/useSound";
import { useMusic } from "@/lib/useMusic";
import { musicTheme } from "@/lib/musicThemes";
import { useScreenShake, GAME_ROOT_ID } from "@/lib/useScreenShake";
import { useCountdown } from "@/lib/useCountdown";
import { usePlatformData, updatePlatformData } from "@/lib/store";
import { SaveScoreDialog } from "@/components/SaveScoreDialog";
import { sentencesByDifficulty, type Difficulty } from "@/lib/sentences";
import type { TeamSide } from "@/lib/types";

type Phase = "menu" | "countdown" | "playing" | "result";

interface WordChip {
  word: string;
  id: number;
}

interface SideState {
  score: number;
  words: string[];
  idx: number;
  scrambled: WordChip[];
  flash: "correct" | "wrong" | null;
}

const ACCENT = "#fb7185";

const DIFFS: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Easy (3-4)" },
  { id: "medium", label: "Medium (5-7)" },
  { id: "hard", label: "Hard (8+)" },
];

const TIMES = [60, 180, 300];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initialSide(): SideState {
  return { score: 0, words: [], idx: 0, scrambled: [], flash: null };
}

export default function SentenceBattleClient() {
  const { play } = useSound();
  const { sentences: storeSentences } = usePlatformData();
  const juice = useJuice();

  const [phase, setPhase] = useState<Phase>("menu");
  const [diff, setDiff] = useState<Difficulty>("medium");
  const [duration, setDuration] = useState(60);
  const [solo, setSolo] = useState(false);
  const [showSave, setShowSave] = useState(false);

  const [showEditor, setShowEditor] = useState(false);
  const [draft, setDraft] = useState("");

  const [timeLeft, setTimeLeft] = useState(60);
  const [sides, setSides] = useState<Record<TeamSide, SideState>>({
    blue: initialSide(),
    red: initialSide(),
  });
  const [arenaShake, setArenaShake] = useState(false);
  const [pullSide, setPullSide] = useState<TeamSide | null>(null);
  const fireShake = useScreenShake();
  const theme = useMemo(() => musicTheme("sentence-battle"), []);
  useMusic(theme, phase === "playing" || phase === "countdown");

  const activeSentences = useRef<string[]>([]);
  const flashTimers = useRef<Record<TeamSide, ReturnType<typeof setTimeout> | null>>({
    blue: null,
    red: null,
  });

  const rebuildBank = useCallback(() => {
    activeSentences.current = sentencesByDifficulty(storeSentences, diff);
  }, [storeSentences, diff]);

  useEffect(() => {
    rebuildBank();
  }, [rebuildBank]);

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

  const nextSentence = useCallback((side: TeamSide) => {
    const bank = activeSentences.current;
    const raw = bank[Math.floor(Math.random() * bank.length)];
    const words = raw.split(" ");
    const chips = shuffle(words.map((word, id) => ({ word, id })));
    setSides((prev) => ({
      ...prev,
      [side]: { ...prev[side], words, idx: 0, scrambled: chips, flash: null },
    }));
  }, []);

  const startGame = () => {
    rebuildBank();
    setSides({ blue: initialSide(), red: initialSide() });
    setShowSave(false);
    setTimeLeft(duration);
    setPhase("countdown");
    startCountdown();
    setTimeout(() => {
      nextSentence("blue");
      if (!solo) nextSentence("red");
    }, 0);
  };

  const check = (side: TeamSide, chip: WordChip) => {
    if (phase !== "playing") return;
    setSides((prev) => {
      const s = { ...prev[side] };
      const targetWord = s.words[s.idx];
      if (chip.word === targetWord) {
        play("type");
        s.idx += 1;
        s.scrambled = s.scrambled.filter((c) => c.id !== chip.id);
        if (s.idx === s.words.length) {
          s.score += 1;
          s.flash = "correct";
          setArenaShake(true);
          setPullSide(side);
          setTimeout(() => setArenaShake(false), 500);
          setTimeout(() => setPullSide(null), 700);
          play("win");
          juice.addBurst(teamConfig(side).hex, side);
          juice.addFlash(
            side === "blue" ? "rgba(56,189,248,0.25)" : "rgba(244,63,94,0.25)",
          );
          setTimeout(() => nextSentence(side), 500);
        }
      } else {
        play("wrong");
        s.flash = "wrong";
        s.idx = 0;
        s.scrambled = shuffle(s.words.map((word, id) => ({ word, id })));
        fireShake();
        if (flashTimers.current[side]) clearTimeout(flashTimers.current[side]!);
        flashTimers.current[side] = setTimeout(
          () => setSides((p) => ({ ...p, [side]: { ...p[side], flash: null } })),
          420,
        );
      }
      return { ...prev, [side]: s };
    });
  };

  const diffScore = sides.red.score - sides.blue.score;
  const markerPos = Math.min(90, Math.max(10, 50 + diffScore * 4));

  const winner =
    sides.blue.score > sides.red.score
      ? { msg: "BLUE WINS!", color: "#38bdf8" }
      : sides.red.score > sides.blue.score
        ? { msg: "RED WINS!", color: "#fb7185" }
        : { msg: "DRAW!", color: "#ffffff" };

  return (
    <div id={GAME_ROOT_ID} className="relative flex h-screen flex-col overflow-hidden bg-ink">
      <GameHeader title="Sentence Battle" subtitle="Tarik Tambang · Susun Kata" accent={ACCENT} icon="🧩">
        <TimerBadge value={formatClock(timeLeft)} warning={timeLeft <= 10 && phase === "playing"} accent={ACCENT} />
      </GameHeader>

      {/* Tug of war arena */}
      {!solo ? (
        <div
          className={`tex-tug vignette relative flex h-44 w-full items-center justify-center overflow-hidden border-b-8 border-amber-900 ${arenaShake ? "animate-shake" : ""}`}
        >
          {/* tali */}
          <div className="absolute inset-x-[6%] top-[60%] h-3 -translate-y-1/2 rounded-full bg-[repeating-linear-gradient(90deg,#7c4a12,#7c4a12_9px,#a86a24_9px,#a86a24_18px)] shadow-[0_4px_10px_rgba(0,0,0,0.5)]" />
          {/* penanda */}
          <div
            className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-700 ease-out"
            style={{ left: `${markerPos}%` }}
          >
            <div className="flex flex-col items-center">
              <span className="text-3xl drop-shadow">🚩</span>
              <span className="h-16 w-2 rounded-full bg-white/80 shadow-[0_0_14px_#fff]" />
            </div>
          </div>

          {/* penarik */}
          <div className={`absolute bottom-3 left-[9%] text-5xl transition-transform duration-300 ${pullSide === "blue" ? "-translate-x-3 scale-110" : ""}`}>
            💪
          </div>
          <div className={`absolute right-[9%] bottom-3 -scale-x-100 text-5xl transition-transform duration-300 ${pullSide === "red" ? "translate-x-3 scale-110" : ""}`}>
            💪
          </div>
          <div className="absolute bottom-0 h-8 w-full bg-gradient-to-t from-[#7a4a17] to-transparent" />

          <div className="absolute top-3 left-4 font-display text-3xl text-blue-deep stroke-text-sm">
            {sides.blue.score}
          </div>
          <div className="absolute top-3 right-4 font-display text-3xl text-red-deep stroke-text-sm">
            {sides.red.score}
          </div>
        </div>
      ) : (
        <div className="relative z-20 flex h-16 w-full items-center justify-between border-b-2 border-line bg-black/60 px-6">
          <span className="font-display text-2xl text-blue">🧑 LATIHAN MANDIRI</span>
          <span className="font-display text-2xl text-gold">KALIMAT SELESAI: {sides.blue.score}</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {((solo ? ["blue"] : ["blue", "red"]) as TeamSide[]).map((side) => {
          const cfg = teamConfig(side);
          const s = sides[side];
          return (
            <div
              key={side}
              className={`relative flex flex-1 flex-col gap-4 p-5 ${
                side === "blue"
                  ? "bg-gradient-to-br from-[#0e2a5c] to-ink"
                  : "bg-gradient-to-bl from-[#5c0e1a] to-ink"
              }`}
            >
              <div className={`text-center font-display text-5xl ${cfg.text}`}>{s.score}</div>

              {juice.burst && juice.burst.side === side ? (
                <Burst color={juice.burst.color} seed={juice.burst.id} />
              ) : null}

              <div
                className={`flex min-h-[120px] flex-wrap items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed p-4 transition-all ${
                  s.flash === "correct"
                    ? "border-green bg-green/25"
                    : s.flash === "wrong"
                      ? "animate-shake border-red bg-red/25"
                      : "border-white/30 bg-black/40"
                }`}
              >
                {s.words.slice(0, s.idx).map((w, i) => (
                  <span
                    key={i}
                    className="animate-pop rounded-lg bg-gold px-4 py-2 text-xl font-bold text-ink shadow-[0_4px_0_#d35400]"
                  >
                    {w}
                  </span>
                ))}
              </div>

              <div className="flex flex-1 flex-wrap content-start justify-center gap-3 overflow-y-auto">
                {s.scrambled.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => check(side, chip)}
                    className="btn-3d focus-ring bg-white px-6 py-3 text-xl font-extrabold text-ink shadow-[0_6px_0_#94a3b8] transition-transform hover:-translate-y-0.5"
                  >
                    {chip.word}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <footer className="pointer-events-none z-10 bg-gradient-to-t from-black/80 to-transparent py-3 text-center text-xs tracking-widest text-white/60">
        © {new Date().getFullYear()} Dewa Krishnadana
      </footer>

      {juice.flash ? <ScreenFlash color={juice.flash.color} trigger={juice.flash.id} /> : null}

      {counting && count !== null ? <Countdown count={count} accent={ACCENT} /> : null}

      {phase === "menu" ? (
        <Overlay>
          <div className="absolute inset-0 -z-10 tex-tug opacity-30" />
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-gradient-to-b from-white to-slate-100 p-10 text-center shadow-2xl">
            <span className="text-5xl">🪢</span>
            <h1 className="mt-1 font-display text-5xl text-ink">SENTENCE BATTLE</h1>
            <p className="mt-1 mb-8 font-semibold text-red-deep">Ultimate Tug of War Edition</p>

            <div className="mb-6">
              <p className="mb-3 font-bold text-red-deep">TIPE PERMAINAN</p>
              <div className="flex flex-wrap justify-center gap-3">
                <ChoiceButton
                  label="👥 Duel 2 Tim"
                  active={!solo}
                  onClick={() => setSolo(false)}
                  accent="#1d4ed8"
                  className="border-slate-300 bg-slate-100 text-slate-600"
                />
                <ChoiceButton
                  label="🧑 Latihan Mandiri"
                  active={solo}
                  onClick={() => setSolo(true)}
                  accent="#1d4ed8"
                  className="border-slate-300 bg-slate-100 text-slate-600"
                />
              </div>
            </div>

            <div className="mb-6">
              <p className="mb-3 font-bold text-red-deep">DIFFICULTY</p>
              <div className="flex flex-wrap justify-center gap-3">
                {DIFFS.map((d) => (
                  <ChoiceButton
                    key={d.id}
                    label={d.label}
                    active={diff === d.id}
                    onClick={() => setDiff(d.id)}
                    accent="#1d4ed8"
                    className="border-slate-300 bg-slate-100 text-slate-600"
                  />
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="mb-3 font-bold text-red-deep">TIME</p>
              <div className="flex flex-wrap justify-center gap-3">
                {TIMES.map((t) => (
                  <ChoiceButton
                    key={t}
                    label={`${t / 60} Min`}
                    active={duration === t}
                    onClick={() => setDuration(t)}
                    accent="#1d4ed8"
                    className="border-slate-300 bg-slate-100 text-slate-600"
                  />
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="mb-2 text-sm text-slate-500">
                Bank soal siap:{" "}
                <span className="font-bold text-green-deep">
                  {sentencesByDifficulty(storeSentences, diff).length} kalimat ({diff})
                </span>
              </p>
              <button
                type="button"
                onClick={() => {
                  setDraft(storeSentences);
                  setShowEditor((v) => !v);
                }}
                className="focus-ring cursor-pointer rounded-xl border-none bg-gold px-5 py-2.5 font-bold text-ink"
              >
                ✏️ Edit Soal
              </button>
              {showEditor ? (
                <div className="mt-3">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="h-32 w-full rounded-2xl border-2 border-slate-200 p-3 font-mono text-sm outline-none focus:border-blue-deep"
                    placeholder="Pisahkan setiap kalimat dengan tanda |"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (draft.trim().length > 0) {
                        updatePlatformData({ sentences: draft });
                        setShowEditor(false);
                      }
                    }}
                    className="focus-ring mt-2 w-full cursor-pointer rounded-xl border-none bg-green-deep px-5 py-2.5 font-bold text-white"
                  >
                    Simpan
                  </button>
                </div>
              ) : null}
            </div>

            <SpeedHint />
            <StartButton label="START" onClick={startGame} color="#dc2626" shadow="#7f1d1d" className="text-white" />
          </div>
        </Overlay>
      ) : null}

      {phase === "result" ? (
        <Overlay>
          {!solo && winner.msg !== "DRAW!" ? <Confetti count={110} /> : null}
          {solo ? (
            <>
              <span className="text-6xl">🧩</span>
              <h1 className="mb-4 mt-2 font-display text-6xl text-gold" style={{ textShadow: "0 0 40px #fbbf24, 3px 3px 0 #000" }}>
                LATIHAN SELESAI!
              </h1>
              <div className="mb-8 animate-glow rounded-3xl border-2 border-gold/40 bg-gold/10 px-16 py-6 text-center">
                <p className="text-sm tracking-widest text-muted uppercase">Kalimat Selesai</p>
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
            <StartButton label="PLAY AGAIN" onClick={startGame} color="#dc2626" shadow="#7f1d1d" />
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

      <SaveScoreDialog game="sentence-battle" score={sides.blue.score} open={showSave} onClose={() => setShowSave(false)} />
    </div>
  );
}
