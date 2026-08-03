import { useState } from 'react';
import { useChooseSide } from '../api/hooks';
import { apiErrorMessage } from '../api/client';
import type { MatchDto, Side } from '../api/types';
import { oppositeSide, SIDE_LABEL, SideSwatch } from './MatchSide';

const SIDES: Side[] = ['ROJIBLANCO', 'AZUL'];

const SHORT_LABEL: Record<Side, string> = {
  ROJIBLANCO: 'Rojiblanco',
  AZUL: 'Azul',
};

/**
 * Side pick for a playoff match. Only the better-classified team chooses — that's
 * always the home team of the tie — and its opponent gets the other side.
 */
export default function SideChooser({
  match,
  editionId,
}: {
  match: MatchDto;
  editionId: number;
}) {
  const chooseSide = useChooseSide(editionId);
  const [error, setError] = useState<string | null>(null);
  const chosen = match.chosenSide;

  function pick(side: Side) {
    setError(null);
    chooseSide.mutate({ matchId: match.id, side }, { onError: (err) => setError(apiErrorMessage(err)) });
  }

  return (
    <div className="mt-2 rounded-lg border border-coal-700/60 bg-coal-950/40 px-2.5 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="font-condensed text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Elige lado ·{' '}
          <span className="text-zinc-300">{match.homeTeam.name}</span>
        </p>
        <div className="flex gap-1.5">
          {SIDES.map((side) => {
            const active = chosen === side;
            return (
              <button
                key={side}
                type="button"
                onClick={() => pick(side)}
                disabled={chooseSide.isPending}
                aria-pressed={active}
                title={SIDE_LABEL[side]}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition disabled:opacity-50 ${
                  active
                    ? 'border-ember-500/50 bg-ember-500/15 text-ember-200'
                    : 'border-coal-700 bg-coal-950/60 text-zinc-400 hover:border-coal-600 hover:text-zinc-200'
                }`}
              >
                <SideSwatch side={side} className="h-3.5 w-3.5 rounded-[3px] border border-white/20" />
                {SHORT_LABEL[side]}
              </button>
            );
          })}
        </div>
        {chosen && (
          <p className="font-condensed text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
            {match.awayTeam.name} → {SHORT_LABEL[oppositeSide(chosen)].toLowerCase()}
          </p>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
