import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCreateEdition, useEditions } from '../api/hooks';
import { apiErrorMessage } from '../api/client';
import { featuredEditionId, palmares } from '../lib/tournament';
import type { EditionSummary } from '../api/types';
import StatusBadge from '../components/StatusBadge';
import TestBadge from '../components/TestBadge';
import TeamCrest from '../components/TeamCrest';
import FeaturedEdition from '../components/FeaturedEdition';

function defaultEditionName() {
  const now = new Date();
  const month = now.toLocaleDateString('es-ES', { month: 'long' });
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${now.getFullYear()}`;
}

export default function EditionsPage() {
  const { data: editions, isLoading } = useEditions();
  const createEdition = useCreateEdition();
  const [name, setName] = useState(defaultEditionName());
  const [test, setTest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    createEdition.mutate(
      { name: trimmed, test },
      {
        onSuccess: () => {
          setName(defaultEditionName());
          setTest(false);
        },
        onError: (err) => setError(apiErrorMessage(err)),
      },
    );
  }

  const featuredId = editions ? featuredEditionId(editions) : null;
  const champions = editions ? palmares(editions) : [];

  return (
    <div className="animate-fade-in space-y-10">
      {/* Page header + create */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Temporada {new Date().getFullYear()}</p>
          <h1 className="mt-2 font-display text-5xl uppercase leading-none tracking-tight text-white sm:text-6xl">
            Ediciones
          </h1>
        </div>
        <form onSubmit={handleCreate} className="flex w-full max-w-sm flex-col gap-2 sm:w-auto">
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la edición"
              className="input w-full sm:w-52"
            />
            <button type="submit" disabled={createEdition.isPending} className="btn-primary shrink-0">
              <span className="text-base leading-none">+</span> Crear
            </button>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400 transition hover:text-zinc-200">
            <input
              type="checkbox"
              checked={test}
              onChange={(e) => setTest(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-coal-600 bg-coal-950 accent-sky-500"
            />
            Edición de prueba{' '}
            <span className="font-condensed text-xs font-semibold uppercase tracking-wide text-zinc-600">
              (no cuenta para la clasificación)
            </span>
          </label>
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </form>
      </header>

      {isLoading ? (
        <div className="h-56 animate-pulse rounded-3xl border border-coal-700/60 bg-coal-900/50" />
      ) : !editions || editions.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Featured live edition */}
          {featuredId && <FeaturedEdition editionId={featuredId} />}

          {/* Palmarés */}
          {champions.length > 0 && (
            <section>
              <h2 className="lower-third mb-4">Palmarés</h2>
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
                {champions.map((e) => (
                  <Link
                    key={e.id}
                    to={`/editions/${e.id}`}
                    className="group flex min-w-[200px] items-center gap-3 rounded-2xl border border-coal-700/60 bg-gradient-to-br from-coal-850/90 to-coal-900/95 p-4 shadow-card transition hover:border-emerald-500/40"
                  >
                    <span className="relative">
                      <TeamCrest name={e.champion!.name} size="lg" />
                      <span className="absolute -right-1.5 -top-1.5 text-base">🏆</span>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-white">
                        {e.champion!.name}
                      </p>
                      <p className="truncate text-xs font-medium text-zinc-500">
                        {e.name}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Archive */}
          <section>
            <h2 className="lower-third mb-4">
              Todas las ediciones
              <span className="ml-1 font-condensed text-xs font-semibold text-zinc-600">
                {editions.length}
              </span>
            </h2>
            <div className="panel divide-y divide-coal-800/70">
              {editions.map((edition, i) => (
                <ArchiveRow key={edition.id} edition={edition} index={editions.length - i} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ArchiveRow({ edition, index }: { edition: EditionSummary; index: number }) {
  return (
    <Link
      to={`/editions/${edition.id}`}
      className="group flex items-center gap-4 px-4 py-3.5 transition hover:bg-white/[0.03] sm:px-5"
    >
      <span className="w-8 shrink-0 text-center font-display text-xl leading-none tabular-nums text-white/15 transition group-hover:text-ember-500/40">
        {String(index).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-display text-xl uppercase leading-none tracking-tight text-white transition group-hover:text-ember-300">
            {edition.name}
          </p>
          {edition.test && <TestBadge />}
        </div>
        {edition.champion && (
          <p className="mt-1 truncate font-condensed text-xs font-semibold uppercase tracking-wide text-emerald-400">
            🏆 {edition.champion.name}
          </p>
        )}
      </div>
      <StatusBadge status={edition.status} />
      <span className="hidden font-condensed text-xs font-bold uppercase tracking-wider text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-ember-400 sm:inline">
        Ver →
      </span>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="panel flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-coal-800 text-3xl shadow-inset-hi">
        🏆
      </div>
      <p className="font-condensed text-lg font-bold uppercase tracking-wide text-zinc-300">
        Todavía no hay ediciones
      </p>
      <p className="mt-1 text-sm text-zinc-500">Crea la primera y arranca la temporada.</p>
    </div>
  );
}
