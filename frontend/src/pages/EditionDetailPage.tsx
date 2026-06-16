import { Link, useParams } from 'react-router-dom';
import { useEdition } from '../api/hooks';
import type { EditionDetail, TeamDto } from '../api/types';
import StatusBadge from '../components/StatusBadge';
import StandingsTable from '../components/StandingsTable';
import FixturesList from '../components/FixturesList';
import FinalissimaBox from '../components/FinalissimaBox';
import TeamDrawPanel from '../components/TeamDrawPanel';

export default function EditionDetailPage() {
  const { id } = useParams();
  const editionId = Number(id);
  const { data: edition, isLoading, isError } = useEdition(editionId);

  if (Number.isNaN(editionId)) {
    return <p className="text-sm text-red-600">Edición no válida.</p>;
  }
  if (isLoading) {
    return <p className="text-sm text-stone-500">Cargando edición…</p>;
  }
  if (isError || !edition) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">No se pudo cargar la edición.</p>
        <BackLink />
      </div>
    );
  }

  const leagueMatches = edition.matches.filter((m) => !m.finalissima);
  const hasTeams = edition.teams.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-stone-800">{edition.name}</h1>
          <StatusBadge status={edition.status} />
        </div>
        <BackLink />
      </div>

      {edition.status === 'FINISHED' && edition.champion && (
        <div className="rounded-lg bg-emerald-100 px-4 py-3 text-center text-emerald-800">
          🏆 Campeón de la edición: <strong>{edition.champion.name}</strong>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {hasTeams ? (
            <>
              <section>
                <h2 className="mb-2 font-semibold text-stone-800">Clasificación</h2>
                <StandingsTable rows={edition.standings} />
              </section>
              <section>
                <h2 className="mb-2 font-semibold text-stone-800">Partidos</h2>
                <FixturesList matches={leagueMatches} editionId={edition.id} />
              </section>
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
              Sortea los equipos para generar el cuadro.
            </p>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <TeamDrawPanel edition={edition} />
          {hasTeams && <TeamsList teams={edition.teams} />}
          {edition.finalissima && (
            <FinalissimaBox
              finalissima={edition.finalissima}
              champion={edition.champion}
              editionId={edition.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TeamsList({ teams }: { teams: TeamDto[] }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <h2 className="mb-2 font-semibold text-stone-800">Equipos</h2>
      <ul className="space-y-2">
        {teams.map((team) => (
          <li key={team.id} className="rounded border border-stone-100 bg-stone-50 px-3 py-2 text-sm">
            <span className="font-medium text-stone-800">{team.name}</span>
            <span className="ml-2 text-stone-400">
              ({team.player1.name}, {team.player2.name})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/" className="text-sm text-ember-600 hover:text-ember-700">
      ← Ediciones
    </Link>
  );
}
