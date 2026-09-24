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
import { useSpeech } from "@/lib/useSpeech";
import { SaveScoreDialog } from "@/components/SaveScoreDialog";
import { FloatLayer, GameFooter } from "@/components/gameParts";
import {
  buildListeningItem,
  listeningByLevel,
  type ListeningItem,
  type ListeningLevel,
} from "@/lib/listening";
import type { ReviewItem, TeamSide } from "@/lib/types";

type Phase = "menu" | "countdown" | "playing" | "result";

const ACCENT = "#fb923c";
const SCORE_CORRECT = 15;
const SCORE_WRONG = 5;
const SPEED_BONUS_MAX = 8;
const DURATIONS = [60, 180, 300, 600];

const LEVELS: { id: ListeningLevel | "Semua"; label: string }[] = [
  { id: "Semua", label: "Semua" },
  { id: "easy", label: "Kata" },
  { id: "medium", label: "Kalimat" },
];

/** Bar gelombang suara beranimasi (tampil saat audio diputar). */
function SoundWaves({ active, color }: { active: boolean; color: string }) {
  return (
    <div className="flex h-16 items-end justify-center gap-1.5">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <span
          key={i}
          className="w-2.5 rounded-full transition-all duration-200"
          style={{
            backgroundColor: color,
            height: active ? "100%" : "18%",
            opacity: active ? 1 : 0.35,
            animation: active ? `soundbar 0.7s ease-in-out ${i * 0.09}s infinite alternate` : "none",
          }}
        />
      ))}
    </div>
  );
}

export default function ListeningClient() {
  const { play } = useSound();
  const juice = useJuice();
  const fireShake = useScreenShake();
  const { supported, speaking, speak, stop } = useSpeech();
  const theme = useMemo(() => musicTheme("listening-battle"), []);

  const [phase, setPhase] = useState<Phase>("menu");
  const [duration, setDuration] = useState(180);
  const [level, setLevel] = useState<ListeningLevel | "Semua">("Semua");
  const [solo, setSolo] = useState(false);
  const [showSave, setShowSave] = useState(false);

  useMusic(theme, phase === "playing" || phase === "countdown");

  const [timeLeft, setTimeLeft] = useState(180);
  const [teams, setTeams] = useState<Record<TeamSide, number>>({ blue: 0, red: 0 });
  const [item, setItem] = useState<ListeningItem | null>(null);
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

  const pool = useMemo(() => listeningByLevel(level), [level]);

  const { count, active: counting, start: startCountdown } = useCountdown(
    useCallback(() => setPhase("playing"), []),
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          stop();
          setPhase("result");
          play("finish");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, play, stop]);

  /* Putar audio otomatis setiap kali soal berganti (saat sudah bermain). */
  useEffect(() => {
    if (phase !== "playing" || !item) return;
    speak(item.speak);
  }, [item, phase, speak]);

  const dealItem = useCallback(
    (prev: ListeningItem | null) => {
      setItem(buildListeningItem(pool, prev));
      setAnswered({ blue: false, red: false });
      setFeedback({ blue: null, red: null });
      qStartRef.current = nowMs();
    },
    [pool],
  );

  const startGame = () => {
    setTeams({ blue: 0, red: 0 });
    setWrongLog([]);
    setShowSave(false);
    setTimeLeft(duration);
    setPhase("countdown");
    dealItem(null);
    startCountdown();
  };

  const answer = (side: TeamSide, choice: 0 | 1 | 2) => {
    if (phase !== "playing" || !item || answered[side]) return;

    const cfg = teamConfig(side);
    const correct = choice === item.answer;
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
        side === "blue" ? "30%" : "70%",
        "40%",
      );
      juice.addFlash("rgba(251,146,60,0.2)");
    } else {
      juice.addFloat(`-${SCORE_WRONG}`, "#fb7185", side === "blue" ? "30%" : "70%", "40%");
      juice.addFlash("rgba(244,63,94,0.28)");
      setWrongLog((log) => [
        ...log,
        { word: item.speak, expected: item.options[item.answer] },
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
        const cur = item;
        dealItem(cur);
      }, 1100);
    }
  };

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
    <div id={GAME_ROOT_ID} className="tex-sound relative flex h-screen flex-col overflow-hidden bg-ink">
      <GameHeader
        title="Listening Battle"
        subtitle="Studio Audio · Dengar & Pilih Artinya"
        accent={ACCENT}
        icon="🎧"
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
          <span className="font-display text-2xl text-orange">🧑 LATIHAN MANDIRI</span>
          <span className="font-display text-2xl text-gold">SKOR: {teams.blue}</span>
        </div>
      )}

      {/* Panel pemutar audio (dipakai bersama kedua tim) */}
      <div className="relative z-20 flex flex-col items-center gap-3 border-b-2 border-line bg-black/40 py-4">
        {supported === false ? (
          <p className="rounded-xl border border-red/40 bg-red/10 px-5 py-3 text-center text-base text-red">
            ⚠️ Browser ini tidak mendukung pemutar suara. Gunakan Chrome/Edge terbaru.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => item && speak(item.speak)}
              disabled={!item}
              className="btn-3d focus-ring flex items-center gap-4 bg-gradient-to-b from-orange-400 to-orange-700 px-10 py-4 text-2xl text-white shadow-[0_8px_0_#9a3412] disabled:opacity-40"
            >
              <span className={`text-3xl ${speaking ? "animate-pulse-soft" : ""}`}>🔊</span>
              {speaking ? "SEDANG DIPUTAR…" : "PUTAR ULANG"}
            </button>
            <SoundWaves active={speaking} color={ACCENT} />
          </>
        )}
        <p className="text-sm tracking-widest text-white/60 uppercase">
          {item ? (item.kind === "word" ? "Dengarkan kata" : "Dengarkan kalimat") : "—"}
        </p>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {((solo ? ["blue"] : ["blue", "red"]) as TeamSide[]).map((side) => {
          const cfg = teamConfig(side);
          const f = feedback[side];
          const locked = answered[side];
          return (
            <div
              key={side}
              className={`relative flex flex-1 flex-col items-center justify-center gap-5 p-5 ${
                solo ? "" : side === "blue" ? "border-r-2 border-white/10" : ""
              }`}
            >
              <div
                className={`pointer-events-none absolute inset-0 transition-colors ${
                  f === "correct" ? "bg-orange/20" : f === "wrong" ? "bg-red/20" : ""
                }`}
              />

              <div className="z-10 flex w-full items-center justify-between px-2">
                <span className={`font-display text-xl ${cfg.text}`}>
                  {solo ? "🧑 KAMU" : cfg.name}
                </span>
                <span className={`font-display text-4xl ${cfg.text}`}>{teams[side]}</span>
              </div>

              <p className="z-10 text-center text-xl font-semibold text-white sm:text-2xl">
                {item ? item.prompt : "…"}
              </p>

              <div className="z-10 flex w-full max-w-xl flex-col gap-3">
                {([0, 1, 2] as const).map((i) => {
                  const isCorrectOpt = item ? i === item.answer : false;
                  const reveal = locked && isCorrectOpt;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => answer(side, i)}
                      disabled={locked}
                      className={`btn-3d focus-ring px-5 py-4 text-left text-lg text-white sm:text-xl ${
                        reveal
                          ? "bg-gradient-to-b from-emerald-500 to-emerald-800 shadow-[0_6px_0_#064e3b]"
                          : side === "blue"
                            ? "bg-gradient-to-b from-sky-600 to-blue-900 shadow-[0_6px_0_#172554]"
                            : "bg-gradient-to-b from-rose-600 to-red-900 shadow-[0_6px_0_#450a0a]"
                      } ${locked && !reveal ? "opacity-40" : ""}`}
                    >
                      <span className="mr-3 font-display opacity-70">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {item ? item.options[i] : "…"}
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
                  {f === "correct" ? "✔ SUDAH MENJAWAB" : "✘ SUDAH MENJAWAB"}
                </span>
              ) : null}

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
          <div className="absolute inset-0 -z-10 tex-sound opacity-90" />
          <span className="mb-3 animate-bob text-6xl">🎧</span>
          <h1 className="font-display text-6xl text-white drop-shadow-[0_4px_20px_rgba(251,146,60,0.55)] sm:text-7xl">
            LISTENING BATTLE
          </h1>
          <p className="mt-2 mb-8 text-lg text-white/70">
            Dengar audio, lalu pilih arti yang tepat
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
            <SectionLabel accent={ACCENT}>Jenis Soal ({pool.length} soal)</SectionLabel>
            <div className="flex flex-wrap justify-center gap-3">
              {LEVELS.map((l) => (
                <ChoiceButton
                  key={l.id}
                  label={l.label}
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
            shadow="#9a3412"
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
            <h3 className="mb-3 text-center font-display text-2xl text-gold">🔁 Dengarkan Lagi</h3>
            {uniqueMistakes.length === 0 ? (
              <p className="text-center text-orange">Sempurna! Tidak ada kesalahan. 🌟</p>
            ) : (
              uniqueMistakes.slice(0, 12).map((it, i) => (
                <div key={i} className="flex items-center justify-between border-b border-white/10 py-1.5 text-lg">
                  <span>
                    <b className="text-white">{it.word}</b> ={" "}
                    <span className="rounded bg-orange/20 px-2 font-bold text-orange">
                      {it.expected}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => speak(it.word)}
                    className="focus-ring rounded-lg border border-orange/40 px-3 py-1 text-sm text-orange hover:bg-orange/10"
                  >
                    🔊
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <StartButton label="PLAY AGAIN" onClick={startGame} color={ACCENT} shadow="#9a3412" />
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
        game="listening-battle"
        score={teams.blue}
        open={showSave}
        onClose={() => setShowSave(false)}
      />
    </div>
  );
}
