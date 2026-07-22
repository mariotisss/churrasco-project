// Each futbolín fixture is played on one of two sides of the table: the
// red-and-white (rojiblanco) side or the blue (azul) side. Which team plays
// which side is cosmetic, so we assign it per match — scattered, but stable —
// and paint it as a colored wash behind the team's card.

import type { CSSProperties, ReactNode } from 'react';

export type Side = 'rojiblanco' | 'azul';

export const SIDE_LABEL: Record<Side, string> = {
  rojiblanco: 'Lado rojiblanco',
  azul: 'Lado azul',
};

/**
 * Stable pseudo-random side assignment for a match: half the fixtures put the
 * home team on the rojiblanco side, half on the azul side, so the colors mix
 * across the list instead of every home team landing on red. Keyed on the match
 * id so it never changes between renders.
 */
export function sidesForMatch(matchId: number): { home: Side; away: Side } {
  return hashBit(matchId)
    ? { home: 'rojiblanco', away: 'azul' }
    : { home: 'azul', away: 'rojiblanco' };
}

function hashBit(n: number): boolean {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return ((h >>> 15) & 1) === 1;
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
