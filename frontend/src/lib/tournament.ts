// Derived views over the tournament data. The backend only gives us raw
// matches + standings, so anything "broadcast-y" (next fixture, form guide,
// what to feature on the home page) is computed here from existing fields.

import type {
  EditionDetail,
  EditionSummary,
  MatchDto,
  PlayerRef,
  StandingRow,
} from '../api/types';

const LEG_ORDER: Record<string, number> = { IDA: 0, VUELTA: 1, SEMIFINAL: 2, FINAL: 3 };

/** Teams that reach the semifinals in the single-round format. */
const SEMIFINAL_SPOTS = 4;

/** League matches only (everything except the semifinals and the Finalissima). */
export function leagueMatches(matches: MatchDto[]): MatchDto[] {
  return matches.filter((m) => !m.playoff);
}

/**
 * Whether this edition's league is followed by semifinals (1º-4º, 2º-3º). Only the
 * single-round format uses them, and only with enough teams to fill the bracket —
 * the same rule the backend enforces when drawing.
 */
export function hasSemifinals(detail: EditionDetail): boolean {
  return !detail.roundTrip && detail.teams.length >= SEMIFINAL_SPOTS;
}

/** How many teams the league qualifies: the top 4 (semifinals) or the top 2 (final). */
export function playoffSpots(detail: EditionDetail): number {
  return hasSemifinals(detail) ? SEMIFINAL_SPOTS : 2;
}

/**
 * The places the league is actually racing for. Normally the playoff spots, but when
 * every team qualifies (4 teams, 4 semifinal places) nobody is fighting to get in:
 * what's at stake is finishing 1st, which picks the easiest tie and chooses the side.
 */
export function oddsSpots(detail: EditionDetail): number {
  const spots = playoffSpots(detail);
  return detail.teams.length > spots ? spots : 1;
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

/** Futbolín has no draws: a match is a win or a loss, never anything in between. */
export type FormResult = 'W' | 'L';

/** Recent results for a team, oldest → newest, capped at `limit`. */
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
      return gf > ga ? ('W' as const) : ('L' as const);
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

// ---- Qualification odds ----------------------------------------------------
// The league qualifies its top teams for the playoffs (top 4 to the semifinals, or
// top 2 straight to the Finalissima) — or, when everyone is already in, it is the top
// seed that's at stake. Nothing can end in a draw (the backend rejects it), so every
// pending fixture has exactly two outcomes and the rest of the league is a finite set
// of 2^pending combinations. When that set is small enough we walk *all* of it and the
// odds are exact; only for the biggest leagues do we fall back to sampling.
//
// A combination fixes who wins each match, not the scorelines, so teams that end level
// on points are genuinely unresolved: the goal-difference tie-break depends on goals
// nobody has scored yet. Those combinations split the contested places evenly among the
// tied teams instead of pretending we know the answer.

export interface TeamOdds {
  teamId: number;
  teamName: string;
  /** The pair, so the crest can show their faces. */
  players: [PlayerRef, PlayerRef];
  /** Probability of ending up in one of the places at stake, 0..1. */
  probability: number;
}

/** The odds plus how they were obtained, so the UI can say what it is showing. */
export interface OddsReport {
  teams: TeamOdds[];
  /** League fixtures still to play. */
  pendingMatches: number;
  /** Exactly how many ways the rest of the league can play out: 2^pendingMatches. */
  combinations: bigint;
  /** True when every combination was counted; false when they were sampled. */
  exact: boolean;
  /** Combinations actually evaluated (equal to `combinations` when exact). */
  evaluated: number;
}

/** Above this many combinations we sample instead of enumerating (2^20 ≈ 1M). */
const EXACT_LIMIT = 20;

/** Combinations drawn at random when the full set is too large to walk. */
const SAMPLES = 20000;

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
 * Hands out the places at stake for one combination. Teams clear of the cut-off take a
 * whole place; teams level on points at the cut-off share what is left between them,
 * because a combination says who wins, not by how much.
 */
function creditScenario(
  points: Int32Array,
  top: Int32Array,
  spots: number,
  credit: Float64Array,
): void {
  // `top` keeps the highest `spots` point totals, ascending, so top[0] ends up being
  // the tally of the last qualifying place. Cheaper than sorting the whole table, and
  // this runs once per combination.
  top.fill(-1);
  for (let i = 0; i < points.length; i++) {
    const v = points[i];
    if (v <= top[0]) continue;
    let j = 0;
    while (j + 1 < spots && top[j + 1] < v) {
      top[j] = top[j + 1];
      j++;
    }
    top[j] = v;
  }
  const cutoff = top[0];

  let above = 0;
  let tied = 0;
  for (let i = 0; i < points.length; i++) {
    if (points[i] > cutoff) above++;
    else if (points[i] === cutoff) tied++;
  }
  const share = (spots - above) / tied;

  for (let i = 0; i < points.length; i++) {
    if (points[i] > cutoff) credit[i] += 1;
    else if (points[i] === cutoff) credit[i] += share;
  }
}

/**
 * Probability that each team ends up in the places at stake (see {@link oddsSpots}),
 * given the results so far and the fixtures still to play — exact whenever the number
 * of possible combinations is small enough to enumerate. Teams come back sorted by
 * probability (highest first); `teams` is empty once the league is over, when there is
 * nothing left to work out.
 */
export function qualificationOdds(detail: EditionDetail): OddsReport {
  const teams = detail.teams;
  const spots = oddsSpots(detail);
  const league = leagueMatches(detail.matches);
  const pending = league.filter((m) => m.status === 'PENDING');
  const empty: OddsReport = {
    teams: [],
    pendingMatches: pending.length,
    combinations: 1n << BigInt(pending.length),
    exact: true,
    evaluated: 0,
  };
  if (teams.length < 2 || pending.length === 0) return empty;

  const index = new Map<number, number>();
  teams.forEach((t, i) => index.set(t.id, i));

  // Base table from matches already played.
  const basePoints = new Int32Array(teams.length);
  for (const m of league) {
    if (m.status !== 'PLAYED') continue;
    const h = index.get(m.homeTeam.id);
    const a = index.get(m.awayTeam.id);
    if (h === undefined || a === undefined) continue;
    const hs = m.homeScore ?? 0;
    const as = m.awayScore ?? 0;
    basePoints[hs > as ? h : a] += 3;
  }

  // Pending fixtures as index pairs; anything pointing outside this edition is ignored.
  const home: number[] = [];
  const away: number[] = [];
  for (const m of pending) {
    const h = index.get(m.homeTeam.id);
    const a = index.get(m.awayTeam.id);
    if (h === undefined || a === undefined) continue;
    home.push(h);
    away.push(a);
  }
  const n = home.length;
  if (n === 0) return empty;

  const combinations = 1n << BigInt(n);
  const exact = n <= EXACT_LIMIT;
  const credit = new Float64Array(teams.length);
  const points = new Int32Array(teams.length);
  const top = new Int32Array(spots);
  let evaluated: number;

  if (exact) {
    evaluated = 2 ** n;
    // Gray-code walk: consecutive combinations differ in a single match, so flipping
    // one result (6 points changing hands) is all it takes to move to the next one.
    const awayWins = new Uint8Array(n);
    points.set(basePoints);
    for (let i = 0; i < n; i++) points[home[i]] += 3;
    creditScenario(points, top, spots, credit);

    for (let i = 1; i < evaluated; i++) {
      const bit = 31 - Math.clz32(i & -i); // the match that flips
      const h = home[bit];
      const a = away[bit];
      if (awayWins[bit]) {
        points[a] -= 3;
        points[h] += 3;
        awayWins[bit] = 0;
      } else {
        points[h] -= 3;
        points[a] += 3;
        awayWins[bit] = 1;
      }
      creditScenario(points, top, spots, credit);
    }
  } else {
    evaluated = SAMPLES;
    // Seed from the current state so identical data always yields identical odds.
    let seed = 0x811c9dc5;
    const mix = (v: number) => {
      seed ^= v | 0;
      seed = Math.imul(seed, 0x01000193);
    };
    teams.forEach((t, i) => {
      mix(t.id);
      mix(basePoints[i]);
    });
    for (const m of pending) mix(m.id);
    const rand = mulberry32(seed);

    for (let s = 0; s < SAMPLES; s++) {
      points.set(basePoints);
      for (let i = 0; i < n; i++) points[rand() < 0.5 ? home[i] : away[i]] += 3;
      creditScenario(points, top, spots, credit);
    }
  }

  return {
    teams: teams
      .map((t, i) => ({
        teamId: t.id,
        teamName: t.name,
        players: [t.player1, t.player2] as [PlayerRef, PlayerRef],
        probability: credit[i] / evaluated,
      }))
      .sort((a, b) => b.probability - a.probability || a.teamName.localeCompare(b.teamName)),
    pendingMatches: n,
    combinations,
    exact,
    evaluated,
  };
}
