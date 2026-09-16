// A team is named after its two players. On a single line ("José Manuel & María del
// Carmen") the ellipsis eats the second one as soon as space runs short, so wherever a
// team goes by name its players are stacked one under the other, each with the full width.

import type { PlayerRef } from '../api/types';

const ALIGN = {
  left: 'items-start text-left',
  right: 'items-end text-right',
  center: 'items-center text-center',
};

export default function PlayerNames({
  players,
  align = 'left',
  className = '',
}: {
  players: [PlayerRef, PlayerRef];
  /** Which edge the names hug: 'right' for a card that sits left of a scoreboard. */
  align?: 'left' | 'right' | 'center';
  /** Size, weight and color of the names. */
  className?: string;
}) {
  return (
    <span className={`flex min-w-0 flex-col ${ALIGN[align]} ${className}`}>
      <span className="max-w-full truncate">{players[0].name}</span>
      <span className="sr-only"> & </span>
      <span className="max-w-full truncate">{players[1].name}</span>
    </span>
  );
}
