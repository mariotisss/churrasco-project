import type { MatchDto, TeamRef } from '../api/types';
import { MatchRow } from './FixturesList';
import TeamCrest from './TeamCrest';

export default function FinalissimaBox({
  finalissima,
  champion,
  editionId,
}: {
  finalissima: MatchDto;
  champion: TeamRef | null;
  editionId: number;
}) {
  const decided = finalissima.status === 'PLAYED';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-ember-500/40 bg-gradient-to-b from-coal-850/90 to-coal-900/95 shadow-card">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ember-400/40 to-transparent" />

      <div className="relative p-5">
        <div className="mb-5 border-l-2 border-ember-500 pl-3">
          <h2 className="font-display text-2xl uppercase leading-none tracking-tight text-white">
            Finalissima
          </h2>
          <p className="mt-1 font-condensed text-[11px] font-semibold uppercase tracking-broadcast text-ember-400/90">
            El partido por el título
          </p>
        </div>

        {decided && champion ? (
          <div className="space-y-4">
            {/* Final scoreline */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-coal-700/60 bg-coal-950/50 px-4 py-3">
              <span className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
                <span className="truncate text-sm font-semibold text-zinc-200">
                  {finalissima.homeTeam.name}
                </span>
                <TeamCrest name={finalissima.homeTeam.name} size="sm" />
              </span>
              <span className="scoreboard text-xl">
                <span>{finalissima.homeScore}</span>
                <span className="text-coal-600">:</span>
                <span>{finalissima.awayScore}</span>
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <TeamCrest name={finalissima.awayTeam.name} size="sm" />
                <span className="truncate text-sm font-semibold text-zinc-200">
                  {finalissima.awayTeam.name}
                </span>
              </span>
            </div>

            {/* Champion reveal */}
            <div className="relative overflow-hidden rounded-xl border border-emerald-500/40 bg-gradient-to-b from-emerald-500/15 to-emerald-500/5 px-4 py-5 text-center">
              <p className="font-condensed text-xs font-bold uppercase tracking-broadcast text-emerald-400">
                Campeón
              </p>
              <p className="mt-2 flex items-center justify-center gap-2 font-display text-3xl uppercase leading-none tracking-tight text-white">
                <span>🏆</span>
                {champion.name}
              </p>
            </div>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-coal-700/60 bg-coal-950/40">
            <MatchRow match={finalissima} editionId={editionId} />
          </ul>
        )}
      </div>
    </div>
  );
}
