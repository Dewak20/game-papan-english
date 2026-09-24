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
import { buildVocabQuestion, type VocabQuestion } from "@/lib/vocabulary";
import type { ReviewItem, TeamSide } from "@/lib/types";

type Phase = "menu" | "countdown" | "playing" | "result";

const ACCENT = "#34d399";
const SCORE_CORRECT = 10;
const SCORE_WRONG = 5;
const SPEED_BONUS_MAX = 5;
const DURATIONS = [60, 180, 300, 600];

export default function VocabularyClient() {
  const { play } = useSound();
  const { vocab } = usePlatformData();
  const juice = useJuice();
  const fireShake = useScreenShake();
  const theme = useMemo(() => musicTheme("vocabulary-match"), []);

  const [phase, setPhase] = useState<Phase>("menu");
  const [duration, setDuration] = useState(60);
  const [solo, setSolo] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [category, setCategory] = useState("Semua");

  useMusic(theme, phase === "playing" || phase === "countdown");

  const [timeLeft, setTimeLeft] = useState(60);
  const [teams, setTeams] = useState<Record<TeamSide, number>>({ blue: 0, red: 0 });
  const [questions, setQuestions] = useState<Record<TeamSide, VocabQuestion | null>>({
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

  const categories = useMemo(
    () => ["Semua", ...Array.from(new Set(vocab.map((v) => v.category)))],
    [vocab],
  );

  const pool = useMemo(
    () => (category === "Semua" ? vocab : vocab.filter((v) => v.category === category)),
    [vocab, category],
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
    if (pool.length < 4) return;
    setTeams({ blue: 0, red: 0 });
    setWrongLog([]);
    setQuestions({ blue: buildVocabQuestion(pool), red: solo ? null : buildVocabQuestion(pool) });
    setFlash({ blue: null, red: null });
    setShowSave(false);
    setTimeLeft(duration);
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
    const picked = q.options[choice];
    const correct = picked === q.answer;
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
      juice.addFlash("rgba(52,211,153,0.2)");
    } else {
      juice.addFloat(`-${SCORE_WRONG}`, "#fb7185", side === "blue" ? "30%" : "70%", "36%");
      juice.addFlash("rgba(244,63,94,0.28)");
      setWrongLog((log) => [...log, { word: q.prompt, expected: q.answer }]);
      fireShake();
    }

    setFlash((prev) => ({ ...prev, [side]: correct ? "correct" : "wrong" }));
    if (flashTimer.current[side]) clearTimeout(flashTimer.current[side]!);
    flashTimer.current[side] = setTimeout(() => setFlash((prev) => ({ ...prev, [side]: null })), 350);

    setQuestions((prev) => ({ ...prev, [side]: buildVocabQuestion(pool, q) }));
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
    <div id={GAME_ROOT_ID} className="relative flex h-screen flex-col overflow-hidden bg-ink">
      <GameHeader title="Vocabulary Match" subtitle="Papan Tulis · Inggris ↔ Indonesia" accent={ACCENT} icon="📚">
        <TimerBadge value={formatClock(timeLeft)} warning={timeLeft <= 10 && phase === "playing"} accent={ACCENT} />
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
          <span className="font-display text-2xl text-blue">🧑 LATIHAN MANDIRI</span>
          <span className="font-display text-2xl text-gold">SKOR: {teams.blue}</span>
        </div>
      )}

      <div className="relative flex flex-1 overflow-hidden">
        {((solo ? ["blue"] : ["blue", "red"]) as TeamSide[]).map((side) => {
          const cfg = teamConfig(side);
          const q = questions[side];
          const f = flash[side];
          return (
            <div
              key={side}
              className={`tex-chalkboard relative flex flex-1 flex-col items-center justify-center gap-6 p-6`}
            >
              <div
                className={`pointer-events-none absolute inset-0 ${
                  side === "blue"
                    ? "bg-gradient-to-b from-sky-900/40 to-transparent"
                    : "bg-gradient-to-b from-red-950/60 to-transparent"
                }`}
              />
              <div
                className={`pointer-events-none absolute inset-0 transition-colors ${
                  f === "correct" ? "bg-green/25" : f === "wrong" ? "bg-red/25" : ""
                }`}
              />

              <div className="z-10 flex w-full items-center justify-between px-2">
                <span className={`font-chalk text-3xl ${cfg.text}`}>{solo ? "🧑 KAMU" : cfg.name}</span>
                <span className={`font-chalk text-6xl ${cfg.text}`}>{teams[side]}</span>
              </div>

              <div className="z-10 w-[92%] text-center">
                <p className="mb-2 font-chalk text-lg tracking-widest text-white/60">
                  Apa arti kata ini?
                </p>
                <div
                  key={q?.prompt}
                  className="flex min-h-[140px] w-full animate-bounce-in items-center justify-center rounded-3xl border-4 border-dashed border-white/30 bg-black/30 px-8 py-8 text-center font-chalk text-5xl text-white chalk-text sm:text-6xl"
                >
                  {q ? q.prompt.toUpperCase() : "…"}
                </div>
              </div>

              <div className="z-10 flex w-[92%] gap-5">
                {([0, 1] as const).map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => answer(side, i)}
                    className={`btn-3d focus-ring flex-1 px-4 py-8 font-chalk text-2xl text-white sm:text-3xl ${
                      side === "blue"
                        ? "bg-gradient-to-b from-sky-600 to-blue-900 shadow-[0_8px_0_#172554]"
                        : "bg-gradient-to-b from-rose-600 to-red-900 shadow-[0_8px_0_#450a0a]"
                    }`}
                  >
                    {q ? q.options[i] : "…"}
                  </button>
                ))}
              </div>

              {juice.burst && juice.burst.side === side ? (
                <Burst color={juice.burst.color} seed={juice.burst.id} />
              ) : null}
            </div>
          );
        })}

      <FloatLayer floats={juice.floats} fontClass="font-chalk" sizeClass="text-6xl" />
      </div>

      <GameFooter />

      {juice.flash ? <ScreenFlash color={juice.flash.color} trigger={juice.flash.id} /> : null}

      {counting && count !== null ? <Countdown count={count} accent={ACCENT} /> : null}

      {phase === "menu" ? (
        <Overlay>
          <div className="absolute inset-0 -z-10 tex-chalkboard opacity-80" />
          <span className="mb-3 animate-wiggle text-6xl">📚</span>
          <h1 className="font-chalk text-6xl text-white chalk-text sm:text-7xl">VOCABULARY MATCH</h1>
          <p className="mt-2 mb-8 font-chalk text-lg text-white/70">Cocokkan kata Inggris dengan artinya</p>

          <div className="mb-6 w-full max-w-2xl text-center">
            <SectionLabel accent={ACCENT}>Tipe Permainan</SectionLabel>
            <div className="flex flex-wrap justify-center gap-3">
              <ChoiceButton label="👥 Duel 2 Tim" active={!solo} onClick={() => setSolo(false)} accent={ACCENT} />
              <ChoiceButton label="🧑 Latihan Mandiri" active={solo} onClick={() => setSolo(true)} accent={ACCENT} />
            </div>
          </div>

          <div className="mb-6 w-full max-w-3xl text-center">
            <SectionLabel accent={ACCENT}>
              Kategori ({pool.length} kata)
            </SectionLabel>
            <div className="flex max-h-40 flex-wrap justify-center gap-2 overflow-y-auto">
              {categories.map((c) => (
                <ChoiceButton key={c} label={c} active={category === c} onClick={() => setCategory(c)} accent={ACCENT} />
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
            label={pool.length < 4 ? "KATA KURANG" : "START GAME"}
            onClick={startGame}
            disabled={pool.length < 4}
            color={ACCENT}
            shadow="#047857"
          />
        </Overlay>
      ) : null}

      {phase === "result" ? (
        <Overlay>
          {!solo && winner.msg !== "DRAW!" ? <Confetti count={100} /> : null}
          {solo ? (
            <>
              <span className="text-6xl">🎓</span>
              <h1 className="mb-4 mt-2 font-display text-6xl text-gold" style={{ textShadow: "0 0 40px #fbbf24, 3px 3px 0 #000" }}>
                LATIHAN SELESAI!
              </h1>
              <div className="mb-6 animate-glow rounded-3xl border-2 border-gold/40 bg-gold/10 px-16 py-6 text-center">
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

          <div className="mb-6 max-h-56 w-full max-w-2xl overflow-y-auto rounded-2xl border-2 border-gold/30 bg-black/50 p-5 text-left">
            <h3 className="mb-3 text-center font-display text-2xl text-gold">📖 Kosakata untuk Diulang</h3>
            {uniqueMistakes.length === 0 ? (
              <p className="text-center text-green">Sempurna! Tidak ada kesalahan. 🌟</p>
            ) : (
              uniqueMistakes.slice(0, 15).map((item, i) => (
                <div key={i} className="border-b border-white/10 py-1.5 text-lg">
                  <b className="uppercase">{item.word}</b> ={" "}
                  <span className="rounded bg-green/20 px-2 font-bold text-green">{item.expected}</span>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <StartButton label="PLAY AGAIN" onClick={startGame} color={ACCENT} shadow="#047857" />
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

      <SaveScoreDialog game="vocabulary-match" score={teams.blue} open={showSave} onClose={() => setShowSave(false)} />
    </div>
  );
}
