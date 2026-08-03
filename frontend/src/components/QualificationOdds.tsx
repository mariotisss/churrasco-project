import { useMemo } from 'react';
import type { EditionDetail } from '../api/types';
import { hasSemifinals, oddsSpots, qualificationOdds } from '../lib/tournament';
import TeamCrest from './TeamCrest';

/** Human-friendly percentage: keeps the extremes honest (<1% / >99%). */
function formatPct(p: number): string {
  if (p <= 0) return '0%';
  if (p >= 1) return '100%';
  if (p < 0.005) return '<1%';
  if (p > 0.995) return '>99%';
  return `${Math.round(p * 100)}%`;
}

export default function QualificationOdds({ detail }: { detail: EditionDetail }) {
  const odds = useMemo(() => qualificationOdds(detail), [detail]);
  if (odds.length === 0) return null;

  const spots = oddsSpots(detail);
  const semis = hasSemifinals(detail);
  const max = Math.max(...odds.map((o) => o.probability), 0.0001);

  // With everyone already in the playoffs the race is for the top seed: the 1st picks
  // the side of the table (and, with semifinals, the easiest tie).
  const seedRace = spots === 1;
  const title = seedRace
    ? 'Opciones de acabar 1º'
    : semis
      ? 'Opciones de semifinales'
      : 'Opciones de Finalissima';
  const subtitle = seedRace
    ? `Probabilidad de ganar la liga y elegir lado ${semis ? 'en semifinales' : 'en la Finalissima'}`
    : `Probabilidad de acabar entre los ${spots} primeros`;

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="lower-third">{title}</h2>
          <p className="mt-1.5 pl-4 font-condensed text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            {subtitle}
          </p>
        </div>
      </div>

      <ul className="space-y-2.5">
        {odds.map((team, i) => {
          const qualifies = i < spots;
          const width = Math.max((team.probability / max) * 100, team.probability > 0 ? 4 : 0);
          return (
            <li key={team.teamId} className="flex items-center gap-3">
              <div className="flex min-w-0 flex-[1.4] items-center gap-2.5">
                <TeamCrest name={team.teamName} size="sm" />
                <span
                  className={`min-w-0 truncate text-[15px] ${
                    qualifies ? 'font-semibold text-zinc-100' : 'font-medium text-zinc-300'
                  }`}
                >
                  {team.teamName}
                </span>
              </div>
              <div className="flex flex-[2] items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-coal-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      qualifies
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        : 'bg-gradient-to-r from-ember-600 to-ember-500'
                    }`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span
                  className={`w-12 shrink-0 text-right font-display text-lg leading-none tabular-nums ${
                    qualifies ? 'text-emerald-300' : 'text-zinc-300'
                  }`}
                >
                  {formatPct(team.probability)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 border-t border-coal-700/70 pt-3 font-condensed text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
        Estimado con 5.000 simulaciones de los partidos restantes
      </p>
    </div>
  );
}
