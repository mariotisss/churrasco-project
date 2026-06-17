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
 * otherwise the most recently created.
 */
export function featuredEditionId(editions: EditionSummary[]): number | null {
  if (editions.length === 0) return null;
  const byNewest = [...editions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const live = byNewest.find(
    (e) => e.status === 'IN_PROGRESS' || e.status === 'TEAMS_DRAWN',
  );
  return (live ?? byNewest[0]).id;
}

/** Finished editions that crowned a champion, newest first. */
export function palmares(editions: EditionSummary[]): EditionSummary[] {
  return editions
    .filter((e) => e.champion)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
