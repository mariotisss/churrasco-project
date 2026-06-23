import { NavLink, Route, Routes } from 'react-router-dom';
import { useEditions } from './api/hooks';
import { featuredEditionId } from './lib/tournament';
import EditionsPage from './pages/EditionsPage';
import EditionDetailPage from './pages/EditionDetailPage';
import PlayersPage from './pages/PlayersPage';
import ClassificationPage from './pages/ClassificationPage';
import PenaltiesPage from './pages/PenaltiesPage';

type IconProps = { className?: string };

function TrophyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" strokeLinejoin="round" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" strokeLinecap="round" />
      <path d="M12 13v4M9 21h6M10 17h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5M21 20a6 6 0 0 0-4-5.7" strokeLinecap="round" />
    </svg>
  );
}

function RankingIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="12" width="5" height="8" rx="1" />
      <rect x="9.5" y="7" width="5" height="13" rx="1" />
      <rect x="16" y="14.5" width="5" height="5.5" rx="1" />
    </svg>
  );
}

function CardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="6" y="3.5" width="9" height="13" rx="1.5" transform="rotate(-12 6 3.5)" />
      <path d="M14.5 9.5 19 13a2 2 0 0 1 .5 2.6l-3 5.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type NavItem = {
  to: string;
  label: string;
  short?: string;
  Icon: (p: IconProps) => JSX.Element;
};

const NAV: NavItem[] = [
  { to: '/', label: 'Ediciones', Icon: TrophyIcon },
  { to: '/players', label: 'Jugadores', Icon: UsersIcon },
  { to: '/classification', label: 'Clasificación', short: 'Clasif.', Icon: RankingIcon },
  { to: '/penalties', label: 'Penalizaciones', short: 'Penas', Icon: CardIcon },
];

function Brand() {
  return (
    <NavLink to="/" className="group flex flex-col leading-none">
      <span className="font-display text-xl uppercase tracking-tight text-white transition group-hover:text-ember-300">
        Churrasco&apos;s Cup!
      </span>
      <span className="mt-1.5 font-condensed text-[10px] font-semibold uppercase tracking-broadcast text-ember-400/90">
        Liga de futbolín
      </span>
    </NavLink>
  );
}

function SideNavItem({ to, label, Icon }: { to: string; label: string; Icon: (p: IconProps) => JSX.Element }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-condensed text-sm font-bold uppercase tracking-wide transition ${
          isActive
            ? 'bg-gradient-to-r from-ember-500/20 to-transparent text-white'
            : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`absolute inset-y-2 left-0 w-1 rounded-r bg-gradient-to-b from-ember-400 to-ember-600 transition ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <Icon className={`h-5 w-5 ${isActive ? 'text-ember-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
          {label}
        </>
      )}
    </NavLink>
  );
}

function LiveWidget() {
  const { data: editions } = useEditions();
  const live = editions?.find((e) => e.status === 'IN_PROGRESS' && !e.test);
  const featuredId = editions ? featuredEditionId(editions) : null;

  if (live) {
    return (
      <NavLink
        to={`/editions/${live.id}`}
        className="group block overflow-hidden rounded-xl border border-ember-500/40 bg-gradient-to-br from-ember-500/15 to-transparent p-3.5 shadow-glow-sm transition hover:border-ember-400/60"
      >
        <span className="flex items-center gap-2 font-condensed text-[11px] font-bold uppercase tracking-broadcast text-ember-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-ember-400" />
          </span>
          En directo
        </span>
        <p className="mt-1.5 truncate font-display text-lg uppercase leading-none tracking-tight text-white">
          {live.name}
        </p>
        <p className="mt-1.5 font-condensed text-xs font-semibold uppercase tracking-wide text-ember-300/80 transition group-hover:translate-x-0.5">
          Entrar al directo →
        </p>
      </NavLink>
    );
  }

  if (featuredId) {
    return (
      <NavLink
        to={`/editions/${featuredId}`}
        className="block rounded-xl border border-coal-700/60 bg-coal-950/40 p-3.5 transition hover:border-coal-600"
      >
        <span className="font-condensed text-[11px] font-bold uppercase tracking-broadcast text-zinc-500">
          Última edición
        </span>
        <p className="mt-1.5 font-condensed text-sm font-semibold uppercase tracking-wide text-zinc-300">
          Ver resultados →
        </p>
      </NavLink>
    );
  }

  return null;
}

export default function App() {
  return (
    <div className="relative z-10 min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-coal-700/60 bg-coal-950/80 backdrop-blur-xl lg:flex">
        <div className="h-1 w-full bg-gradient-to-r from-ember-600 via-ember-400 to-ember-600" />
        <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-5 py-6">
          <Brand />
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <SideNavItem key={item.to} {...item} />
            ))}
          </nav>
          <div className="mt-auto">
            <LiveWidget />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 border-b border-coal-700/60 bg-coal-950/85 backdrop-blur-xl lg:hidden">
        <div className="h-1 w-full bg-gradient-to-r from-ember-600 via-ember-400 to-ember-600" />
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Brand />
          <nav className="flex items-center gap-1 rounded-xl border border-coal-700/60 bg-coal-900/70 p-1">
            {NAV.map(({ to, label, short }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-2.5 py-1.5 font-condensed text-xs font-bold uppercase tracking-wide transition sm:px-3 sm:text-sm ${
                    isActive
                      ? 'bg-gradient-to-b from-ember-500 to-ember-600 text-white shadow-glow-sm'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`
                }
              >
                {short ?? label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Main */}
      <div className="lg:pl-72">
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <Routes>
            <Route path="/" element={<EditionsPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/classification" element={<ClassificationPage />} />
            <Route path="/penalties" element={<PenaltiesPage />} />
            <Route path="/editions/:id" element={<EditionDetailPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
