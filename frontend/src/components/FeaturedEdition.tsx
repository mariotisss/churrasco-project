import { Link } from 'react-router-dom';
import { useEdition } from '../api/hooks';
import { leagueProgress, nextPendingMatch } from '../lib/tournament';
import StatusBadge from './StatusBadge';
import TeamCrest from './TeamCrest';

export default function FeaturedEdition({ editionId }: { editionId: number }) {
  const { data: edition } = useEdition(editionId);

  if (!edition) {
    return <div className="h-56 animate-pulse rounded-3xl border border-coal-700/60 bg-coal-900/50" />;
  }

  const hasTeams = edition.teams.length > 0;
  const leader = edition.standings[0] ?? null;
  const next = nextPendingMatch(edition.matches);
  const { played, total, pct } = leagueProgress(edition);
  const finished = edition.status === 'FINISHED' && edition.champion;

  return (
    <Link
      to={`/editions/${edition.id}`}
      className="group relative block overflow-hidden rounded-3xl border border-coal-700/60 bg-gradient-to-br from-coal-850/95 via-coal-900/95 to-coal-950 p-6 shadow-card transition hover:border-ember-500/40 hover:shadow-glow sm:p-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-50" />
      <div className="pointer-events-none absolute inset-0 bg-ember-radial" />

      <div className="relative">
        <div className="flex flex-wrap items-center gap-3">
          <span className="eyebrow">Edición destacada</span>
          <StatusBadge status={edition.status} />
        </div>
        <h2 className="mt-2 font-display text-4xl uppercase leading-none tracking-tight text-white sm:text-5xl">
          {edition.name}
        </h2>

        {finished ? (
          <div className="mt-6 flex items-center gap-4 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 to-transparent px-5 py-4">
            <span className="text-3xl">🏆</span>
            <div>
              <p className="font-condensed text-xs font-bold uppercase tracking-broadcast text-emerald-400">
                Campeón
              </p>
              <p className="font-display text-2xl uppercase leading-none tracking-tight text-white">
                {edition.champion!.name}
              </p>
            </div>
          </div>
        ) : hasTeams ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {/* Leader */}
            <div className="rounded-2xl border border-coal-700/60 bg-coal-950/50 p-4">
              <p className="font-condensed text-[11px] font-bold uppercase tracking-broadcast text-zinc-500">
                Líder
              </p>
              {leader ? (
                <div className="mt-2.5 flex items-center gap-3">
                  <TeamCrest name={leader.teamName} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-white">
                      {leader.teamName}
                    </p>
                    <p className="font-condensed text-xs font-semibold uppercase tracking-wide text-ember-300">
                      {leader.points} pts · {leader.won}V {leader.drawn}E {leader.lost}D
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-2.5 text-sm text-zinc-500">Aún sin partidos</p>
              )}
            </div>

            {/* Next match */}
            <div className="rounded-2xl border border-coal-700/60 bg-coal-950/50 p-4">
              <p className="font-condensed text-[11px] font-bold uppercase tracking-broadcast text-zinc-500">
                {next ? 'Próximo partido' : 'Liga'}
              </p>
              {next ? (
                <div className="mt-2.5 flex items-center justify-center gap-3">
                  <TeamCrest name={next.homeTeam.name} size="sm" />
                  <span className="truncate text-sm font-semibold text-zinc-200">
                    {next.homeTeam.name}
                  </span>
                  <span className="font-display text-sm text-ember-400">VS</span>
                  <span className="truncate text-sm font-semibold text-zinc-200">
                    {next.awayTeam.name}
                  </span>
                  <TeamCrest name={next.awayTeam.name} size="sm" />
                </div>
              ) : (
                <p className="mt-2.5 font-condensed text-sm font-semibold uppercase tracking-wide text-emerald-300">
                  Fase de liga completa
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-6 rounded-2xl border border-dashed border-coal-600 bg-coal-950/40 px-5 py-4 text-sm text-zinc-400">
            Pendiente de sorteo — entra para repartir los equipos.
          </p>
        )}

        {/* Progress + CTA */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          {hasTeams && !finished ? (
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-coal-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-ember-500 to-ember-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="font-condensed text-xs font-semibold uppercase tracking-wide tabular-nums text-zinc-500">
                {played}/{total} jugados
              </span>
            </div>
          ) : (
            <span />
          )}
          <span className="font-condensed text-sm font-bold uppercase tracking-wider text-ember-400 transition group-hover:translate-x-0.5">
            Abrir match center →
          </span>
        </div>
      </div>
    </Link>
  );
}
