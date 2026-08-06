import { useRef, useState } from 'react';
import {
  useCreatePlayer,
  useDeletePlayer,
  useDeletePlayerPhoto,
  usePlayers,
  useUpdatePlayer,
  useUploadPlayerPhoto,
} from '../api/hooks';
import { apiErrorMessage } from '../api/client';
import type { Player } from '../api/types';
import PlayerAvatar, { photoUrl } from '../components/PlayerAvatar';
import { usePhotoViewer } from '../components/PhotoViewer';
import ConfirmDialog from '../components/ConfirmDialog';
import PhotoCropDialog from '../components/PhotoCropDialog';

/** Camera glyph for the "set a picture" affordance on each avatar. */
function CameraIcon({ className }: { className?: string }) {
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
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.1-2h8.4l1.1 2h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}

export default function PlayersPage() {
  const { data: players, isLoading } = usePlayers(false);
  const createPlayer = useCreatePlayer();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const total = players?.length ?? 0;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    createPlayer.mutate(trimmed, {
      onSuccess: () => setName(''),
      onError: (err) => setError(apiErrorMessage(err)),
    });
  }

  return (
    <div className="animate-fade-in space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">La plantilla</p>
          <h1 className="mt-2 font-display text-5xl uppercase leading-none tracking-tight text-white sm:text-6xl">
            Jugadores
          </h1>
        </div>
        <form onSubmit={handleAdd} className="flex w-full max-w-sm flex-col gap-2 sm:w-auto">
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del jugador"
              className="input w-full sm:w-52"
            />
            <button type="submit" disabled={createPlayer.isPending} className="btn-primary shrink-0">
              <span className="text-base leading-none">+</span> Añadir
            </button>
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </form>
      </header>

      <section>
        <h2 className="lower-third mb-4">
          Plantilla
          {total > 0 && (
            <span className="ml-1 font-condensed text-xs font-semibold text-zinc-600">{total}</span>
          )}
        </h2>

        {isLoading ? (
          <p className="panel p-6 text-sm text-zinc-500">Cargando…</p>
        ) : total === 0 ? (
          <div className="panel flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-coal-800 text-3xl shadow-inset-hi">
              👥
            </div>
            <p className="font-display text-xl uppercase tracking-tight text-zinc-200">
              Aún no hay jugadores
            </p>
            <p className="mt-1 text-sm text-zinc-500">Añade a la plantilla habitual para empezar.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(players ?? []).map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PlayerCard({ player }: { player: Player }) {
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();
  const uploadPhoto = useUploadPlayerPhoto();
  const deletePhoto = useDeletePlayerPhoto();
  const fileInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(player.name);
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [cropping, setCropping] = useState<File | null>(null);
  // Here the avatar is the upload button, so seeing the picture full size is its own action.
  const openPhoto = usePhotoViewer();
  const photo = photoUrl(player);

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // so picking the same file again still fires a change
    if (!file) return;
    setPhotoError(null);
    setCropping(file); // framed by hand before it goes anywhere
  }

  function savePhoto(image: Blob) {
    uploadPhoto.mutate(
      { id: player.id, image },
      {
        onSuccess: () => setCropping(null),
        onError: (err) => {
          setCropping(null);
          setPhotoError(apiErrorMessage(err, 'No se ha podido subir la foto'));
        },
      },
    );
  }

  function saveName() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== player.name) {
      updatePlayer.mutate({ id: player.id, name: trimmed });
    }
    setEditing(false);
  }

  function openConfirm() {
    setDeleteError(null);
    setConfirming(true);
  }

  function confirmDelete() {
    setDeleteError(null);
    deletePlayer.mutate(player.id, {
      onSuccess: () => setConfirming(false),
      onError: (err) => setDeleteError(apiErrorMessage(err)),
    });
  }

  return (
    <li className="panel p-4">
      <div className="flex items-center gap-3">
        {/* The avatar is the upload control: click it to set or replace the picture.
            Looking at the picture is the "Ver foto" action below, so the click here
            keeps its one meaning. */}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploadPhoto.isPending}
          title={player.photoVersion === null ? 'Subir foto' : 'Cambiar foto'}
          className="group relative shrink-0 rounded-full ring-offset-2 ring-offset-coal-900 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400"
        >
          <PlayerAvatar player={player} size="lg" zoomable={false} />
          <span
            className={`absolute inset-0 grid place-items-center rounded-full bg-coal-950/70 font-condensed text-[10px] font-bold uppercase tracking-wide text-zinc-100 transition ${
              uploadPhoto.isPending ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {uploadPhoto.isPending ? '…' : 'Foto'}
          </span>
          {/* Always visible: there is no hover on a phone, and this is the only way in. */}
          <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border border-coal-900 bg-coal-700 text-zinc-200 shadow-md">
            <CameraIcon className="h-3 w-3" />
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          onChange={pickPhoto}
          className="hidden"
        />
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              className="input w-full py-1.5"
            />
          ) : (
            <p className="truncate text-base font-semibold text-zinc-100">{player.name}</p>
          )}
        </div>
      </div>

      {photoError && <p className="mt-2 text-xs text-rose-300">{photoError}</p>}

      <div className="mt-3 flex items-center gap-1.5 border-t border-coal-800/80 pt-3">
        <button onClick={() => setEditing(true)} className="btn-ghost text-xs">
          Editar
        </button>
        {player.photoVersion !== null && photo && (
          <button onClick={() => openPhoto?.({ url: photo, name: player.name })} className="btn-ghost text-xs">
            Ver foto
          </button>
        )}
        {player.photoVersion !== null && (
          <button
            onClick={() => deletePhoto.mutate(player.id)}
            disabled={deletePhoto.isPending}
            className="btn-ghost text-xs"
          >
            Quitar foto
          </button>
        )}
        <span className="flex-1" />
        <button
          onClick={openConfirm}
          className="rounded-lg border border-coal-700 px-2.5 py-1.5 font-condensed text-xs font-semibold uppercase tracking-wide text-zinc-400 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
        >
          Eliminar
        </button>
      </div>

      {cropping && (
        <PhotoCropDialog
          file={cropping}
          busy={uploadPhoto.isPending}
          onConfirm={savePhoto}
          onClose={() => setCropping(null)}
        />
      )}

      <ConfirmDialog
        open={confirming}
        title="Eliminar jugador"
        message={
          <>
            ¿Seguro que quieres eliminar a{' '}
            <span className="font-semibold text-zinc-200">{player.name}</span>? Esta acción no se
            puede deshacer.
          </>
        }
        loading={deletePlayer.isPending}
        error={deleteError}
        onConfirm={confirmDelete}
        onClose={() => setConfirming(false)}
      />
    </li>
  );
}
