// Derived views over the tournament data. The backend only gives us raw
// matches + standings, so anything "broadcast-y" (next fixture, form guide,
// what to feature on the home page) is computed here from existing fields.

import type { EditionDetail, EditionSummary, MatchDto, StandingRow } from '../api/types';

const LEG_ORDER: Record<string, number> = { IDA: 0, VUELTA: 1, FINAL: 2 };

/** League matches only (everything except the Finalissima). */
export function leagueMatches(matches: MatchDto[]): MatchDto[] {
  return matches.filter((m) => !m.finalissima);
}

/** Chronological-ish ordering: IDA before VUELTA, then by orderIndex. */
export function byPlayOrder(a: MatchDto, b: MatchDto): number {
  const leg = (LEG_ORDER[a.leg] ?? 9) - (LEG_ORDER[b.leg] ?? 9);
  return leg !== 0 ? leg : a.orderIndex - b.orderIndex;
}

/** The next league match still to be played, or null when the league is done. */
export function nextPendingMatch(matches: MatchDto[]): MatchDto | null {
  const pending = leagueMatches(matches)
    .filter((m) => m.status === 'PENDING')
    .sort(byPlayOrder);
  return pending[0] ?? null;
}

export type FormResult = 'W' | 'D' | 'L';

/** Recent W/D/L results for a team, oldest → newest, capped at `limit`. */
export function formForTeam(teamId: number, matches: MatchDto[], limit = 5): FormResult[] {
  return leagueMatches(matches)
    .filter(
      (m) =>
        m.status === 'PLAYED' && (m.homeTeam.id === teamId || m.awayTeam.id === teamId),
    )
    .sort(byPlayOrder)
    .map((m) => {
      const isHome = m.homeTeam.id === teamId;
      const gf = (isHome ? m.homeScore : m.awayScore) ?? 0;
      const ga = (isHome ? m.awayScore : m.homeScore) ?? 0;
      if (gf > ga) return 'W' as const;
      if (gf < ga) return 'L' as const;
      return 'D' as const;
    })
    .slice(-limit);
}

/** teamId → recent form, for the whole table. */
export function formByTeam(rows: StandingRow[], matches: MatchDto[]): Map<number, FormResult[]> {
  const map = new Map<number, FormResult[]>();
  for (const row of rows) map.set(row.teamId, formForTeam(row.teamId, matches));
  return map;
}

/** Played / total / percentage for the league phase. */
export function leagueProgress(detail: EditionDetail): {
  played: number;
  total: number;
  pct: number;
} {
  const league = leagueMatches(detail.matches);
  const played = league.filter((m) => m.status === 'PLAYED').length;
  const total = league.length;
  return { played, total, pct: total ? Math.round((played / total) * 100) : 0 };
}

/**
 * Which edition the home page should headline: a live one if there is one,
 * otherwise the most recently created. Sandbox (test) editions never headline.
 */
export function featuredEditionId(editions: EditionSummary[]): number | null {
  const real = editions.filter((e) => !e.test);
  if (real.length === 0) return null;
  const byNewest = [...real].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const live = byNewest.find(
    (e) => e.status === 'IN_PROGRESS' || e.status === 'TEAMS_DRAWN',
  );
  return (live ?? byNewest[0]).id;
}

/** Finished, non-test editions that crowned a champion, newest first. */
export function palmares(editions: EditionSummary[]): EditionSummary[] {
  return editions
    .filter((e) => e.champion && !e.test)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---- Finalissima odds ------------------------------------------------------
// The top 2 of the league reach the Finalissima. We estimate each team's chance
// of finishing top-2 with a Monte Carlo simulation: from the results already
// played, we replay the pending fixtures many times (each a coin-flip win — no
// draws) and count how often each team lands in the top two.

export interface TeamOdds {
  teamId: number;
  teamName: string;
  /** Probability of reaching the Finalissima, 0..1. */
  probability: number;
}

const SIMULATIONS = 5000;

interface OddsAcc {
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  name: string;
}

/** Same tie-break as the backend: points → goal difference → goals for → name. */
function compareAcc(a: OddsAcc, b: OddsAcc): number {
  if (b.points !== a.points) return b.points - a.points;
  const gdA = a.goalsFor - a.goalsAgainst;
  const gdB = b.goalsFor - b.goalsAgainst;
  if (gdB !== gdA) return gdB - gdA;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.name.localeCompare(b.name);
}

/** Small seeded PRNG (mulberry32) so the odds stay stable between re-renders. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Estimated probability that each team reaches the Finalissima (finishes top-2),
 * given the results so far and the fixtures still to play. Returned sorted by
 * probability (highest first). Empty when there is no meaningful race (fewer than
 * 3 teams, or the league already has a fixed top-2).
 */
export function finalissimaOdds(detail: EditionDetail): TeamOdds[] {
  const teams = detail.teams;
  if (teams.length < 3) return [];

  const league = leagueMatches(detail.matches);
  const pending = league.filter((m) => m.status === 'PENDING');
  if (pending.length === 0) return []; // top-2 already settled

  // Base table from matches already played.
  const base = new Map<number, OddsAcc>();
  for (const t of teams) {
    base.set(t.id, { points: 0, goalsFor: 0, goalsAgainst: 0, name: t.name });
  }
  for (const m of league) {
    if (m.status !== 'PLAYED') continue;
    const h = base.get(m.homeTeam.id);
    const a = base.get(m.awayTeam.id);
    if (!h || !a) continue;
    const hs = m.homeScore ?? 0;
    const as = m.awayScore ?? 0;
    h.goalsFor += hs;
    h.goalsAgainst += as;
    a.goalsFor += as;
    a.goalsAgainst += hs;
    if (hs > as) h.points += 3;
    else if (as > hs) a.points += 3;
    else {
      h.points += 1;
      a.points += 1;
    }
  }

  // Seed from the current state so identical data always yields identical odds.
  let seed = 0x811c9dc5;
  const mix = (n: number) => {
    seed ^= n | 0;
    seed = Math.imul(seed, 0x01000193);
  };
  for (const t of teams) {
    const a = base.get(t.id)!;
    mix(t.id);
    mix(a.points);
    mix(a.goalsFor);
    mix(a.goalsAgainst);
  }
  for (const m of pending) mix(m.id);
  const rand = mulberry32(seed);

  const top2 = new Map<number, number>();
  for (const t of teams) top2.set(t.id, 0);

  for (let s = 0; s < SIMULATIONS; s++) {
    const acc = new Map<number, OddsAcc>();
    for (const [id, v] of base) acc.set(id, { ...v });

    for (const m of pending) {
      const h = acc.get(m.homeTeam.id)!;
      const a = acc.get(m.awayTeam.id)!;
      const homeWins = rand() < 0.5;
      // A plausible winning scoreline just to break goal-difference ties.
      const loserGoals = Math.floor(rand() * 5); // 0..4
      const winnerGoals = loserGoals + 1 + Math.floor(rand() * 5); // +1..+5
      if (homeWins) {
        h.goalsFor += winnerGoals;
        h.goalsAgainst += loserGoals;
        a.goalsFor += loserGoals;
        a.goalsAgainst += winnerGoals;
        h.points += 3;
      } else {
        a.goalsFor += winnerGoals;
        a.goalsAgainst += loserGoals;
        h.goalsFor += loserGoals;
        h.goalsAgainst += winnerGoals;
        a.points += 3;
      }
    }

    const ranked = [...acc.entries()].sort((x, y) => compareAcc(x[1], y[1]));
    top2.set(ranked[0][0], (top2.get(ranked[0][0]) ?? 0) + 1);
    top2.set(ranked[1][0], (top2.get(ranked[1][0]) ?? 0) + 1);
  }

  return teams
    .map((t) => ({
      teamId: t.id,
      teamName: t.name,
      probability: (top2.get(t.id) ?? 0) / SIMULATIONS,
    }))
    .sort((a, b) => b.probability - a.probability || a.teamName.localeCompare(b.teamName));
}
