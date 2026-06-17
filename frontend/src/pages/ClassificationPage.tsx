import { usePlayerStandings } from '../api/hooks';
import type { PlayerStanding } from '../api/types';
import TeamCrest from '../components/TeamCrest';

const MEDAL: Record<number, string> = {
  1: 'bg-amber-500/20 text-amber-300 ring-amber-400/40',
  2: 'bg-zinc-400/15 text-zinc-200 ring-zinc-300/30',
  3: 'bg-orange-700/25 text-orange-300 ring-orange-500/40',
};

export default function ClassificationPage() {
  const { data: rows, isLoading } = usePlayerStandings();

  return (
    <div className="animate-fade-in space-y-8">
      <header>
        <p className="eyebrow">Ranking histórico</p>
        <h1 className="mt-2 font-display text-5xl uppercase leading-none tracking-tight text-white sm:text-6xl">
          Clasificación
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
          Puntos acumulados por cada jugador a lo largo de las ediciones:{' '}
          <span className="font-semibold text-emerald-300">campeón +2</span> ·{' '}
          <span className="font-semibold text-ember-300">subcampeón +1</span>.
        </p>
      </header>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-coal-700/60 bg-coal-900/50" />
      ) : !rows || rows.length === 0 ? (
        <div className="panel flex flex-col items-center px-6 py-16 text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-coal-800 text-3xl shadow-inset-hi">
            🏆
          </div>
          <p className="font-display text-xl uppercase tracking-tight text-zinc-200">
            Todavía no hay puntos
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Corona a un campeón en una edición para abrir el ranking.
          </p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coal-700/70 text-left font-condensed text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="py-3 pl-4 pr-2">#</th>
                  <th className="px-2 py-3">Jugador</th>
                  <th className="hidden w-20 px-2 py-3 text-center sm:table-cell" title="Ediciones ganadas">
                    🏆 Títulos
                  </th>
                  <th className="hidden w-24 px-2 py-3 text-center sm:table-cell" title="Veces subcampeón">
                    Subcamp.
                  </th>
                  <th className="w-16 px-3 py-3 text-center text-ember-300">Pts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <Row key={row.playerId} row={row} rank={i + 1} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ row, rank }: { row: PlayerStanding; rank: number }) {
  const medal = MEDAL[rank];
  return (
    <tr className="border-b border-coal-800/70 transition last:border-0 hover:bg-white/[0.03]">
      <td className="py-3 pl-4 pr-2">
        <span
          className={`inline-grid h-7 w-7 place-items-center rounded-lg font-condensed text-sm font-bold tabular-nums ${
            medal ? `${medal} ring-1` : 'text-zinc-500'
          }`}
        >
          {rank}
        </span>
      </td>
      <td className="px-2 py-3">
        <div className="flex items-center gap-2.5">
          <TeamCrest name={row.name} size="sm" />
          <span className="text-[15px] font-semibold text-zinc-100">{row.name}</span>
        </div>
      </td>
      <td className="hidden px-2 py-3 text-center tabular-nums text-zinc-300 sm:table-cell">
        {row.championships > 0 ? row.championships : <span className="text-zinc-600">—</span>}
      </td>
      <td className="hidden px-2 py-3 text-center tabular-nums text-zinc-400 sm:table-cell">
        {row.runnerUps > 0 ? row.runnerUps : <span className="text-zinc-600">—</span>}
      </td>
      <td className="px-3 py-3 text-center">
        <span className="font-display text-lg leading-none tabular-nums text-white">{row.points}</span>
      </td>
    </tr>
  );
}
