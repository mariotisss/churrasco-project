import { NavLink, Route, Routes } from 'react-router-dom';
import EditionsPage from './pages/EditionsPage';
import EditionDetailPage from './pages/EditionDetailPage';
import PlayersPage from './pages/PlayersPage';

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `rounded-md px-3 py-2 text-sm font-medium transition ${
          isActive ? 'bg-white/20 text-white' : 'text-ember-100 hover:bg-white/10'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-ember-700 to-ember-500 shadow">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 text-white">
            <span className="text-2xl">🏆</span>
            <span className="text-lg font-bold tracking-tight">Churrasco&apos;s Cup</span>
          </NavLink>
          <nav className="flex gap-1">
            <NavItem to="/" label="Ediciones" />
            <NavItem to="/players" label="Jugadores" />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<EditionsPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/editions/:id" element={<EditionDetailPage />} />
        </Routes>
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-6 text-center text-xs text-stone-400">
        Churrasco&apos;s Cup · torneo mensual de futbolín
      </footer>
    </div>
  );
}
