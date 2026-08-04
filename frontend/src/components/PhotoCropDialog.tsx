// Framing a profile picture. The app only ever shows a square (drawn as a circle), so
// rather than assuming the interesting part is the middle of the photo, this lets you
// drag and zoom until the right bit is inside the ring.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cropToSquareJpeg, loadBitmap } from '../lib/image';

/** Side of the framing area, in CSS pixels. Fits a 390px phone with room to spare. */
const VIEWPORT = 272;

const MAX_ZOOM = 4;

export default function PhotoCropDialog({
  file,
  busy = false,
  onConfirm,
  onClose,
}: {
  file: File;
  busy?: boolean;
  onConfirm: (image: Blob) => void;
  onClose: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  // Where the image's top-left sits relative to the framing area, in CSS pixels.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ pointer: number; x: number; y: number } | null>(null);

  // At zoom 1 the image exactly covers the frame, so there is never a gap to fill.
  const cover = bitmap ? VIEWPORT / Math.min(bitmap.width, bitmap.height) : 1;
  const k = cover * zoom;
  const shown = bitmap
    ? { w: bitmap.width * k, h: bitmap.height * k }
    : { w: VIEWPORT, h: VIEWPORT };

  const clamp = useCallback(
    (x: number, y: number) => ({
      x: Math.min(0, Math.max(VIEWPORT - shown.w, x)),
      y: Math.min(0, Math.max(VIEWPORT - shown.h, y)),
    }),
    [shown.w, shown.h],
  );

  useEffect(() => {
    let alive = true;
    loadBitmap(file)
      .then((bmp) => {
        if (!alive) return bmp.close();
        setBitmap(bmp);
        // Start centred: the old behaviour, now just the starting point.
        const c = VIEWPORT / Math.min(bmp.width, bmp.height);
        setOffset({ x: (VIEWPORT - bmp.width * c) / 2, y: (VIEWPORT - bmp.height * c) / 2 });
      })
      .catch(() => alive && setError('No se ha podido leer esa imagen'));
    return () => {
      alive = false;
    };
  }, [file]);

  useEffect(() => {
    const el = canvas.current;
    if (!el || !bitmap) return;
    const dpr = window.devicePixelRatio || 1;
    el.width = VIEWPORT * dpr;
    el.height = VIEWPORT * dpr;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, VIEWPORT, VIEWPORT);
    ctx.drawImage(bitmap, offset.x, offset.y, shown.w, shown.h);
  }, [bitmap, offset, shown.w, shown.h]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /** Zooming holds whatever is in the middle of the frame in the middle of the frame. */
  function changeZoom(next: number) {
    if (!bitmap) return;
    const k2 = cover * next;
    const centreX = (VIEWPORT / 2 - offset.x) / k;
    const centreY = (VIEWPORT / 2 - offset.y) / k;
    const x = VIEWPORT / 2 - centreX * k2;
    const y = VIEWPORT / 2 - centreY * k2;
    setZoom(next);
    setOffset({
      x: Math.min(0, Math.max(VIEWPORT - bitmap.width * k2, x)),
      y: Math.min(0, Math.max(VIEWPORT - bitmap.height * k2, y)),
    });
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!bitmap) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { pointer: e.pointerId, x: e.clientX - offset.x, y: e.clientY - offset.y };
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    setOffset(clamp(e.clientX - d.x, e.clientY - d.y));
  }

  function endDrag(e: React.PointerEvent<HTMLCanvasElement>) {
    if (drag.current?.pointer === e.pointerId) drag.current = null;
  }

  async function confirm() {
    if (!bitmap) return;
    // Back from the frame to image pixels: what the ring covers is what gets cut out.
    const side = VIEWPORT / k;
    const sx = Math.min(Math.max(-offset.x / k, 0), bitmap.width - side);
    const sy = Math.min(Math.max(-offset.y / k, 0), bitmap.height - side);
    try {
      onConfirm(await cropToSquareJpeg(bitmap, sx, sy, side));
    } catch {
      setError('No se ha podido recortar la imagen');
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="panel relative w-full max-w-sm animate-rise p-6">
        <h3 className="font-display text-2xl uppercase leading-none tracking-tight text-white">
          Encuadrar foto
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          Arrastra la foto y usa el zoom hasta dejar dentro del círculo lo que quieras que se vea.
        </p>

        <div className="mt-5 flex flex-col items-center">
          <div
            className="relative overflow-hidden rounded-xl bg-coal-950"
            style={{ width: VIEWPORT, height: VIEWPORT }}
          >
            {bitmap ? (
              <canvas
                ref={canvas}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="touch-none cursor-grab active:cursor-grabbing"
                style={{ width: VIEWPORT, height: VIEWPORT }}
              />
            ) : (
              <div className="grid h-full place-items-center text-sm text-zinc-500">
                {error ?? 'Cargando…'}
              </div>
            )}
            {/* The circle is the avatar: everything outside it is dimmed. */}
            <span className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(15,15,20,0.62)]" />
            <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/25" />
          </div>

          <div className="mt-4 flex w-full items-center gap-3">
            <span className="font-condensed text-[11px] font-bold uppercase tracking-wide text-zinc-500">
              Zoom
            </span>
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              disabled={!bitmap}
              onChange={(e) => changeZoom(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-coal-700 accent-ember-500"
            />
          </div>
        </div>

        {error && bitmap && <p className="mt-3 text-sm text-rose-300">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button onClick={confirm} disabled={!bitmap || busy} className="btn-primary">
            {busy ? 'Guardando…' : 'Guardar foto'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
