import { useState } from 'react';
import {
  useCreatePlayer,
  useDeletePlayer,
  usePlayers,
  useUpdatePlayer,
} from '../api/hooks';
import { apiErrorMessage } from '../api/client';
import type { Player } from '../api/types';

export default function PlayersPage() {
  const { data: players, isLoading } = usePlayers(false);
  const createPlayer = useCreatePlayer();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    createPlayer.mutate(trimmed, {
      onSuccess: () => setName(''),
      onError: (err) => setError(apiErrorMessage(err)),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Jugadores</h1>
        <p className="text-sm text-stone-500">
          Da de alta a la plantilla habitual. Los inactivos no entran en el sorteo por defecto.
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del jugador"
          className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-ember-500 focus:outline-none focus:ring-1 focus:ring-ember-500"
        />
        <button
          type="submit"
          disabled={createPlayer.isPending}
          className="rounded-md bg-ember-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ember-700 disabled:opacity-50"
        >
          Añadir
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        {isLoading ? (
          <p className="p-4 text-sm text-stone-500">Cargando…</p>
        ) : !players || players.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">Aún no hay jugadores.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {players.map((player) => (
              <PlayerRow key={player.id} player={player} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PlayerRow({ player }: { player: Player }) {
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(player.name);

  function saveName() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== player.name) {
      updatePlayer.mutate({ id: player.id, name: trimmed });
    }
    setEditing(false);
  }

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={`h-2 w-2 rounded-full ${player.active ? 'bg-emerald-500' : 'bg-stone-300'}`}
          title={player.active ? 'Activo' : 'Inactivo'}
        />
        {editing ? (
          <input
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            className="rounded border border-stone-300 px-2 py-1 text-sm"
          />
        ) : (
          <span className={`text-sm font-medium ${player.active ? 'text-stone-800' : 'text-stone-400 line-through'}`}>
            {player.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <button onClick={() => setEditing(true)} className="text-stone-500 hover:text-ember-600">
          Editar
        </button>
        {player.active ? (
          <button
            onClick={() => deletePlayer.mutate(player.id)}
            className="rounded bg-stone-100 px-2 py-1 font-medium text-stone-600 hover:bg-stone-200"
          >
            Desactivar
          </button>
        ) : (
          <button
            onClick={() => updatePlayer.mutate({ id: player.id, active: true })}
            className="rounded bg-emerald-50 px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-100"
          >
            Reactivar
          </button>
        )}
      </div>
    </li>
  );
}
