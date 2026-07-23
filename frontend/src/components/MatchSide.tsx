// Each futbolín fixture is played on one of two sides of the table: the
// red-and-white (rojiblanco) side or the blue (azul) side, painted as a colored
// wash behind each team's card.
//
// The rojiblanco side sits on the LEFT in the ida and on the RIGHT in the vuelta.
// Since the schedule swaps home/away between legs (home is always drawn on the
// left), this keeps each pairing's colors consistent while flipping their sides:
// every team ends up playing its ida and its vuelta once on each side of the table.

import type { CSSProperties, ReactNode } from 'react';
import type { Leg } from '../api/types';

export type Side = 'rojiblanco' | 'azul';

export const SIDE_LABEL: Record<Side, string> = {
  rojiblanco: 'Lado rojiblanco',
  azul: 'Lado azul',
};

/**
 * Side assignment by leg. Home is rendered on the left, away on the right, so:
 *   - IDA (and the final / single-round league): rojiblanco on the left.
 *   - VUELTA: rojiblanco on the right (home/away are swapped for the return leg).
 */
export function sidesForMatch(leg: Leg): { home: Side; away: Side } {
  return leg === 'VUELTA'
    ? { home: 'azul', away: 'rojiblanco' }
    : { home: 'rojiblanco', away: 'azul' };
}

// Decorative layer painted behind the card content. `edge` is where the card
// sits relative to the central scoreboard, so the wash is strongest on the outer
// edge and fades (via mask) toward the score.
function sideLayerStyle(side: Side, edge: 'left' | 'right'): CSSProperties {
  const mask =
    edge === 'left'
      ? 'linear-gradient(to right, #000 0%, #000 24%, transparent 94%)'
      : 'linear-gradient(to left, #000 0%, #000 24%, transparent 94%)';
  const backgroundImage =
    side === 'rojiblanco'
      ? // rojiblanco: lighter red + white vertical stripes (Atlético-style)
        'repeating-linear-gradient(90deg,' +
        ' rgba(248,113,113,0.42) 0, rgba(248,113,113,0.42) 23px,' +
        ' rgba(255,255,255,0.34) 23px, rgba(255,255,255,0.34) 46px)'
      : // azul: solid blue wash
        'linear-gradient(0deg, rgba(59,130,246,0.42), rgba(59,130,246,0.42))';
  return { backgroundImage, WebkitMaskImage: mask, maskImage: mask };
}

/**
 * A team "card" with its side color washed behind the content. The wash lives on
 * an isolated, masked layer so the name and crest stay perfectly legible on top.
 */
export function SideCard({
  side,
  edge,
  title,
  className = '',
  children,
}: {
  side: Side;
  edge: 'left' | 'right';
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span title={title} className={`relative isolate overflow-hidden rounded-lg ${className}`}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={sideLayerStyle(side, edge)}
      />
      {children}
    </span>
  );
}
