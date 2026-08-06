// Profile pictures are drawn as tiny circles all over the app, so there has to be a way
// to actually look at one: clicking a face opens it here, big, over a dimmed page.
//
// A single dialog for the whole app (mounted once by the provider) instead of one per
// avatar: any face can ask for it, and only one picture is ever open at a time.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** A picture to show: its (versioned) URL and whose face it is. */
export interface Photo {
  url: string;
  name: string;
}

const PhotoViewerContext = createContext<((photo: Photo) => void) | null>(null);

/** Opens a picture full size, or null when there is no viewer mounted above. */
export function usePhotoViewer() {
  return useContext(PhotoViewerContext);
}

export default function PhotoViewerProvider({ children }: { children: React.ReactNode }) {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const open = useCallback((next: Photo) => setPhoto(next), []);
  const close = useCallback(() => setPhoto(null), []);

  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photo, close]);

  return (
    <PhotoViewerContext.Provider value={open}>
      {children}
      {photo &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Foto de ${photo.name}`}
          >
            {/* Anywhere outside the picture closes it, phone included. */}
            <div className="absolute inset-0 animate-fade-in bg-black/85 backdrop-blur-sm" onClick={close} />
            <figure className="relative flex animate-rise flex-col items-center gap-3">
              <img
                src={photo.url}
                alt={`Foto de ${photo.name}`}
                className="w-[min(80vw,22rem)] rounded-2xl border border-coal-700/70 shadow-card"
              />
              <figcaption className="text-center">
                <p className="font-display text-2xl uppercase leading-none tracking-tight text-white">
                  {photo.name}
                </p>
                <p className="mt-2 font-condensed text-[11px] font-semibold uppercase tracking-broadcast text-zinc-500">
                  Toca fuera para cerrar
                </p>
              </figcaption>
              <button
                onClick={close}
                aria-label="Cerrar"
                className="absolute -right-2 -top-2 grid h-9 w-9 place-items-center rounded-full border border-coal-700 bg-coal-900/90 text-lg leading-none text-zinc-300 shadow-card transition hover:border-rose-500/50 hover:text-rose-300"
              >
                ✕
              </button>
            </figure>
          </div>,
          document.body,
        )}
    </PhotoViewerContext.Provider>
  );
}
