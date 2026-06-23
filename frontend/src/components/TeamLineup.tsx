import TeamCrest from './TeamCrest';

type IconProps = { className?: string };

/** Stacked chevrons pointing up — the attacking (front) rod. */
function AttackIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 13 6-6 6 6" />
      <path d="m6 18 6-6 6 6" opacity="0.45" />
    </svg>
  );
}

/** A shield — the defending (back) rod. */
function ShieldIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" />
    </svg>
  );
}

function PositionRow({
  tone,
  label,
  name,
  Icon,
}: {
  tone: 'ember' | 'sky';
  label: string;
  name: string;
  Icon: (p: IconProps) => JSX.Element;
}) {
  const accent = tone === 'ember' ? 'text-ember-300' : 'text-sky-300';
  const badge =
    tone === 'ember'
      ? 'border-ember-500/40 bg-ember-500/10 text-ember-300'
      : 'border-sky-500/40 bg-sky-500/10 text-sky-300';
  return (
    <div className="relative flex items-center gap-2.5 px-3 py-2">
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${badge}`}>
        <Icon className="h-4 w-4" />
      </span>
      <TeamCrest name={name} size="sm" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-100">{name}</span>
      <span className={`shrink-0 font-condensed text-[10px] font-bold uppercase tracking-broadcast ${accent}`}>
        {label}
      </span>
    </div>
  );
}

/** A small "pitch" showing who plays up front (delante) and who plays at the back (atrás). */
export default function TeamLineup({ front, back }: { front: string; back: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-coal-700/60 bg-gradient-to-b from-coal-900/60 to-coal-950/60">
      {/* Faint pitch markings: centre circle + halfway line. */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]" />
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-white/[0.06]" />
      </div>
      <PositionRow tone="ember" label="Delante" name={front} Icon={AttackIcon} />
      <PositionRow tone="sky" label="Atrás" name={back} Icon={ShieldIcon} />
    </div>
  );
}
