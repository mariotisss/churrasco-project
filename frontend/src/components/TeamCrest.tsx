// A team is two people, so its crest is two overlapping circles — one face per player,
// falling back to the initials badge for whoever has no picture yet. Where there is no
// pair to show (a bracket slot still to be decided, a name being drawn), it degrades to
// a single badge built from the given name.

import type { PlayerRef } from '../api/types';
import PlayerAvatar, { AVATAR_SIZES, gradientFor, initials } from './PlayerAvatar';
import type { AvatarSize } from './PlayerAvatar';

/** How far the second circle slides over the first, per size. */
const OVERLAP: Record<AvatarSize, string> = {
  xs: '-ml-2',
  sm: '-ml-2.5',
  md: '-ml-3',
  lg: '-ml-4',
  xl: '-ml-5',
};

/** Separates the two circles from each other against any panel background. */
const SEPARATOR = 'ring-2 ring-coal-900';

export default function TeamCrest({
  name,
  players,
  size = 'md',
}: {
  /** Used for the fallback badge, and as the accessible label. */
  name: string;
  /** The team's two players. Omitted where only a name is known. */
  players?: [PlayerRef, PlayerRef];
  size?: AvatarSize;
}) {
  if (!players) {
    return (
      <span
        className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br font-condensed font-bold uppercase tracking-wide text-white shadow-md ring-1 ring-white/15 ${gradientFor(name)} ${AVATAR_SIZES[size]}`}
        aria-hidden
      >
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
        <span className="relative">{initials(name)}</span>
      </span>
    );
  }

  return (
    <span className="relative inline-flex shrink-0 items-center" aria-hidden>
      <PlayerAvatar player={players[0]} size={size} className={`z-10 ${SEPARATOR}`} />
      <PlayerAvatar player={players[1]} size={size} className={`${OVERLAP[size]} ${SEPARATOR}`} />
    </span>
  );
}
