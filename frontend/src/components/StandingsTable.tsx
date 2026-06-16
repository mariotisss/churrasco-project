import type { StandingRow } from '../api/types';

export default function StandingsTable({ rows }: { rows: StandingRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-stone-500">Sin clasificación todavía.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Equipo</th>
            <th className="px-2 py-2 text-center" title="Partidos jugados">PJ</th>
            <th className="px-2 py-2 text-center" title="Ganados">V</th>
            <th className="px-2 py-2 text-center" title="Empatados">E</th>
            <th className="px-2 py-2 text-center" title="Perdidos">D</th>
            <th className="px-2 py-2 text-center" title="Diferencia de goles">DG</th>
            <th className="px-2 py-2 text-center font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const top2 = row.position <= 2;
            return (
              <tr
                key={row.teamId}
                className={`border-b border-stone-100 last:border-0 ${top2 ? 'bg-ember-50/60' : ''}`}
              >
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                      top2 ? 'bg-ember-500 text-white' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {row.position}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium text-stone-800">{row.teamName}</td>
                <td className="px-2 py-2 text-center">{row.played}</td>
                <td className="px-2 py-2 text-center">{row.won}</td>
                <td className="px-2 py-2 text-center">{row.drawn}</td>
                <td className="px-2 py-2 text-center">{row.lost}</td>
                <td className="px-2 py-2 text-center">
                  {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                </td>
                <td className="px-2 py-2 text-center font-bold text-stone-900">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-3 py-2 text-xs text-stone-400">Los 2 primeros disputan la Finalissima.</p>
    </div>
  );
}
