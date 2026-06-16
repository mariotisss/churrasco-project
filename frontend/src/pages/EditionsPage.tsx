import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCreateEdition, useEditions } from '../api/hooks';
import { apiErrorMessage } from '../api/client';
import StatusBadge from '../components/StatusBadge';

function defaultEditionName() {
  const now = new Date();
  const month = now.toLocaleDateString('es-ES', { month: 'long' });
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${now.getFullYear()}`;
}

export default function EditionsPage() {
  const { data: editions, isLoading } = useEditions();
  const createEdition = useCreateEdition();
  const [name, setName] = useState(defaultEditionName());
  const [error, setError] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    createEdition.mutate(trimmed, {
      onSuccess: () => setName(defaultEditionName()),
      onError: (err) => setError(apiErrorMessage(err)),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Ediciones</h1>
        <p className="text-sm text-stone-500">Cada mes, una nueva Churrasco&apos;s Cup.</p>
      </div>

      <form onSubmit={handleCreate} className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la edición"
          className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-ember-500 focus:outline-none focus:ring-1 focus:ring-ember-500"
        />
        <button
          type="submit"
          disabled={createEdition.isPending}
          className="rounded-md bg-ember-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ember-700 disabled:opacity-50"
        >
          Nueva edición
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-stone-500">Cargando…</p>
      ) : !editions || editions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
          Todavía no hay ediciones. ¡Crea la primera!
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {editions.map((edition) => (
            <li key={edition.id}>
              <Link
                to={`/editions/${edition.id}`}
                className="block rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition hover:border-ember-300 hover:shadow"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800">{edition.name}</span>
                  <StatusBadge status={edition.status} />
                </div>
                {edition.champion ? (
                  <p className="mt-2 text-sm text-emerald-700">🏆 {edition.champion.name}</p>
                ) : (
                  <p className="mt-2 text-sm text-stone-400">Sin campeón todavía</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
