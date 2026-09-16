import { useMemo } from 'react';
import type { EditionDetail } from '../api/types';
import { hasBracket, oddsSpots, qualificationOdds } from '../lib/tournament';
import TeamCrest from './TeamCrest';
import PlayerNames from './PlayerNames';

/** Human-friendly percentage: keeps the extremes honest (<1% / >99%). */
function formatPct(p: number): string {
  if (p <= 0) return '0%';
  if (p >= 1) return '100%';
  if (p < 0.005) return '<1%';
  if (p > 0.995) return '>99%';
  return `${Math.round(p * 100)}%`;
}

const SUPERSCRIPTS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

/**
 * The combination count in full when it is readable, and as a power of ten when the
 * league is so open that the exact digits stop meaning anything.
 */
function formatCombinations(n: bigint): string {
  const digits = n.toString();
  if (digits.length <= 12) return n.toLocaleString('es-ES');

  let mantissa = Math.round(Number(digits.slice(0, 3)) / 10) / 10;
  let exponent = digits.length - 1;
  if (mantissa >= 10) {
    mantissa = 1;
    exponent++;
  }
  const sup = String(exponent)
    .split('')
    .map((d) => SUPERSCRIPTS[Number(d)])
    .join('');
  return `${mantissa.toLocaleString('es-ES', { minimumFractionDigits: 1 })} × 10${sup}`;
}

export default function QualificationOdds({ detail }: { detail: EditionDetail }) {
  const report = useMemo(() => qualificationOdds(detail), [detail]);
  const odds = report.teams;
  if (odds.length === 0) return null;

  const spots = oddsSpots(detail);
  const bracket = hasBracket(detail);
  const max = Math.max(...odds.map((o) => o.probability), 0.0001);

  // With everyone already in the playoffs the race is for the top seed, which is worth
  // the side of the table in the first match of the bracket.
  const seedRace = spots === 1;
  const combinations = formatCombinations(report.combinations);
  const matchesLeft =
    report.pendingMatches === 1 ? 'el partido que queda' : `los ${report.pendingMatches} partidos que quedan`;
  const title = seedRace
    ? 'Opciones de acabar 1º'
    : bracket
      ? 'Opciones de eliminatorias'
      : 'Opciones de Finalissima';
  const subtitle = seedRace
    ? bracket
      ? 'Probabilidad de ganar la liga y elegir lado en la cruce alto'
      : 'Probabilidad de ganar la liga y elegir lado en la Finalissima'
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
        <div className="shrink-0 rounded-md border border-coal-700/70 bg-coal-800/60 px-2.5 py-1.5 text-right">
          <div className="font-display text-base leading-none tabular-nums text-zinc-200">
            {combinations}
          </div>
          <div className="mt-1 font-condensed text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {report.combinations === 1n ? 'combinación posible' : 'combinaciones posibles'}
          </div>
        </div>
      </div>

      <ul className="space-y-2.5">
        {odds.map((team, i) => {
          const qualifies = i < spots;
          const width = Math.max((team.probability / max) * 100, team.probability > 0 ? 4 : 0);
          return (
            <li key={team.teamId} className="flex items-center gap-3">
              <div className="flex min-w-0 flex-[1.4] items-center gap-2.5">
                <TeamCrest name={team.teamName} players={team.players} size="sm" />
                <PlayerNames
                  players={team.players}
                  className={`text-sm leading-tight ${
                    qualifies ? 'font-semibold text-zinc-100' : 'font-medium text-zinc-300'
                  }`}
                />
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

      <p
        className="mt-4 border-t border-coal-700/70 pt-3 font-condensed text-[11px] font-semibold uppercase tracking-wide text-zinc-600"
        title="Los empates a puntos reparten las plazas en disputa a partes iguales: una combinación decide quién gana cada partido, no por cuánto."
      >
        {report.exact
          ? `Cálculo exacto: contadas todas las combinaciones de ${matchesLeft}`
          : `Estimado con ${report.evaluated.toLocaleString('es-ES')} combinaciones al azar de ${matchesLeft}`}
      </p>
    </div>
  );
}
