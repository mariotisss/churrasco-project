import { useEffect, useState } from 'react';
import { useDrawTeams, usePlayers } from '../api/hooks';
import { apiErrorMessage } from '../api/client';
import type { EditionDetail } from '../api/types';

export default function TeamDrawPanel({ edition }: { edition: EditionDetail }) {
  const { data: activePlayers } = usePlayers(true);
  const drawTeams = useDrawTeams(edition.id);
  const [selected, setSelected] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasTeams = edition.teams.length > 0;
  const hasResults = edition.matches.some((m) => m.status === 'PLAYED');

  // Por defecto, todos los jugadores activos quedan seleccionados.
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
      onError: (err) => setError(apiErrorMessage(err)),
    });
  }

  const selectedCount = selected?.length ?? 0;
  const canDraw = selectedCount >= 4;

  return (
    <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-stone-800">Sorteo de equipos</h2>
        {hasTeams && (
          <span className="text-xs text-stone-400">
            {edition.teams.length} equipos
          </span>
        )}
      </div>

      {edition.satOutPlayer && (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          🎲 Número impar: <strong>{edition.satOutPlayer.name}</strong> se queda fuera esta edición.
        </p>
      )}

      {!hasTeams && (
        <>
          <p className="text-sm text-stone-500">
            ¿Quién se presenta este mes? (mínimo 4 jugadores)
          </p>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {(activePlayers ?? []).map((player) => {
              const checked = selected?.includes(player.id) ?? false;
              return (
                <label
                  key={player.id}
                  className={`flex cursor-pointer items-center gap-2 rounded border px-2 py-1.5 text-sm ${
                    checked ? 'border-ember-300 bg-ember-50' : 'border-stone-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(player.id)}
                    className="accent-ember-600"
                  />
                  <span className="truncate">{player.name}</span>
                </label>
              );
            })}
          </div>
          {(activePlayers?.length ?? 0) === 0 && (
            <p className="text-sm text-stone-400">
              No hay jugadores activos. Añádelos en la pestaña Jugadores.
            </p>
          )}
        </>
      )}

      {hasTeams && hasResults && (
        <p className="text-sm text-stone-500">
          Ya hay resultados anotados: el sorteo está bloqueado para no alterar la competición.
        </p>
      )}

      {(!hasTeams || !hasResults) && (
        <button
          onClick={handleDraw}
          disabled={!canDraw || drawTeams.isPending}
          className="rounded-md bg-ember-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ember-700 disabled:opacity-50"
        >
          {drawTeams.isPending
            ? 'Sorteando…'
            : hasTeams
              ? 'Re-sortear equipos'
              : `Sortear equipos (${selectedCount})`}
        </button>
      )}

      {!canDraw && !hasTeams && (
        <p className="text-xs text-stone-400">Selecciona al menos 4 jugadores.</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
