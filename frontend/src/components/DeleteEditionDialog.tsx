// Deleting an edition wipes its teams, its matches and whatever it contributed to the
// all-time ranking, and there is no undo. So the confirmation is deliberately heavy:
// a full-width warning and a countdown that keeps the button locked until you have had
// time to actually read what is about to disappear.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EditionDetail } from '../api/types';

/** Seconds you have to sit with the warning before the button unlocks. */
const COUNTDOWN_SECONDS = 5;

export default function DeleteEditionDialog({
  open,
  edition,
  loading = false,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  edition: EditionDetail;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);

  // Every time the dialog opens the countdown starts over: reading the warning is the point.
  useEffect(() => {
    if (open) setRemaining(COUNTDOWN_SECONDS);
  }, [open]);

  useEffect(() => {
    if (!open || remaining === 0) return;
    const id = setTimeout(() => setRemaining(remaining - 1), 1000);
    return () => clearTimeout(id);
  }, [open, remaining]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const locked = remaining > 0;
  const playedMatches = edition.matches.filter((m) => m.status === 'PLAYED').length;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 animate-fade-in bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="panel relative w-full max-w-lg animate-rise border-rose-500/40 p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-rose-500/10 to-transparent" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-500/15 text-3xl ring-1 ring-rose-500/40">
              ⚠️
            </span>
            <div>
              <p className="font-condensed text-[11px] font-bold uppercase tracking-broadcast text-rose-400">
                Acción irreversible
              </p>
              <h3 className="mt-0.5 font-display text-3xl uppercase leading-none tracking-tight text-white sm:text-4xl">
                Borrar edición
              </h3>
            </div>
          </div>

          <p className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-center">
            <span className="block font-condensed text-[11px] font-bold uppercase tracking-wide text-rose-300/80">
              Vas a borrar para siempre
            </span>
            <span className="mt-1 block font-display text-2xl uppercase leading-none tracking-tight text-white">
              {edition.name}
            </span>
          </p>

          <ul className="mt-4 space-y-1.5 text-sm text-zinc-400">
            <li className="flex gap-2">
              <span className="text-rose-400">·</span>
              Se eliminarán sus{' '}
              <strong className="font-semibold text-zinc-200">{edition.teams.length} equipos</strong> y{' '}
              <strong className="font-semibold text-zinc-200">
                {edition.matches.length} partidos
              </strong>{' '}
              ({playedMatches} con resultado).
            </li>
            <li className="flex gap-2">
              <span className="text-rose-400">·</span>
              {edition.test ? (
                <span>
                  Es una edición de prueba, así que la clasificación histórica no se mueve.
                </span>
              ) : (
                <span>
                  Sus partidos{edition.champion ? ' y su campeón' : ''} dejarán de contar para la
                  clasificación histórica de los jugadores.
                </span>
              )}
            </li>
            <li className="flex gap-2">
              <span className="text-rose-400">·</span>
              <span className="font-semibold text-rose-300">No se puede deshacer.</span>
            </li>
          </ul>

          {error && (
            <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button onClick={onClose} className="btn-ghost justify-center">
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={locked || loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-5 py-2.5 font-condensed text-sm font-bold uppercase tracking-wider text-white transition hover:from-rose-400 hover:to-rose-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:from-coal-700 disabled:to-coal-800 disabled:text-zinc-500"
            >
              {locked ? (
                <>
                  <span className="font-display text-lg leading-none tabular-nums">{remaining}</span>
                  Espera para confirmar
                </>
              ) : loading ? (
                'Borrando…'
              ) : (
                'Sí, borrar la edición'
              )}
            </button>
          </div>

          {locked && (
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-coal-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-1000 ease-linear"
                style={{ width: `${((COUNTDOWN_SECONDS - remaining) / COUNTDOWN_SECONDS) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
