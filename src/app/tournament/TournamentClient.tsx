"use client";

import { useState } from "react";
import Link from "next/link";
import { games } from "@/lib/games";
import {
  champion,
  isComplete,
  nextMatch,
  progress,
  standings,
  type TournamentTeam,
} from "@/lib/tournament";
import {
  clearScore,
  clearTournament,
  recordScore,
  startTournament,
  useTournament,
} from "@/lib/tournamentStore";

const pickableGames = games.filter((g) => g.slug !== "rank");
const gameBySlug = new Map(games.map((g) => [g.slug, g]));

function makeTeamId(index: number) {
  return `t${index + 1}`;
}

/** Layar pengaturan: susun tim, game, dan jumlah ronde. */
function Setup() {
  const [title, setTitle] = useState("Turnamen Kelas");
  const [names, setNames] = useState<string[]>(["Tim Biru", "Tim Merah"]);
  const [selected, setSelected] = useState<string[]>([
    pickableGames[0]?.slug ?? "tebak-gambar",
  ]);
  const [rounds, setRounds] = useState(1);
  const [pointsWin, setPointsWin] = useState(3);
  const [pointsDraw, setPointsDraw] = useState(1);
  const [pointsLoss, setPointsLoss] = useState(0);

  const toggleGame = (slug: string) =>
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );

  const canStart =
    names.filter((n) => n.trim()).length >= 2 && selected.length > 0 && rounds >= 1;

  function start() {
    const teams: TournamentTeam[] = names
      .map((n) => n.trim())
      .filter(Boolean)
      .map((name, i) => ({ id: makeTeamId(i), name }));
    startTournament({
      title: title.trim() || "Turnamen Kelas",
      teams,
      games: selected,
      rounds,
      pointsWin,
      pointsDraw,
      pointsLoss,
    });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <Link href="/" className="focus-ring text-sm font-semibold text-muted hover:text-white">
        ← Menu
      </Link>
      <header className="text-center">
        <h1 className="font-display text-5xl text-white">🏆 TURNAMEN KELAS</h1>
        <p className="mt-3 text-muted">
          Setiap tim saling bertemu (round-robin) memainkan game bergantian. Klasemen
          dihitung otomatis.
        </p>
      </header>

      <section className="panel flex flex-col gap-4 border-2 border-line p-6">
        <label className="text-sm text-muted">
          Nama turnamen
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            className="focus-ring mt-1 w-full rounded-xl border-2 border-line bg-ink-soft px-4 py-2.5 text-white"
          />
        </label>

        <div>
          <p className="mb-2 text-sm text-muted">Tim ({names.length})</p>
          <div className="flex flex-col gap-2">
            {names.map((n, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-center font-display text-muted">{i + 1}</span>
                <input
                  value={n}
                  onChange={(e) =>
                    setNames((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
                  }
                  maxLength={24}
                  className="focus-ring flex-1 rounded-xl border-2 border-line bg-ink-soft px-4 py-2.5 text-white"
                />
                {names.length > 2 ? (
                  <button
                    type="button"
                    onClick={() => setNames((prev) => prev.filter((_, j) => j !== i))}
                    className="focus-ring h-10 w-10 cursor-pointer rounded-lg border border-red/40 bg-red/10 font-bold text-red hover:bg-red/25"
                    aria-label="Hapus tim"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {names.length < 8 ? (
            <button
              type="button"
              onClick={() => setNames((prev) => [...prev, `Tim ${prev.length + 1}`])}
              className="focus-ring mt-2 cursor-pointer rounded-xl border-2 border-dashed border-line px-4 py-2 text-sm font-semibold text-muted hover:border-gold/60 hover:text-white"
            >
              + Tambah tim
            </button>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-sm text-muted">Game (dipilih: {selected.length})</p>
          <div className="flex flex-wrap gap-2">
            {pickableGames.map((g) => {
              const on = selected.includes(g.slug);
              return (
                <button
                  key={g.slug}
                  type="button"
                  onClick={() => toggleGame(g.slug)}
                  className={`focus-ring cursor-pointer rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-colors ${
                    on
                      ? "border-gold bg-gold/15 text-gold"
                      : "border-line bg-white/5 text-muted hover:text-white"
                  }`}
                >
                  {g.icon} {g.title}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <label className="text-sm text-muted">
            Ronde
            <input
              type="number"
              min={1}
              max={20}
              value={rounds}
              onChange={(e) => setRounds(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              className="focus-ring mt-1 w-full rounded-xl border-2 border-line bg-ink-soft px-4 py-2.5 text-white"
            />
          </label>
          <label className="text-sm text-muted">
            Poin menang
            <input
              type="number"
              min={0}
              max={99}
              value={pointsWin}
              onChange={(e) => setPointsWin(Number(e.target.value) || 0)}
              className="focus-ring mt-1 w-full rounded-xl border-2 border-line bg-ink-soft px-4 py-2.5 text-white"
            />
          </label>
          <label className="text-sm text-muted">
            Poin imbang
            <input
              type="number"
              min={0}
              max={99}
              value={pointsDraw}
              onChange={(e) => setPointsDraw(Number(e.target.value) || 0)}
              className="focus-ring mt-1 w-full rounded-xl border-2 border-line bg-ink-soft px-4 py-2.5 text-white"
            />
          </label>
          <label className="text-sm text-muted">
            Poin kalah
            <input
              type="number"
              min={0}
              max={99}
              value={pointsLoss}
              onChange={(e) => setPointsLoss(Number(e.target.value) || 0)}
              className="focus-ring mt-1 w-full rounded-xl border-2 border-line bg-ink-soft px-4 py-2.5 text-white"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={start}
          disabled={!canStart}
          className="btn-3d focus-ring mt-2 cursor-pointer bg-green px-6 py-3 text-xl text-ink shadow-[0_8px_0_#047857] disabled:cursor-not-allowed disabled:opacity-40"
        >
          MULAI TURNAMEN
        </button>
      </section>
    </div>
  );
}

/** Kartu satu laga dengan input skor. */
function MatchCard({
  round,
  gameSlug,
  homeName,
  awayName,
  homeScore,
  awayScore,
  onSave,
  onClear,
}: {
  round: number;
  gameSlug: string;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  onSave: (h: number, a: number) => void;
  onClear: () => void;
}) {
  const [h, setH] = useState(homeScore?.toString() ?? "");
  const [a, setA] = useState(awayScore?.toString() ?? "");
  const g = gameBySlug.get(gameSlug);
  const played = homeScore !== null && awayScore !== null;

  return (
    <div className="panel border-2 border-line p-5">
      <div className="mb-3 flex items-center justify-between text-xs tracking-widest text-muted uppercase">
        <span>Ronde {round}</span>
        <span>
          {g?.icon} {g?.title ?? gameSlug}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 text-right font-display text-xl text-blue">{homeName}</div>
        <input
          type="number"
          min={0}
          max={999}
          value={h}
          onChange={(e) => setH(e.target.value)}
          className="focus-ring w-20 rounded-xl border-2 border-line bg-ink-soft px-3 py-2 text-center font-timer text-2xl text-white"
        />
        <span className="font-display text-2xl text-muted">:</span>
        <input
          type="number"
          min={0}
          max={999}
          value={a}
          onChange={(e) => setA(e.target.value)}
          className="focus-ring w-20 rounded-xl border-2 border-line bg-ink-soft px-3 py-2 text-center font-timer text-2xl text-white"
        />
        <div className="flex-1 font-display text-xl text-red">{awayName}</div>
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => onSave(Number(h) || 0, Number(a) || 0)}
          className="focus-ring cursor-pointer rounded-xl border-2 border-green/50 bg-green/15 px-5 py-2 text-sm font-bold text-green hover:bg-green/30"
        >
          {played ? "Perbarui" : "Simpan skor"}
        </button>
        {played ? (
          <button
            type="button"
            onClick={() => {
              setH("");
              setA("");
              onClear();
            }}
            className="focus-ring cursor-pointer rounded-xl border-2 border-line bg-white/5 px-5 py-2 text-sm font-semibold text-muted hover:text-white"
          >
            Kosongkan
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Layar berjalannya turnamen. */
function Board({ state }: { state: NonNullable<ReturnType<typeof useTournament>> }) {
  const rows = standings(state);
  const next = nextMatch(state);
  const done = isComplete(state);
  const champ = champion(state);
  const prog = progress(state);
  const teamName = (id: string) => state.config.teams.find((t) => t.id === id)?.name ?? id;

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/"
            className="focus-ring text-sm font-semibold text-muted hover:text-white"
          >
            ← Menu
          </Link>
          <h1 className="font-display text-4xl text-white">{state.config.title}</h1>
          <p className="text-sm text-muted">
            {state.config.teams.length} tim · {prog.done}/{prog.total} laga selesai
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm("Hapus turnamen ini dan mulai dari awal?")) clearTournament();
          }}
          className="focus-ring cursor-pointer rounded-xl border-2 border-line bg-white/5 px-5 py-2.5 font-semibold text-muted hover:border-red/60 hover:text-red"
        >
          Turnamen baru
        </button>
      </header>

      {/* Progres */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue via-gold to-red transition-[width] duration-500"
          style={{ width: `${prog.total ? (prog.done / prog.total) * 100 : 0}%` }}
        />
      </div>

      {done && champ ? (
        <div className="panel animate-glow border-2 border-gold/60 bg-gold/10 p-8 text-center">
          <p className="text-sm tracking-[0.3em] text-muted uppercase">Juara</p>
          <p className="mt-2 font-display text-6xl text-gold">🏆 {champ.name}</p>
          <p className="mt-1 text-muted">
            {champ.points} poin · {champ.wins} menang · selisih {champ.diff >= 0 ? "+" : ""}
            {champ.diff}
          </p>
        </div>
      ) : null}

      {next ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs tracking-widest text-muted uppercase">Laga berikutnya</h2>
          <MatchCard
            key={next.id}
            round={next.round}
            gameSlug={next.gameSlug}
            homeName={teamName(next.homeId)}
            awayName={teamName(next.awayId)}
            homeScore={next.homeScore}
            awayScore={next.awayScore}
            onSave={(h, a) => recordScore(next.id, h, a)}
            onClear={() => clearScore(next.id)}
          />
        </section>
      ) : null}

      {/* Klasemen */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs tracking-widest text-muted uppercase">Klasemen</h2>
        <div className="overflow-hidden rounded-2xl border-2 border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs tracking-wider text-muted uppercase">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Tim</th>
                <th className="px-3 py-2 text-center">M</th>
                <th className="px-3 py-2 text-center">S</th>
                <th className="px-3 py-2 text-center">K</th>
                <th className="px-3 py-2 text-center">SG</th>
                <th className="px-4 py-2 text-right">Poin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.teamId}
                  className={`border-t border-line ${i === 0 && r.played > 0 ? "bg-gold/10" : ""}`}
                >
                  <td className="px-4 py-2 font-display text-muted">
                    {i === 0 && r.played > 0 ? "🥇" : i + 1}
                  </td>
                  <td className="px-4 py-2 font-semibold text-white">{r.name}</td>
                  <td className="px-3 py-2 text-center text-muted">{r.wins}</td>
                  <td className="px-3 py-2 text-center text-muted">{r.draws}</td>
                  <td className="px-3 py-2 text-center text-muted">{r.losses}</td>
                  <td className="px-3 py-2 text-center text-muted">
                    {r.diff >= 0 ? "+" : ""}
                    {r.diff}
                  </td>
                  <td className="px-4 py-2 text-right font-timer text-xl text-gold">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Semua laga */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs tracking-widest text-muted uppercase">Semua laga</h2>
        {state.matches.map((m) => (
          <MatchCard
            key={m.id}
            round={m.round}
            gameSlug={m.gameSlug}
            homeName={teamName(m.homeId)}
            awayName={teamName(m.awayId)}
            homeScore={m.homeScore}
            awayScore={m.awayScore}
            onSave={(h, a) => recordScore(m.id, h, a)}
            onClear={() => clearScore(m.id)}
          />
        ))}
      </section>
    </div>
  );
}

export default function TournamentClient() {
  const state = useTournament();
  return state ? <Board state={state} /> : <Setup />;
}
