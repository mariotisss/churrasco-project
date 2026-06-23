import type { EditionDetail } from '../api/types';
import { leagueProgress } from '../lib/tournament';
import TeamCrest from './TeamCrest';

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

function StageLabel({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'ember' }) {
  return (
    <p
      className={`mb-2.5 font-condensed text-[11px] font-bold uppercase tracking-broadcast ${
        tone === 'ember' ? 'text-ember-400' : 'text-zinc-500'
      }`}
    >
      {children}
    </p>
  );
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mx-auto my-1 h-5 w-5 shrink-0 rotate-90 text-ember-500/60 lg:my-0 lg:rotate-0"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function SeedCard({
  seed,
  name,
  points,
  isChampion,
}: {
  seed: number;
  name: string | null;
  points?: number;
  isChampion?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
        isChampion
          ? 'border-emerald-500/50 bg-emerald-500/10'
          : 'border-coal-700/60 bg-coal-950/50'
      }`}
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-coal-800 font-condensed text-xs font-bold text-zinc-400">
        {seed}
      </span>
      {name ? (
        <>
          <TeamCrest name={name} size="sm" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-100">
            {name}
          </span>
          {points !== undefined && (
            <span className="font-condensed text-xs font-bold uppercase tracking-wide text-ember-300">
              {points} pts
            </span>
          )}
        </>
      ) : (
        <span className="font-condensed text-sm font-semibold uppercase tracking-wide text-zinc-600">
          Por definir
        </span>
      )}
    </div>
  );
}

export default function RoadToFinal({ detail }: { detail: EditionDetail }) {
  const s0 = detail.standings[0] ?? null;
  const s1 = detail.standings[1] ?? null;
  const fin = detail.finalissima;
  const champ = detail.champion;

  // The final phase (finalists + champion) only makes sense once the league is over.
  const { played, total } = leagueProgress(detail);
  const leagueDone = total > 0 && played === total;
  const showFinalists = leagueDone || !!fin;

  const homeName = showFinalists ? fin?.homeTeam.name ?? s0?.teamName ?? null : null;
  const awayName = showFinalists ? fin?.awayTeam.name ?? s1?.teamName ?? null : null;
  const decided = fin?.status === 'PLAYED';

  return (
    <div className="panel p-5 sm:p-6">
      <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
        {/* Qualifiers */}
        <div className="min-w-0 flex-1">
          <StageLabel>Clasificados · Liga</StageLabel>
          <div className="space-y-2.5">
            <SeedCard
              seed={1}
              name={s0?.teamName ?? null}
              points={s0?.points}
              isChampion={!!champ && champ.id === s0?.teamId}
            />
            <SeedCard
              seed={2}
              name={s1?.teamName ?? null}
              points={s1?.points}
              isChampion={!!champ && champ.id === s1?.teamId}
            />
          </div>
        </div>

        <Chevron />

        {/* Finalissima */}
        <div className="min-w-0 flex-1">
          <StageLabel tone={showFinalists ? 'ember' : 'default'}>Finalissima</StageLabel>
          {showFinalists ? (
            <div className="rounded-xl border border-ember-500/40 bg-gradient-to-b from-ember-500/10 to-coal-950/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <TeamCrest name={homeName ?? '—'} size="sm" />
                  <span className="truncate text-[13px] font-semibold text-zinc-200">
                    {homeName ?? 'Por definir'}
                  </span>
                </span>
                {decided ? (
                  <span className="scoreboard text-base">
                    <span>{fin!.homeScore}</span>
                    <span className="text-coal-600">:</span>
                    <span>{fin!.awayScore}</span>
                  </span>
                ) : (
                  <span className="font-display text-sm text-ember-400">VS</span>
                )}
                <span className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
                  <span className="truncate text-[13px] font-semibold text-zinc-200">
                    {awayName ?? 'Por definir'}
                  </span>
                  <TeamCrest name={awayName ?? '—'} size="sm" />
                </span>
              </div>
              {!decided && (
                <p className="mt-2 text-center font-condensed text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Por jugar
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-coal-600 bg-coal-950/40 p-3">
              <div className="flex items-center justify-center gap-2 py-1">
                <LockIcon className="h-4 w-4 text-zinc-600" />
                <span className="font-condensed text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Se define al terminar la liga
                </span>
              </div>
              <p className="mt-1 text-center font-condensed text-[11px] font-semibold uppercase tracking-wide tabular-nums text-zinc-600">
                {played}/{total} partidos jugados
              </p>
            </div>
          )}
        </div>

        <Chevron />

        {/* Champion */}
        <div className="min-w-0 flex-1">
          <StageLabel tone={champ ? 'default' : 'default'}>Campeón</StageLabel>
          {champ ? (
            <div className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-emerald-500/50 bg-gradient-to-br from-emerald-500/20 to-coal-950/50 px-3 py-3 shadow-glow-sm">
              <span className="relative text-2xl">🏆</span>
              <span className="relative min-w-0 truncate font-display text-xl uppercase leading-none tracking-tight text-white">
                {champ.name}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-coal-600 bg-coal-950/40 px-3 py-3">
              <span className="text-2xl opacity-40 grayscale">🏆</span>
              <span className="font-condensed text-sm font-semibold uppercase tracking-wide text-zinc-600">
                Por decidir
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
