import { useState } from 'react';
import {
  useCreatePenalty,
  useDeletePenalty,
  usePenalties,
  usePlayers,
  useUpdatePenalty,
} from '../api/hooks';
import { apiErrorMessage } from '../api/client';
import type { Penalty } from '../api/types';
import TeamCrest from '../components/TeamCrest';
import ConfirmDialog from '../components/ConfirmDialog';

const POINT_OPTIONS = [1, 2] as const;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** A −1 / −2 segmented selector reused by the add form and the inline editor. */
function PointsToggle({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {POINT_OPTIONS.map((p) => {
        const active = value === p;
        return (
          <button
            type="button"
            key={p}
            onClick={() => onChange(p)}
            className={`flex-1 rounded-lg border px-3 py-2 font-condensed text-sm font-bold uppercase tracking-wide transition ${
              active
                ? 'border-rose-500/60 bg-rose-500/15 text-rose-200'
                : 'border-coal-700 bg-coal-950/50 text-zinc-400 hover:border-coal-600'
            }`}
          >
            −{p} {p === 1 ? 'punto' : 'puntos'}
          </button>
        );
      })}
    </div>
  );
}

export default function PenaltiesPage() {
  const { data: penalties, isLoading } = usePenalties();
  const { data: players } = usePlayers(false);
  const createPenalty = useCreatePenalty();

  const [playerId, setPlayerId] = useState<number | ''>('');
  const [points, setPoints] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = reason.trim();
    if (playerId === '' || !trimmed) {
      setError('Selecciona un jugador y escribe una razón.');
      return;
    }
    setError(null);
    createPenalty.mutate(
      { playerId, points, reason: trimmed },
      {
        onSuccess: () => {
          setReason('');
          setPoints(1);
        },
        onError: (err) => setError(apiErrorMessage(err)),
      },
    );
  }

  const total = penalties?.length ?? 0;

  return (
    <div className="animate-fade-in space-y-8">
      <header>
        <p className="eyebrow">Disciplina</p>
        <h1 className="mt-2 font-display text-5xl uppercase leading-none tracking-tight text-white sm:text-6xl">
          Penalizaciones
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
          Resta puntos de la{' '}
          <span className="font-semibold text-zinc-200">clasificación histórica</span> de un
          jugador. Cada penalización queda registrada en el historial.
        </p>
      </header>

      {/* Add form */}
      <section className="panel space-y-4 p-5">
        <h2 className="lower-third">Nueva penalización</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="font-condensed text-[11px] font-bold uppercase tracking-broadcast text-zinc-500">
                Jugador
              </span>
              <select
                value={playerId}
                onChange={(e) =>
                  setPlayerId(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="input w-full"
              >
                <option value="">Selecciona un jugador…</option>
                {(players ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="font-condensed text-[11px] font-bold uppercase tracking-broadcast text-zinc-500">
                Puntos a restar
              </span>
              <PointsToggle value={points} onChange={setPoints} />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="font-condensed text-[11px] font-bold uppercase tracking-broadcast text-zinc-500">
              Razón
            </span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo de la penalización"
              maxLength={200}
              className="input w-full"
            />
          </label>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button type="submit" disabled={createPenalty.isPending} className="btn-primary">
            <span className="text-base leading-none">+</span> Añadir penalización
          </button>
        </form>
      </section>

      {/* History */}
      <section>
        <h2 className="lower-third mb-4">
          Historial
          {total > 0 && (
            <span className="ml-1 font-condensed text-xs font-semibold text-zinc-600">{total}</span>
          )}
        </h2>

        {isLoading ? (
          <p className="panel p-6 text-sm text-zinc-500">Cargando…</p>
        ) : total === 0 ? (
          <div className="panel flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-coal-800 text-3xl shadow-inset-hi">
              🟥
            </div>
            <p className="font-display text-xl uppercase tracking-tight text-zinc-200">
              Sin penalizaciones
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Ningún jugador ha sido penalizado todavía.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {(penalties ?? []).map((penalty) => (
              <PenaltyRow key={penalty.id} penalty={penalty} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PenaltyRow({ penalty }: { penalty: Penalty }) {
  const updatePenalty = useUpdatePenalty();
  const deletePenalty = useDeletePenalty();
  const [editing, setEditing] = useState(false);
  const [points, setPoints] = useState(penalty.points);
  const [reason, setReason] = useState(penalty.reason);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function startEdit() {
    setPoints(penalty.points);
    setReason(penalty.reason);
    setEditError(null);
    setEditing(true);
  }

  function saveEdit() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setEditError('La razón es obligatoria.');
      return;
    }
    updatePenalty.mutate(
      { id: penalty.id, points, reason: trimmed },
      {
        onSuccess: () => setEditing(false),
        onError: (err) => setEditError(apiErrorMessage(err)),
      },
    );
  }

  function confirmDelete() {
    setDeleteError(null);
    deletePenalty.mutate(penalty.id, {
      onSuccess: () => setConfirming(false),
      onError: (err) => setDeleteError(apiErrorMessage(err)),
    });
  }

  return (
    <li className="panel p-4">
      <div className="flex items-start gap-3">
        <TeamCrest name={penalty.playerName} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[15px] font-semibold text-zinc-100">{penalty.playerName}</span>
            <span className="inline-flex items-center rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 font-condensed text-xs font-bold uppercase tracking-wide text-rose-300">
              −{penalty.points} {penalty.points === 1 ? 'punto' : 'puntos'}
            </span>
            <span className="font-condensed text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
              {formatDate(penalty.createdAt)}
            </span>
          </div>

          {editing ? (
            <div className="mt-3 space-y-3">
              <PointsToggle value={points} onChange={setPoints} />
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
                autoFocus
                className="input w-full"
                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
              />
              {editError && <p className="text-sm text-rose-400">{editError}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={saveEdit}
                  disabled={updatePenalty.isPending}
                  className="btn-primary py-2 text-xs"
                >
                  {updatePenalty.isPending ? 'Guardando…' : 'Guardar'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-ghost text-xs">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 break-words text-sm text-zinc-400">{penalty.reason}</p>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button onClick={startEdit} className="btn-ghost text-xs">
              Editar
            </button>
            <button
              onClick={() => {
                setDeleteError(null);
                setConfirming(true);
              }}
              className="rounded-lg border border-coal-700 px-2.5 py-1.5 font-condensed text-xs font-semibold uppercase tracking-wide text-zinc-400 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        title="Eliminar penalización"
        message={
          <>
            ¿Seguro que quieres eliminar la penalización de{' '}
            <span className="font-semibold text-zinc-200">{penalty.playerName}</span> (−
            {penalty.points})? Sus puntos se restaurarán.
          </>
        }
        loading={deletePenalty.isPending}
        error={deleteError}
        onConfirm={confirmDelete}
        onClose={() => setConfirming(false)}
      />
    </li>
  );
}
