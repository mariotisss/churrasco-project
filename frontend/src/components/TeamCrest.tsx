// Deterministic colored "crest" (initials avatar) for a team, broadcast-style.
// The same team name always yields the same hue, so teams stay recognizable.

const PALETTE = [
  'from-rose-500 to-rose-700',
  'from-amber-500 to-orange-700',
  'from-emerald-500 to-emerald-700',
  'from-sky-500 to-blue-700',
  'from-violet-500 to-purple-700',
  'from-pink-500 to-fuchsia-700',
  'from-teal-500 to-cyan-700',
  'from-lime-500 to-green-700',
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const SIZES = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-2xl',
};

export default function TeamCrest({
  name,
  size = 'md',
}: {
  name: string;
  size?: keyof typeof SIZES;
}) {
  const gradient = PALETTE[hash(name) % PALETTE.length];
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br font-condensed font-bold uppercase tracking-wide text-white shadow-md ring-1 ring-white/15 ${gradient} ${SIZES[size]}`}
      aria-hidden
    >
      {/* glossy top highlight */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
      <span className="relative">{initials(name)}</span>
    </span>
  );
}
