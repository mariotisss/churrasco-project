import { useEffect, useState } from 'react';
import { useDrawTeams, usePlayers } from '../api/hooks';
import { apiErrorMessage } from '../api/client';
import type { EditionDetail } from '../api/types';

export default function TeamDrawPanel({
  edition,
  onDrawn,
}: {
  edition: EditionDetail;
  onDrawn?: () => void;
}) {
  const { data: activePlayers } = usePlayers(true);
  const drawTeams = useDrawTeams(edition.id);
  const [selected, setSelected] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasTeams = edition.teams.length > 0;
  const hasResults = edition.matches.some((m) => m.status === 'PLAYED');

  // By default, all active players are selected.
  useEffect(() => {
    if (activePlayers && selected === null) {
      setSelected(activePlayers.map((p) => p.id));
    }
  }, [activePlayers, selected]);

  function toggle(id: number) {
    setSelected((prev) => {
      const current = prev ?? [];
      return current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    });
  }

  function handleDraw() {
    setError(null);
    drawTeams.mutate(selected ?? undefined, {
      onSuccess: () => onDrawn?.(),
      onError: (err) => setError(apiErrorMessage(err)),
    });
  }

  const selectedCount = selected?.length ?? 0;
  const canDraw = selectedCount >= 4;

  return (
    <div className="panel space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="lower-third">
          <span className="-ml-1 text-base">🎲</span> Sorteo de equipos
        </h2>
        {hasTeams && <span className="chip">{edition.teams.length} equipos</span>}
      </div>

      {edition.satOutPlayer && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200">
          🎲 Número impar:{' '}
          <strong className="font-semibold text-amber-100">{edition.satOutPlayer.name}</strong> se
          queda fuera esta edición.
        </p>
      )}

      {!hasTeams && (
        <>
          <p className="text-sm text-zinc-400">
            ¿Quién se presenta este mes?{' '}
            <span className="font-condensed font-semibold uppercase tracking-wide text-zinc-500">
              (mínimo 4)
            </span>
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {(activePlayers ?? []).map((player) => {
              const checked = selected?.includes(player.id) ?? false;
              return (
                <button
                  type="button"
                  key={player.id}
                  onClick={() => toggle(player.id)}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition ${
                    checked
                      ? 'border-ember-500/50 bg-ember-500/15 text-ember-200'
                      : 'border-coal-700 bg-coal-950/50 text-zinc-400 hover:border-coal-600'
                  }`}
                >
                  <span
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${
                      checked ? 'border-ember-400 bg-ember-500 text-white' : 'border-coal-600'
                    }`}
                  >
                    {checked ? '✓' : ''}
                  </span>
                  <span className="truncate font-medium">{player.name}</span>
                </button>
              );
            })}
          </div>
          {(activePlayers?.length ?? 0) === 0 && (
            <p className="text-sm text-zinc-500">
              No hay jugadores activos. Añádelos en la pestaña Jugadores.
            </p>
          )}
        </>
      )}

      {hasTeams && hasResults && (
        <p className="rounded-xl border border-coal-700 bg-coal-950/50 px-3 py-2.5 text-sm text-zinc-400">
          🔒 Ya hay resultados anotados: el sorteo está bloqueado para no alterar la competición.
        </p>
      )}

      {(!hasTeams || !hasResults) && (
        <button
          onClick={handleDraw}
          disabled={!canDraw || drawTeams.isPending}
          className="btn-primary w-full"
        >
          {drawTeams.isPending
            ? 'Sorteando…'
            : hasTeams
              ? 'Re-sortear equipos'
              : `Sortear equipos (${selectedCount})`}
        </button>
      )}

      {!canDraw && !hasTeams && (
        <p className="font-condensed text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Selecciona al menos 4 jugadores
        </p>
      )}
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
