import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDeleteEdition, useEdition } from '../api/hooks';
import { apiErrorMessage } from '../api/client';
import type { EditionDetail, TeamDto } from '../api/types';
import {
  LEG_LABELS,
  formByTeam,
  leagueProgress,
  nextPendingMatch,
  playoffSpots,
} from '../lib/tournament';
import StatusBadge from '../components/StatusBadge';
import TestBadge from '../components/TestBadge';
import StandingsTable from '../components/StandingsTable';
import FixturesList, { MatchRow } from '../components/FixturesList';
import FinalissimaBox from '../components/FinalissimaBox';
import TeamDrawPanel from '../components/TeamDrawPanel';
import DrawRevealOverlay from '../components/DrawRevealOverlay';
import TeamCrest from '../components/TeamCrest';
import TeamLineup from '../components/TeamLineup';
import RoadToFinal from '../components/RoadToFinal';
import QualificationOdds from '../components/QualificationOdds';
import DeleteEditionDialog from '../components/DeleteEditionDialog';
import { SideCard, sidesForMatch } from '../components/MatchSide';

type Tab = 'resumen' | 'clasificacion' | 'partidos' | 'equipos';

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'clasificacion', label: 'Clasificación' },
  { id: 'partidos', label: 'Partidos' },
  { id: 'equipos', label: 'Equipos' },
];

export default function EditionDetailPage() {
  const { id } = useParams();
  const editionId = Number(id);
  const { data: edition, isLoading, isError } = useEdition(editionId);
  const [tab, setTab] = useState<Tab>('resumen');
  // Freshly drawn edition pending its broadcast-style team reveal.
  const [reveal, setReveal] = useState<EditionDetail | null>(null);

  if (Number.isNaN(editionId)) {
    return <Notice tone="error">Edición no válida.</Notice>;
  }
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-2xl border border-coal-700/60 bg-coal-900/50" />
        <div className="h-72 animate-pulse rounded-2xl border border-coal-700/60 bg-coal-900/50" />
      </div>
    );
  }
  if (isError || !edition) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Notice tone="error">No se pudo cargar la edición.</Notice>
      </div>
    );
  }

  const { played, total } = leagueProgress(edition);
  const hasTeams = edition.teams.length > 0;

  return (
    <div className="animate-fade-in space-y-6">
      {reveal && (
        <DrawRevealOverlay
          teams={reveal.teams}
          satOutPlayer={reveal.satOutPlayer}
          onClose={() => {
            setReveal(null);
            setTab('equipos');
          }}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <BackLink />
        <DeleteEditionButton edition={edition} />
      </div>

      {/* Scoreboard header */}
      <section className="panel px-6 py-7 sm:px-9">
        <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-50" />
        <div className="pointer-events-none absolute inset-0 bg-ember-radial" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow">Match Center</p>
              <StatusBadge status={edition.status} />
              {edition.test && <TestBadge />}
            </div>
            <h1 className="mt-2 font-display text-4xl uppercase leading-none tracking-tight text-white sm:text-5xl">
              {edition.name}
            </h1>
            {edition.test && (
              <p className="mt-2 max-w-prose font-condensed text-sm font-semibold uppercase tracking-wide text-sky-300/90">
                Edición de prueba · no afecta a la clasificación histórica
              </p>
            )}
            {edition.status === 'FINISHED' && edition.champion && (
              <p className="mt-2.5 inline-flex items-center gap-2 font-condensed text-sm font-bold uppercase tracking-wide text-emerald-300">
                🏆 Campeón: {edition.champion.name}
              </p>
            )}
          </div>
          {hasTeams && (
            <div className="flex flex-wrap gap-2">
              <Stat label="Equipos" value={edition.teams.length} />
              <Stat label="Partidos" value={total} />
              <Stat label="Jugados" value={`${played}/${total}`} tone="ember" />
            </div>
          )}
        </div>
      </section>

      {!hasTeams ? (
        /* Pre-tournament: draw is the whole show */
        <div className="grid gap-6 lg:grid-cols-2">
          <TeamDrawPanel edition={edition} onDrawn={setReveal} />
          <Notice tone="muted">
            Sortea los equipos para generar la liga, la clasificación y el camino a la Finalissima.
          </Notice>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-coal-700/60 bg-coal-900/70 p-1 shadow-inset-hi">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-lg px-4 py-2 font-condensed text-sm font-bold uppercase tracking-wide transition ${
                  tab === t.id
                    ? 'bg-gradient-to-b from-ember-500 to-ember-600 text-white shadow-glow-sm'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'resumen' && (
            <div className="animate-fade-in space-y-6">
              <div>
                <h2 className="lower-third mb-3">Camino al título</h2>
                <RoadToFinal detail={edition} />
              </div>
              <QualificationOdds detail={edition} />
              <NextUpAndFinal edition={edition} />
            </div>
          )}

          {tab === 'clasificacion' && (
            <div className="animate-fade-in">
              <StandingsTable
                rows={edition.standings}
                form={formByTeam(edition.standings, edition.matches)}
                qualifyingSpots={playoffSpots(edition)}
              />
            </div>
          )}

          {tab === 'partidos' && (
            <div className="animate-fade-in">
              {/* The Finalissima has its own box in the summary, so it stays out of the list. */}
              <FixturesList
                matches={edition.matches.filter((m) => m.leg !== 'FINAL')}
                editionId={edition.id}
              />
            </div>
          )}

          {tab === 'equipos' && (
            <div className="animate-fade-in grid gap-6 lg:grid-cols-2">
              <TeamDrawPanel edition={edition} onDrawn={setReveal} />
              <TeamsList teams={edition.teams} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NextUpAndFinal({ edition }: { edition: EditionDetail }) {
  const next = nextPendingMatch(edition.matches);
  const fin = edition.finalissima;
  const finalPending = fin && fin.status !== 'PLAYED';
  // Once the league is over the ladder is what's next, and it needs its scores. Each rung
  // only shows up when the one below it has been played, so at most one is ever pending.
  const playoffsPending = edition.playoffs.some((m) => m.status !== 'PLAYED');

  if (!next && !playoffsPending && !finalPending) return null;

  return (
    <div className="space-y-6">
      {next && (
        <div>
          <h2 className="lower-third mb-3">Próximo partido</h2>
          <div className="panel flex flex-wrap items-center justify-center gap-x-3 gap-y-2 p-5">
            {(() => {
              const sides = sidesForMatch(next);
              return (
                <>
                  <SideCard
                    side={sides?.home ?? null}
                    edge="left"
                    className="flex min-w-0 items-center gap-2 py-1.5 pl-2.5 pr-3"
                  >
                    <TeamCrest name={next.homeTeam.name} players={[next.homeTeam.player1, next.homeTeam.player2]} size="md" />
                    <span className="truncate text-[15px] font-semibold text-zinc-100">
                      {next.homeTeam.name}
                    </span>
                  </SideCard>
                  <span className="font-display text-lg text-ember-400">VS</span>
                  <SideCard
                    side={sides?.away ?? null}
                    edge="right"
                    className="flex min-w-0 items-center gap-2 py-1.5 pl-3 pr-2.5"
                  >
                    <span className="truncate text-[15px] font-semibold text-zinc-100">
                      {next.awayTeam.name}
                    </span>
                    <TeamCrest name={next.awayTeam.name} players={[next.awayTeam.player1, next.awayTeam.player2]} size="md" />
                  </SideCard>
                </>
              );
            })()}
          </div>
        </div>
      )}
      {playoffsPending && (
        <div>
          <h2 className="lower-third mb-3">Eliminatorias</h2>
          <p className="mb-3 font-condensed text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            El 4º visita al 3º, el ganador al 2º y el que sobreviva al 1º · el mejor clasificado
            elige lado
          </p>
          <div className="space-y-4">
            {edition.playoffs.map((match) => (
              <div key={match.id}>
                <h3 className="mb-1.5 font-condensed text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                  {LEG_LABELS[match.leg]}
                </h3>
                <ul className="panel divide-y divide-coal-800/70">
                  <MatchRow match={match} editionId={edition.id} />
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      {finalPending && (
        <div>
          <h2 className="lower-third mb-3">La Finalissima</h2>
          <FinalissimaBox
            finalissima={fin!}
            champion={edition.champion}
            editionId={edition.id}
          />
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'ember';
}) {
  return (
    <div className="rounded-xl border border-coal-700/60 bg-coal-950/50 px-3.5 py-2 text-center shadow-inset-hi">
      <p
        className={`font-display text-xl leading-none tabular-nums ${
          tone === 'ember' ? 'text-ember-400' : 'text-white'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 font-condensed text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
    </div>
  );
}

function TeamsList({ teams }: { teams: TeamDto[] }) {
  return (
    <div className="panel p-5">
      <h2 className="lower-third mb-4">Plantillas</h2>
      <ul className="space-y-3">
        {teams.map((team, i) => (
          <li
            key={team.id}
            style={{ animationDelay: `${i * 70}ms` }}
            className="animate-rise rounded-xl border border-coal-700/50 bg-coal-950/40 p-3 transition hover:border-coal-600"
          >
            <div className="mb-2.5 flex items-center gap-2.5">
              <TeamCrest name={team.name} players={[team.player1, team.player2]} size="md" />
              <p className="truncate text-[15px] font-semibold text-zinc-100">{team.name}</p>
            </div>
            <TeamLineup front={team.player1} back={team.player2} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Notice({ tone, children }: { tone: 'error' | 'muted'; children: React.ReactNode }) {
  const styles =
    tone === 'error'
      ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
      : 'border-dashed border-coal-600 bg-coal-900/40 text-zinc-400';
  return (
    <div className={`flex items-center justify-center rounded-2xl border px-5 py-8 text-center text-sm ${styles}`}>
      {children}
    </div>
  );
}

function DeleteEditionButton({ edition }: { edition: EditionDetail }) {
  const navigate = useNavigate();
  const deleteEdition = useDeleteEdition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function confirmDelete() {
    setError(null);
    deleteEdition.mutate(edition.id, {
      onSuccess: () => navigate('/'),
      onError: (err) => setError(apiErrorMessage(err)),
    });
  }

  return (
    <>
      <button
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        className="rounded-lg border border-coal-700 px-3 py-1.5 font-condensed text-sm font-semibold uppercase tracking-wide text-zinc-400 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
      >
        Borrar edición
      </button>
      <DeleteEditionDialog
        open={confirming}
        edition={edition}
        loading={deleteEdition.isPending}
        error={error}
        onConfirm={confirmDelete}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}

function BackLink() {
  return (
    <Link to="/" className="btn-ghost -ml-3 w-fit">
      ← Volver a ediciones
    </Link>
  );
}
