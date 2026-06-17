import type { StandingRow } from '../api/types';
import type { FormResult } from '../lib/tournament';
import TeamCrest from './TeamCrest';

const FORM_STYLE: Record<FormResult, string> = {
  W: 'bg-emerald-500/90 text-emerald-50',
  D: 'bg-zinc-600 text-zinc-100',
  L: 'bg-rose-500/90 text-rose-50',
};

function FormGuide({ results }: { results: FormResult[] }) {
  if (results.length === 0) {
    return <span className="text-xs text-zinc-600">—</span>;
  }
  return (
    <div className="flex items-center justify-center gap-1">
      {results.map((r, i) => (
        <span
          key={i}
          className={`grid h-5 w-5 place-items-center rounded font-condensed text-[10px] font-bold ${FORM_STYLE[r]}`}
          title={r === 'W' ? 'Victoria' : r === 'D' ? 'Empate' : 'Derrota'}
        >
          {r}
        </span>
      ))}
    </div>
  );
}

export default function StandingsTable({
  rows,
  form,
}: {
  rows: StandingRow[];
  form?: Map<number, FormResult[]>;
}) {
  if (rows.length === 0) {
    return (
      <div className="panel p-8 text-center text-sm text-zinc-500">Sin clasificación todavía.</div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-coal-700/70 text-left font-condensed text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              <th className="py-3 pl-4 pr-2">#</th>
              <th className="px-2 py-3">Equipo</th>
              {form && <th className="hidden px-2 py-3 text-center md:table-cell">Forma</th>}
              <th className="w-10 px-1 py-3 text-center" title="Partidos jugados">PJ</th>
              <th className="w-10 px-1 py-3 text-center" title="Ganados">V</th>
              <th className="w-10 px-1 py-3 text-center" title="Empatados">E</th>
              <th className="w-10 px-1 py-3 text-center" title="Perdidos">D</th>
              <th className="w-12 px-1 py-3 text-center" title="Diferencia de goles">DG</th>
              <th className="w-14 px-3 py-3 text-center text-ember-300">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const top2 = row.position <= 2;
              return (
                <tr
                  key={row.teamId}
                  className={`group border-b border-coal-800/70 transition last:border-0 hover:bg-white/[0.03] ${
                    top2 ? 'bg-emerald-500/[0.05]' : ''
                  }`}
                >
                  <td className="relative py-3 pl-4 pr-2">
                    {top2 && (
                      <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />
                    )}
                    <span
                      className={`inline-grid h-7 w-7 place-items-center rounded-lg font-condensed text-sm font-bold tabular-nums ${
                        top2
                          ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30'
                          : 'text-zinc-500'
                      }`}
                    >
                      {row.position}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2.5">
                      <TeamCrest name={row.teamName} size="sm" />
                      <span className="text-[15px] font-semibold text-zinc-100">
                        {row.teamName}
                      </span>
                    </div>
                  </td>
                  {form && (
                    <td className="hidden px-2 py-3 md:table-cell">
                      <FormGuide results={form.get(row.teamId) ?? []} />
                    </td>
                  )}
                  <td className="px-1 py-3 text-center tabular-nums text-zinc-400">{row.played}</td>
                  <td className="px-1 py-3 text-center font-semibold tabular-nums text-emerald-400">
                    {row.won}
                  </td>
                  <td className="px-1 py-3 text-center tabular-nums text-zinc-400">{row.drawn}</td>
                  <td className="px-1 py-3 text-center font-semibold tabular-nums text-rose-400">
                    {row.lost}
                  </td>
                  <td className="px-1 py-3 text-center tabular-nums text-zinc-300">
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-display text-lg leading-none tabular-nums text-white">
                      {row.points}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 border-t border-coal-700/70 px-4 py-3 font-condensed text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <span className="h-3 w-1.5 rounded-sm bg-gradient-to-b from-emerald-400 to-emerald-600" />
        Los 2 primeros disputan la Finalissima
      </div>
    </div>
  );
}
