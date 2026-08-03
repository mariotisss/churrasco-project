// Each futbolín fixture is played on one of two sides of the table: the
// red-and-white (rojiblanco) side or the blue (azul) side, painted as a colored
// wash behind each team's card.
//
// In the league the side goes with being home or away: home plays rojiblanco, away plays
// azul. That is what makes each pairing swap sides between legs — the schedule already
// swaps home and away for the vuelta, so whoever played rojiblanco in the ida plays azul
// in the return. (Flipping the colors by leg as well would cancel that out and leave
// every team stuck on the same side both times.)
//
// In the playoffs there is no return leg to even things out, so the better-classified
// team picks: whatever it chooses is its side and the opponent gets the other one. Until
// somebody picks, a playoff match is drawn with no side colors at all.

import type { CSSProperties, ReactNode } from 'react';
import type { MatchDto, Side } from '../api/types';

export const SIDE_LABEL: Record<Side, string> = {
  ROJIBLANCO: 'Lado rojiblanco',
  AZUL: 'Lado azul',
};

/** The side left for the opponent. */
export function oppositeSide(side: Side): Side {
  return side === 'ROJIBLANCO' ? 'AZUL' : 'ROJIBLANCO';
}

/**
 * Side assignment for a match, home rendered on the left and away on the right, or null
 * when a playoff match is still waiting for its side to be picked.
 */
export function sidesForMatch(match: MatchDto): { home: Side; away: Side } | null {
  if (match.playoff) {
    return match.chosenSide
      ? { home: match.chosenSide, away: oppositeSide(match.chosenSide) }
      : null;
  }
  return { home: 'ROJIBLANCO', away: 'AZUL' };
}

/** Colors of each side, for swatches and bars outside of a full card wash. */
const SIDE_PAINT: Record<Side, CSSProperties> = {
  ROJIBLANCO: {
    backgroundImage:
      'repeating-linear-gradient(135deg, #f87171 0, #f87171 3px, #ffffff 3px, #ffffff 6px)',
  },
  AZUL: { backgroundColor: '#3b82f6' },
};

/**
 * Small colored mark standing for a side of the table: a square in the picker, a
 * thin bar down the edge of a bracket row. Purely decorative — whatever renders it
 * is responsible for naming the side in text or a title.
 */
export function SideSwatch({ side, className = '' }: { side: Side; className?: string }) {
  return <span aria-hidden className={`shrink-0 ${className}`} style={SIDE_PAINT[side]} />;
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
    side === 'ROJIBLANCO'
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
 * A null side (playoff match with nobody having picked yet) renders a plain card.
 */
export function SideCard({
  side,
  edge,
  title,
  className = '',
  children,
}: {
  side: Side | null;
  edge: 'left' | 'right';
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={side ? title ?? SIDE_LABEL[side] : undefined}
      className={`relative isolate overflow-hidden rounded-lg ${className}`}
    >
      {side && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={sideLayerStyle(side, edge)}
        />
      )}
      {children}
    </span>
  );
}
