import { useState } from 'react';
import { useRecordResult } from '../api/hooks';
import { apiErrorMessage } from '../api/client';
import type { Leg, MatchDto } from '../api/types';
import TeamCrest from './TeamCrest';

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
    <div className="space-y-6">
      {legs.map((leg) => {
        const legMatches = matches.filter((m) => m.leg === leg);
        if (legMatches.length === 0) return null;
        const played = legMatches.filter((m) => m.status === 'PLAYED').length;
        const pct = Math.round((played / legMatches.length) * 100);
        return (
          <div key={leg}>
            <div className="mb-2.5 flex items-center justify-between gap-4">
              <h3 className="font-condensed text-sm font-bold uppercase tracking-[0.18em] text-zinc-300">
                {LEG_LABELS[leg]}
              </h3>
              <div className="flex items-center gap-2.5">
                <div className="h-1 w-20 overflow-hidden rounded-full bg-coal-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-ember-500 to-ember-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="font-condensed text-[11px] font-semibold uppercase tracking-wide tabular-nums text-zinc-500">
                  {played}/{legMatches.length}
                </span>
              </div>
            </div>
            <ul className="panel divide-y divide-coal-800/70">
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
    <li className="px-3 py-3 transition hover:bg-white/[0.03]">
      <div className="flex items-center gap-2">
        {/* Home team */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5 text-right">
          <span
            className={`truncate text-[15px] ${
              homeWon ? 'font-bold text-white' : 'font-medium text-zinc-300'
            }`}
          >
            {match.homeTeam.name}
          </span>
          <TeamCrest name={match.homeTeam.name} size="sm" />
        </div>

        {/* Score */}
        {editing ? (
          <div className="flex items-center gap-1.5">
            <ScoreInput value={home} onChange={setHome} />
            <span className="font-display text-zinc-600">:</span>
            <ScoreInput value={away} onChange={setAway} />
          </div>
        ) : (
          <div className="scoreboard min-w-[4.5rem] text-lg">
            <span className={homeWon ? 'text-white' : 'text-zinc-500'}>{match.homeScore}</span>
            <span className="text-coal-600">:</span>
            <span className={awayWon ? 'text-white' : 'text-zinc-500'}>{match.awayScore}</span>
          </div>
        )}

        {/* Away team */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <TeamCrest name={match.awayTeam.name} size="sm" />
          <span
            className={`truncate text-[15px] ${
              awayWon ? 'font-bold text-white' : 'font-medium text-zinc-300'
            }`}
          >
            {match.awayTeam.name}
          </span>
        </div>

        {/* Action */}
        <div className="ml-1 w-[4.75rem] shrink-0 text-right">
          {editing ? (
            <button
              onClick={save}
              disabled={recordResult.isPending}
              className="btn-primary px-3 py-1.5 text-xs"
            >
              Guardar
            </button>
          ) : (
            <button onClick={() => setEditing(true)} className="btn-ghost text-xs">
              Editar
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-1.5 text-right text-xs text-rose-400">{error}</p>}
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
      className="w-12 rounded-lg border border-coal-700 bg-coal-975 py-1.5 text-center font-display text-lg leading-none tabular-nums text-white focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/30"
    />
  );
}
