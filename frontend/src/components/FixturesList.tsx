import { useState } from 'react';
import { useRecordResult } from '../api/hooks';
import { apiErrorMessage } from '../api/client';
import type { Leg, MatchDto } from '../api/types';

const LEG_LABELS: Record<Leg, string> = {
  IDA: 'Ida',
  VUELTA: 'Vuelta',
  FINAL: 'Final',
};

export default function FixturesList({
  matches,
  editionId,
}: {
  matches: MatchDto[];
  editionId: number;
}) {
  const legs: Leg[] = ['IDA', 'VUELTA'];
  return (
    <div className="space-y-4">
      {legs.map((leg) => {
        const legMatches = matches.filter((m) => m.leg === leg);
        if (legMatches.length === 0) return null;
        return (
          <div key={leg}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              {LEG_LABELS[leg]}
            </h3>
            <ul className="space-y-2">
              {legMatches.map((match) => (
                <MatchRow key={match.id} match={match} editionId={editionId} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function MatchRow({ match, editionId }: { match: MatchDto; editionId: number }) {
  const recordResult = useRecordResult(editionId);
  const played = match.status === 'PLAYED';
  const [editing, setEditing] = useState(!played);
  const [home, setHome] = useState(match.homeScore?.toString() ?? '');
  const [away, setAway] = useState(match.awayScore?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);

  function save() {
    const h = Number(home);
    const a = Number(away);
    if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) {
      setError('Marcadores no válidos');
      return;
    }
    setError(null);
    recordResult.mutate(
      { matchId: match.id, homeScore: h, awayScore: a },
      {
        onSuccess: () => setEditing(false),
        onError: (err) => setError(apiErrorMessage(err)),
      },
    );
  }

  const homeWon = played && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWon = played && (match.awayScore ?? 0) > (match.homeScore ?? 0);

  return (
    <li className="rounded-md border border-stone-200 bg-white px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`flex-1 text-right text-sm ${homeWon ? 'font-bold text-stone-900' : 'text-stone-700'}`}>
          {match.homeTeam.name}
        </span>

        {editing ? (
          <div className="flex items-center gap-1">
            <ScoreInput value={home} onChange={setHome} />
            <span className="text-stone-400">-</span>
            <ScoreInput value={away} onChange={setAway} />
          </div>
        ) : (
          <span className="min-w-[3.5rem] text-center text-sm font-bold tabular-nums text-stone-900">
            {match.homeScore} - {match.awayScore}
          </span>
        )}

        <span className={`flex-1 text-left text-sm ${awayWon ? 'font-bold text-stone-900' : 'text-stone-700'}`}>
          {match.awayTeam.name}
        </span>

        <div className="w-16 text-right">
          {editing ? (
            <button
              onClick={save}
              disabled={recordResult.isPending}
              className="rounded bg-ember-600 px-2 py-1 text-xs font-semibold text-white hover:bg-ember-700 disabled:opacity-50"
            >
              Guardar
            </button>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-stone-400 hover:text-ember-600"
            >
              Editar
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-1 text-right text-xs text-red-600">{error}</p>}
    </li>
  );
}

function ScoreInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-12 rounded border border-stone-300 px-1 py-1 text-center text-sm tabular-nums focus:border-ember-500 focus:outline-none focus:ring-1 focus:ring-ember-500"
    />
  );
}
