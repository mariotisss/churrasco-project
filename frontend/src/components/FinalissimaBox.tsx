import type { MatchDto, TeamRef } from '../api/types';
import { MatchRow } from './FixturesList';

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
    <div className="rounded-xl border-2 border-ember-300 bg-gradient-to-br from-ember-50 to-amber-50 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl">🔥</span>
        <h2 className="text-lg font-bold text-ember-800">Finalissima</h2>
      </div>

      {decided && champion ? (
        <div className="space-y-3">
          <div className="text-center text-sm tabular-nums text-stone-600">
            {finalissima.homeTeam.name} <strong>{finalissima.homeScore}</strong>
            {' - '}
            <strong>{finalissima.awayScore}</strong> {finalissima.awayTeam.name}
          </div>
          <div className="rounded-lg bg-emerald-100 px-4 py-3 text-center">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Campeón</p>
            <p className="text-xl font-extrabold text-emerald-800">🏆 {champion.name}</p>
          </div>
        </div>
      ) : (
        <MatchRow match={finalissima} editionId={editionId} />
      )}
    </div>
  );
}
