import type { EditionStatus } from '../api/types';

const LABELS: Record<EditionStatus, string> = {
  DRAFT: 'Borrador',
  TEAMS_DRAWN: 'Equipos sorteados',
  IN_PROGRESS: 'En directo',
  FINISHED: 'Finalizada',
};

const STYLES: Record<EditionStatus, { wrap: string; dot: string; live?: boolean }> = {
  DRAFT: { wrap: 'border-coal-600 bg-coal-800/80 text-zinc-400', dot: 'bg-zinc-500' },
  TEAMS_DRAWN: {
    wrap: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    dot: 'bg-amber-400',
  },
  IN_PROGRESS: {
    wrap: 'border-ember-500/50 bg-ember-500/15 text-ember-300 shadow-glow-sm',
    dot: 'bg-ember-400',
    live: true,
  },
  FINISHED: {
    wrap: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    dot: 'bg-emerald-400',
  },
};

export default function StatusBadge({ status }: { status: EditionStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-condensed text-xs font-bold uppercase tracking-wider ${s.wrap}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {s.live && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-400 opacity-75" />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${s.dot}`} />
      </span>
      {LABELS[status]}
    </span>
  );
}
