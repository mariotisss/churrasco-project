import type { EditionStatus } from '../api/types';

const LABELS: Record<EditionStatus, string> = {
  DRAFT: 'Borrador',
  TEAMS_DRAWN: 'Equipos sorteados',
  IN_PROGRESS: 'En juego',
  FINISHED: 'Finalizada',
};

const STYLES: Record<EditionStatus, string> = {
  DRAFT: 'bg-stone-200 text-stone-700',
  TEAMS_DRAWN: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-ember-100 text-ember-800',
  FINISHED: 'bg-emerald-100 text-emerald-800',
};

export default function StatusBadge({ status }: { status: EditionStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
