import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Player, TeamDto } from '../api/types';
import TeamCrest from './TeamCrest';
import TeamLineup from './TeamLineup';

type Step =
  | { kind: 'intro' }
  | { kind: 'satOut' }
  | { kind: 'team'; index: number }
  | { kind: 'summary' };

const INTRO_MS = 2200;
const SAT_OUT_MS = 3200;
const TEAM_MS = 3600;

/**
 * Broadcast-style reveal shown right after a draw: the teams come out one by
 * one (crest, name, lineup) before handing control back to the bracket.
 */
export default function DrawRevealOverlay({
  teams,
  satOutPlayer,
  onClose,
}: {
  teams: TeamDto[];
  satOutPlayer: Player | null;
  onClose: () => void;
}) {
  const steps = useMemo<Step[]>(() => {
    const s: Step[] = [{ kind: 'intro' }];
    if (satOutPlayer) s.push({ kind: 'satOut' });
    teams.forEach((_, index) => s.push({ kind: 'team', index }));
    s.push({ kind: 'summary' });
    return s;
  }, [teams, satOutPlayer]);

  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];

  // Auto-advance every step except the final summary, which waits for the user.
  useEffect(() => {
    if (step.kind === 'summary') return;
    const ms = step.kind === 'intro' ? INTRO_MS : step.kind === 'satOut' ? SAT_OUT_MS : TEAM_MS;
    const t = setTimeout(() => setStepIndex((i) => Math.min(i + 1, steps.length - 1)), ms);
    return () => clearTimeout(t);
  }, [step, steps.length]);

  function advance() {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  const teamCount = teams.length;

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-coal-975/95 backdrop-blur-sm"
      onClick={() => step.kind !== 'summary' && advance()}
    >
      <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-ember-radial" />

      <div className="relative flex min-h-full flex-col items-center justify-center px-5 py-10">
        {step.kind === 'intro' && (
          <div key="intro" className="text-center">
            <p className="animate-pop-in text-6xl">🎲</p>
            <h2 className="mt-4 animate-slam-in font-display text-4xl uppercase tracking-tight text-white sm:text-6xl">
              ¡Sorteo realizado!
            </h2>
            <p className="mt-4 animate-pulse font-condensed text-sm font-bold uppercase tracking-broadcast text-ember-400">
              Presentando a los equipos…
            </p>
          </div>
        )}

        {step.kind === 'satOut' && satOutPlayer && (
          <div key="satOut" className="text-center">
            <p className="animate-pop-in text-6xl">😔</p>
            <p className="mt-5 animate-slam-in font-condensed text-sm font-bold uppercase tracking-broadcast text-amber-400">
              Número impar · se queda fuera
            </p>
            <h2
              className="animate-slam-in mt-2 font-display text-4xl uppercase tracking-tight text-amber-200 sm:text-6xl"
              style={{ animationDelay: '250ms' }}
            >
              {satOutPlayer.name}
            </h2>
          </div>
        )}

        {step.kind === 'team' && (
          <div key={teams[step.index].id} className="w-full max-w-md text-center">
            <p className="animate-fade-in font-condensed text-sm font-bold uppercase tracking-broadcast text-ember-400">
              Equipo {step.index + 1} de {teamCount}
            </p>
            <div className="mt-6 flex justify-center">
              <span className="animate-pop-in">
                <TeamCrest name={teams[step.index].name} size="xl" />
              </span>
            </div>
            <h2
              className="animate-slam-in mt-5 font-display text-4xl uppercase leading-none tracking-tight text-white sm:text-5xl"
              style={{ animationDelay: '200ms' }}
            >
              {teams[step.index].name}
            </h2>
            <div className="animate-rise mx-auto mt-7 max-w-sm" style={{ animationDelay: '550ms' }}>
              <TeamLineup
                front={teams[step.index].player1.name}
                back={teams[step.index].player2.name}
              />
            </div>
          </div>
        )}

        {step.kind === 'summary' && (
          <div key="summary" className="w-full max-w-2xl text-center">
            <p className="animate-fade-in font-condensed text-sm font-bold uppercase tracking-broadcast text-ember-400">
              Los {teamCount} equipos
            </p>
            <h2 className="mt-2 animate-slam-in font-display text-3xl uppercase tracking-tight text-white sm:text-4xl">
              ¡Que empiece la competición!
            </h2>
            <ul className="mt-8 grid gap-3 text-left sm:grid-cols-2">
              {teams.map((team, i) => (
                <li
                  key={team.id}
                  style={{ animationDelay: `${200 + i * 120}ms` }}
                  className="animate-rise rounded-xl border border-coal-700/60 bg-coal-900/80 p-3"
                >
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <TeamCrest name={team.name} size="md" />
                    <p className="truncate text-[15px] font-semibold text-zinc-100">{team.name}</p>
                  </div>
                  <TeamLineup front={team.player1.name} back={team.player2.name} />
                </li>
              ))}
            </ul>
            <button
              onClick={onClose}
              className="btn-primary animate-rise mt-8 px-8"
              style={{ animationDelay: `${200 + teamCount * 120}ms` }}
            >
              ¡A jugar! 🔥
            </button>
          </div>
        )}

        {/* Progress dots + skip, hidden on the summary */}
        {step.kind !== 'summary' && (
          <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-3">
            <div className="flex gap-1.5">
              {steps.slice(0, -1).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === stepIndex ? 'w-5 bg-ember-500' : 'w-1.5 bg-coal-600'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setStepIndex(steps.length - 1);
              }}
              className="btn-ghost text-xs"
            >
              Saltar presentación →
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
