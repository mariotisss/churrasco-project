// One person, as a circle: their profile picture when they have one, otherwise the
// initials badge the app has always used. The colour is derived from the name, so a
// player without a picture still keeps a stable identity across the site.
//
// A real picture is clickable: it opens full size in the app's photo viewer. Faces
// drawn inside something else clickable (a card that links somewhere, the draw reveal)
// pass zoomable={false} so the click keeps doing what the surrounding element does.

import type { PlayerRef } from '../api/types';
import { usePhotoViewer } from './PhotoViewer';

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

export function gradientFor(name: string): string {
  return PALETTE[hash(name) % PALETTE.length];
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * The picture URL, versioned so a new upload shows up immediately while an unchanged
 * one stays cached (the endpoint answers with a one-year immutable Cache-Control).
 */
export function photoUrl(player: { id: number; photoVersion: number | null }): string | null {
  return player.photoVersion === null ? null : `/api/players/${player.id}/photo?v=${player.photoVersion}`;
}

export const AVATAR_SIZES = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-2xl',
};

export type AvatarSize = keyof typeof AVATAR_SIZES;

export default function PlayerAvatar({
  player,
  size = 'md',
  className = '',
  zoomable = true,
}: {
  player: PlayerRef | { id: number; name: string; photoVersion: number | null };
  size?: AvatarSize;
  className?: string;
  /** Set to false where clicking the face must not steal the click. */
  zoomable?: boolean;
}) {
  const url = photoUrl(player);
  const openPhoto = usePhotoViewer();
  const base = `relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-condensed font-bold uppercase tracking-wide text-white shadow-md ring-1 ring-white/15 ${AVATAR_SIZES[size]} ${className}`;

  if (url) {
    const zoom =
      zoomable && openPhoto ? () => openPhoto({ url, name: player.name }) : null;
    const label = `Ver la foto de ${player.name}`;
    return (
      <span
        className={`${base} bg-coal-800 ${zoom ? 'cursor-zoom-in' : ''}`}
        // Decorative unless it can be opened, in which case it is a control of its own.
        aria-hidden={zoom ? undefined : true}
        role={zoom ? 'button' : undefined}
        tabIndex={zoom ? 0 : undefined}
        aria-label={zoom ? label : undefined}
        title={zoom ? label : undefined}
        onClick={
          zoom
            ? (e) => {
                // The face often sits inside a link or a row that does something else.
                e.preventDefault();
                e.stopPropagation();
                zoom();
              }
            : undefined
        }
        onKeyDown={
          zoom
            ? (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                e.stopPropagation();
                zoom();
              }
            : undefined
        }
      >
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <span className={`${base} bg-gradient-to-br ${gradientFor(player.name)}`} aria-hidden>
      {/* glossy top highlight */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
      <span className="relative">{initials(player.name)}</span>
    </span>
  );
}
