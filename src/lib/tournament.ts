/**
 * Mesin turnamen (round-robin) — murni, tanpa DOM/database.
 *
 * Dipakai halaman `/tournament` untuk menyelenggarakan turnamen antar-kelas
 * atau antar-tim di papan besar: setiap pasangan tim bertemu beberapa kali,
 * bergantian game, lalu klasemen dihitung otomatis.
 *
 * Semua fungsi di sini bebas efek samping sehingga mudah diuji
 * (lihat `tournament.test.ts`).
 */

export interface TournamentTeam {
  id: string;
  name: string;
}

export interface TournamentMatch {
  id: string;
  /** Ronde ke-berapa (1-based). */
  round: number;
  /** Slug game yang dimainkan pada laga ini. */
  gameSlug: string;
  homeId: string;
  awayId: string;
  /** `null` = belum dimainkan. */
  homeScore: number | null;
  awayScore: number | null;
}

export interface TournamentConfig {
  title: string;
  teams: TournamentTeam[];
  /** Slug game yang dirotasi antar laga. */
  games: string[];
  /** Berapa kali setiap pasangan bertemu. */
  rounds: number;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
}

export interface TournamentState {
  config: TournamentConfig;
  matches: TournamentMatch[];
  createdAt: string;
  updatedAt: string;
}

export interface Standing {
  teamId: string;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  scoreFor: number;
  scoreAgainst: number;
  /** Selisih skor (scoreFor − scoreAgainst). */
  diff: number;
}

/** Susun semua laga round-robin: tiap pasangan bertemu `rounds` kali. */
export function makeMatches(
  teams: TournamentTeam[],
  games: string[],
  rounds: number,
): TournamentMatch[] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      pairs.push([teams[i].id, teams[j].id]);
    }
  }

  const safeGames = games.length > 0 ? games : ["tebak-gambar"];
  const safeRounds = Math.max(1, Math.min(20, Math.floor(rounds) || 1));

  const matches: TournamentMatch[] = [];
  let g = 0;
  for (let r = 1; r <= safeRounds; r++) {
    for (const [homeId, awayId] of pairs) {
      matches.push({
        id: `r${r}-${homeId}-${awayId}`,
        round: r,
        gameSlug: safeGames[g % safeGames.length],
        homeId,
        awayId,
        homeScore: null,
        awayScore: null,
      });
      g++;
    }
  }
  return matches;
}

/** Buat turnamen baru dari konfigurasi. */
export function makeTournament(config: TournamentConfig): TournamentState {
  const now = new Date().toISOString();
  return {
    config,
    matches: makeMatches(config.teams, config.games, config.rounds),
    createdAt: now,
    updatedAt: now,
  };
}

/** Tandai laga dengan skor baru (imutabel). */
export function setMatchScore(
  state: TournamentState,
  matchId: string,
  homeScore: number,
  awayScore: number,
): TournamentState {
  const clamp = (n: number) => Math.max(0, Math.min(999, Math.floor(n) || 0));
  return {
    ...state,
    matches: state.matches.map((m) =>
      m.id === matchId
        ? { ...m, homeScore: clamp(homeScore), awayScore: clamp(awayScore) }
        : m,
    ),
    updatedAt: new Date().toISOString(),
  };
}

/** Kosongkan skor satu laga. */
export function clearMatchScore(state: TournamentState, matchId: string): TournamentState {
  return {
    ...state,
    matches: state.matches.map((m) =>
      m.id === matchId ? { ...m, homeScore: null, awayScore: null } : m,
    ),
    updatedAt: new Date().toISOString(),
  };
}

/** Hitung klasemen dari laga yang sudah dimainkan. */
export function standings(state: TournamentState): Standing[] {
  const { pointsWin, pointsDraw, pointsLoss } = state.config;
  const map = new Map<string, Standing>();
  for (const t of state.config.teams) {
    map.set(t.id, {
      teamId: t.id,
      name: t.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      scoreFor: 0,
      scoreAgainst: 0,
      diff: 0,
    });
  }

  for (const m of state.matches) {
    if (m.homeScore === null || m.awayScore === null) continue;
    const home = map.get(m.homeId);
    const away = map.get(m.awayId);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.scoreFor += m.homeScore;
    home.scoreAgainst += m.awayScore;
    away.scoreFor += m.awayScore;
    away.scoreAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.wins++;
      away.losses++;
      home.points += pointsWin;
      away.points += pointsLoss;
    } else if (m.homeScore < m.awayScore) {
      away.wins++;
      home.losses++;
      away.points += pointsWin;
      home.points += pointsLoss;
    } else {
      home.draws++;
      away.draws++;
      home.points += pointsDraw;
      away.points += pointsDraw;
    }
  }

  const rows = [...map.values()];
  for (const r of rows) r.diff = r.scoreFor - r.scoreAgainst;

  return rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.diff - a.diff ||
      b.scoreFor - a.scoreFor ||
      a.name.localeCompare(b.name),
  );
}

/** Laga berikutnya yang belum dimainkan (urut ronde lalu urutan laga). */
export function nextMatch(state: TournamentState): TournamentMatch | null {
  return state.matches.find((m) => m.homeScore === null || m.awayScore === null) ?? null;
}

/** Apakah semua laga sudah dimainkan? */
export function isComplete(state: TournamentState): boolean {
  return state.matches.every((m) => m.homeScore !== null && m.awayScore !== null);
}

/** Juara = peringkat 1 klasemen (null bila belum ada laga selesai). */
export function champion(state: TournamentState): Standing | null {
  const rows = standings(state);
  if (rows.length === 0 || rows[0].played === 0) return null;
  return rows[0];
}

/** Ringkas progres: berapa laga selesai dari total. */
export function progress(state: TournamentState): { done: number; total: number } {
  const done = state.matches.filter(
    (m) => m.homeScore !== null && m.awayScore !== null,
  ).length;
  return { done, total: state.matches.length };
}
