import { useState } from 'react';
import { useCreatePlayer, useDeletePlayer, usePlayers, useUpdatePlayer } from '../api/hooks';
import { apiErrorMessage } from '../api/client';
import type { Player } from '../api/types';
import TeamCrest from '../components/TeamCrest';
import ConfirmDialog from '../components/ConfirmDialog';

export default function PlayersPage() {
  const { data: players, isLoading } = usePlayers(false);
  const createPlayer = useCreatePlayer();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const total = players?.length ?? 0;

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
    <div className="animate-fade-in space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">La plantilla</p>
          <h1 className="mt-2 font-display text-5xl uppercase leading-none tracking-tight text-white sm:text-6xl">
            Jugadores
          </h1>
        </div>
        <form onSubmit={handleAdd} className="flex w-full max-w-sm flex-col gap-2 sm:w-auto">
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del jugador"
              className="input w-full sm:w-52"
            />
            <button type="submit" disabled={createPlayer.isPending} className="btn-primary shrink-0">
              <span className="text-base leading-none">+</span> Añadir
            </button>
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </form>
      </header>

      <section>
        <h2 className="lower-third mb-4">
          Plantilla
          {total > 0 && (
            <span className="ml-1 font-condensed text-xs font-semibold text-zinc-600">{total}</span>
          )}
        </h2>

        {isLoading ? (
          <p className="panel p-6 text-sm text-zinc-500">Cargando…</p>
        ) : total === 0 ? (
          <div className="panel flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-coal-800 text-3xl shadow-inset-hi">
              👥
            </div>
            <p className="font-display text-xl uppercase tracking-tight text-zinc-200">
              Aún no hay jugadores
            </p>
            <p className="mt-1 text-sm text-zinc-500">Añade a la plantilla habitual para empezar.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(players ?? []).map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PlayerCard({ player }: { player: Player }) {
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(player.name);
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function saveName() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== player.name) {
      updatePlayer.mutate({ id: player.id, name: trimmed });
    }
    setEditing(false);
  }

  function openConfirm() {
    setDeleteError(null);
    setConfirming(true);
  }

  function confirmDelete() {
    setDeleteError(null);
    deletePlayer.mutate(player.id, {
      onSuccess: () => setConfirming(false),
      onError: (err) => setDeleteError(apiErrorMessage(err)),
    });
  }

  return (
    <li className="panel p-4">
      <div className="flex items-center gap-3">
        <TeamCrest name={player.name} size="lg" />
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              className="input w-full py-1.5"
            />
          ) : (
            <p className="truncate text-base font-semibold text-zinc-100">{player.name}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-t border-coal-800/80 pt-3">
        <button onClick={() => setEditing(true)} className="btn-ghost text-xs">
          Editar
        </button>
        <span className="flex-1" />
        <button
          onClick={openConfirm}
          className="rounded-lg border border-coal-700 px-2.5 py-1.5 font-condensed text-xs font-semibold uppercase tracking-wide text-zinc-400 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
        >
          Eliminar
        </button>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Eliminar jugador"
        message={
          <>
            ¿Seguro que quieres eliminar a{' '}
            <span className="font-semibold text-zinc-200">{player.name}</span>? Esta acción no se
            puede deshacer.
          </>
        }
        loading={deletePlayer.isPending}
        error={deleteError}
        onConfirm={confirmDelete}
        onClose={() => setConfirming(false)}
      />
    </li>
  );
}
