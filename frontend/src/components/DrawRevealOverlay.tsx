import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Player, PlayerRef, TeamDto } from '../api/types';
import PlayerAvatar from './PlayerAvatar';
import TeamCrest from './TeamCrest';
import TeamLineup, { AttackIcon, ShieldIcon } from './TeamLineup';

// The roulette spins bare names, so the pot and the reels only ever know who they are
// showing by name. This directory lets them put a face to it without every reel having
// to be handed the whole roster.
const Directory = createContext<Map<string, PlayerRef>>(new Map());

function usePlayer(name: string): PlayerRef {
  const byName = useContext(Directory);
  return byName.get(name) ?? { id: 0, name, photoVersion: null };
}

/**
 * One person in the draw: their face if they have one, initials otherwise. Never
 * zoomable — during the reveal a tap anywhere means "next", not "show me that photo".
 */
function DrawFace({ name, size }: { name: string; size: 'sm' | 'xl' }) {
  return <PlayerAvatar player={usePlayer(name)} size={size} zoomable={false} />;
}

type Step =
  | { kind: 'intro' }
  | { kind: 'satOut' }
  | { kind: 'team'; index: number }
  | { kind: 'summary' };

/** Steps that play an animation and can be fast-forwarded before they advance. */
const ANIMATED: Step['kind'][] = ['satOut', 'team'];

/** Roulette pacing: ticks start snappy and stretch out as the spin runs out of time. */
const TICK_FAST_MS = 55;
const TICK_SLOW_MS = 320;

/** How much of the run is spent still going fast (higher = later, sharper braking). */
const BRAKE_CURVE = 2.5;

/** How long one run of the selector lasts, from full speed to its stop. */
const SPIN_MS = 2500;

/**
 * Pause after a name is out before the selector starts its next run. Long enough to
 * take in who came out: their chip stays marked in the pot and their name is already
 * written into the team above.
 */
const HANDOVER_MS = 2000;

/** Pause after the pair is complete before the team itself is revealed. */
const REVEAL_MS = 700;

/** The selector's journey through a team: one run per rod, then the team. */
type TeamBeat = 'frontSpin' | 'frontLock' | 'backSpin' | 'backLock' | 'done';

/** A name other than the current one, so the roulette never looks stuck. */
function pickOther(pool: string[], current: string): string {
  if (pool.length <= 1) return pool[0] ?? current;
  const others = pool.filter((name) => name !== current);
  return others[Math.floor(Math.random() * others.length)];
}

/**
 * Cycles through the pool while `active`, braking as it approaches `durationMs` — the
 * moment the name is due to lock — so the last few names crawl past instead of blurring.
 */
function useNameRoulette(pool: string[], active: boolean, durationMs: number): string {
  const [name, setName] = useState(() => pool[0] ?? '');
  useEffect(() => {
    if (!active || pool.length === 0) return;
    const start = performance.now();
    let timer = 0;
    const tick = () => {
      setName((current) => pickOther(pool, current));
      const progress = Math.min((performance.now() - start) / durationMs, 1);
      const delay = TICK_FAST_MS + (TICK_SLOW_MS - TICK_FAST_MS) * progress ** BRAKE_CURVE;
      timer = window.setTimeout(tick, delay);
    };
    timer = window.setTimeout(tick, TICK_FAST_MS);
    return () => window.clearTimeout(timer);
  }, [active, pool, durationMs]);
  return name;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Runs a sequence of timed phases, unless motion is reduced (then it lands on the last
 * phase straight away). `rush` jumps to the end — a click should never be made to wait.
 */
function usePhases<T extends string>(phases: readonly T[], delaysMs: number[], rush: number): T {
  const last = phases[phases.length - 1];
  const [phase, setPhase] = useState<T>(() => (prefersReducedMotion() ? last : phases[0]));

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timers = phases.slice(1).map((next, i) =>
      setTimeout(() => setPhase((current) => (current === last ? last : next)), delaysMs[i]),
    );
    return () => timers.forEach(clearTimeout);
    // Deliberately mount-only: each step remounts with its own schedule (see the `key`
    // on TeamStep), so re-running this on every render would restart the countdown.
  }, []);

  useEffect(() => {
    if (rush > 0) setPhase(last);
  }, [rush, last]);

  return phase;
}

/** The panel the draw plays out on, with its step number ghosted behind. */
function Stage({
  eyebrow,
  tone = 'ember',
  number,
  children,
}: {
  eyebrow: string;
  tone?: 'ember' | 'amber';
  number?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-coal-700/60 bg-coal-900/85 p-5 shadow-card sm:p-6">
      {number && (
        <span className="pointer-events-none absolute right-4 top-1 font-display text-[4.5rem] leading-none text-white/[0.05]">
          {number}
        </span>
      )}
      <p
        className={`relative font-condensed text-sm font-bold uppercase tracking-broadcast ${
          tone === 'amber' ? 'text-amber-400' : 'text-ember-400'
        }`}
      >
        {eyebrow}
      </p>
      <div className="relative">{children}</div>
    </div>
  );
}

/**
 * One rod of the table. Only one rod runs at a time: the other waits its turn as an
 * empty slot, so there is always a single selector to follow.
 */
function RouletteRow({
  label,
  tone,
  name,
  state,
}: {
  label: string;
  tone: 'ember' | 'sky';
  name: string;
  state: 'waiting' | 'spinning' | 'locked';
}) {
  const locked = state === 'locked';
  const Icon = tone === 'ember' ? AttackIcon : ShieldIcon;
  const badge =
    tone === 'ember'
      ? 'border-ember-500/40 bg-ember-500/10 text-ember-300'
      : 'border-sky-500/40 bg-sky-500/10 text-sky-300';
  const accent = tone === 'ember' ? 'text-ember-300' : 'text-sky-300';

  return (
    <div
      className={`relative flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors duration-200 ${
        locked
          ? 'border-coal-600 bg-coal-950/70'
          : state === 'spinning'
            ? 'border-dashed border-coal-600 bg-coal-950/40'
            : 'border-dashed border-coal-800 bg-coal-950/20'
      }`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${
          locked ? badge : 'border-coal-700 text-zinc-600'
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span
        className={`hidden w-16 shrink-0 font-condensed text-[11px] font-bold uppercase tracking-broadcast sm:block ${
          locked ? accent : 'text-zinc-600'
        }`}
      >
        {label}
      </span>

      <span className="flex min-w-0 flex-1 items-center justify-center gap-2.5">
        {state === 'waiting' ? (
          <span className="grid h-7 w-7 place-items-center rounded-xl border border-dashed border-coal-700 font-condensed text-xs font-bold text-coal-600">
            ?
          </span>
        ) : (
          <span className={locked ? '' : 'opacity-60'}>
            <DrawFace name={name} size="sm" />
          </span>
        )}
        <span
          // Keyed on the state, not the name: the element stays put through the spin
          // and only remounts to slam in once the name is out.
          key={state}
          className={`min-w-0 truncate font-display text-2xl uppercase leading-none tracking-tight sm:text-3xl ${
            locked
              ? 'animate-slam-in text-white'
              : state === 'spinning'
                ? 'text-zinc-500 blur-[1.5px]'
                : 'text-coal-600'
          }`}
        >
          {state === 'waiting' ? '¿?' : name}
        </span>
      </span>

      <span className="flex w-7 shrink-0 justify-end">
        {locked && <span className="animate-pop-in inline-block text-base">🔒</span>}
        {state === 'spinning' && (
          <span className="inline-block animate-pulse font-display text-base text-ember-500">···</span>
        )}
      </span>
    </div>
  );
}

/**
 * Everybody still waiting to be paired. Names already drawn stay in place but fade out,
 * so the pot visibly empties without the layout jumping around mid-spin. The name that
 * has just come out stays marked until the selector starts its next run.
 */
function Pot({
  participants,
  drawn,
  active = [],
  picked = [],
}: {
  participants: string[];
  drawn: Set<string>;
  active?: string[];
  picked?: string[];
}) {
  const left = participants.length - drawn.size;
  return (
    <div className="w-full max-w-2xl">
      <p className="mb-2 text-center font-condensed text-[11px] font-bold uppercase tracking-broadcast text-zinc-500">
        En el bombo · {left} {left === 1 ? 'jugador' : 'jugadores'}
      </p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {participants.map((name) => {
          const isPicked = picked.includes(name);
          const isOut = !isPicked && drawn.has(name);
          const isActive = !isOut && !isPicked && active.includes(name);
          return (
            <span
              key={name}
              // No transition on the highlight: the selector moves faster than any
              // fade could keep up with, and a lagging ring smears across the pot.
              className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs font-medium ${
                isPicked
                  ? 'border-emerald-500/60 bg-emerald-500/15 font-semibold text-emerald-100'
                  : isOut
                    ? 'border-coal-800 bg-coal-950/30 text-zinc-700 opacity-40'
                    : isActive
                      ? 'border-ember-500/60 bg-ember-500/15 text-ember-100'
                      : 'border-coal-700 bg-coal-900/70 text-zinc-300'
              }`}
            >
              <span className={isOut ? 'opacity-50 grayscale' : ''}>
                <DrawFace name={name} size="sm" />
              </span>
              {name}
              {isPicked && <span className="text-emerald-400">✓</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** The teams already out of the hat, so the screen builds up as the draw goes on. */
function DrawnTeams({ teams }: { teams: TeamDto[] }) {
  if (teams.length === 0) return null;
  return (
    <div className="w-full max-w-2xl">
      <p className="mb-2 text-center font-condensed text-[11px] font-bold uppercase tracking-broadcast text-zinc-500">
        Equipos formados
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {teams.map((team) => (
          <span
            key={team.id}
            className="animate-rise flex items-center gap-2 rounded-xl border border-coal-700/60 bg-coal-900/70 py-1.5 pl-1.5 pr-3"
          >
            <TeamCrest name={team.name} players={[team.player1, team.player2]} size="sm" zoomable={false} />
            <span className="text-[13px] font-semibold text-zinc-200">{team.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * A team coming out of the hat: both names spin, the front rod locks first, then the
 * back rod, and only once the pair is settled does the team get its crest and name.
 */
function TeamStep({
  team,
  index,
  total,
  pool,
  participants,
  drawn,
  drawnTeams,
  rush,
  onSettled,
}: {
  team: TeamDto;
  index: number;
  total: number;
  pool: string[];
  participants: string[];
  drawn: Set<string>;
  drawnTeams: TeamDto[];
  rush: number;
  onSettled: () => void;
}) {
  // One selector, two runs: it brakes to a stop on the front rod, holds there long
  // enough to take the name in, and only then restarts at full speed for the back rod.
  const [beat, setBeat] = useState<TeamBeat>(() => (prefersReducedMotion() ? 'done' : 'frontSpin'));
  const frontLocked = beat !== 'frontSpin';
  const backSpinning = beat === 'backSpin';
  const backLocked = beat === 'backLock' || beat === 'done';

  const spinningFront = useNameRoulette(pool, beat === 'frontSpin', SPIN_MS);
  const spinningBack = useNameRoulette(pool, backSpinning, SPIN_MS);
  const frontName = frontLocked ? team.player1.name : spinningFront;
  const backName = backLocked ? team.player2.name : spinningBack;

  useEffect(() => {
    if (beat === 'done') return;
    const NEXT = {
      frontSpin: ['frontLock', SPIN_MS],
      frontLock: ['backSpin', HANDOVER_MS],
      backSpin: ['backLock', SPIN_MS],
      backLock: ['done', REVEAL_MS],
    } as const;
    const [next, delay] = NEXT[beat];
    const timer = setTimeout(() => setBeat(next), delay);
    return () => clearTimeout(timer);
  }, [beat]);

  useEffect(() => {
    if (rush > 0) setBeat('done');
  }, [rush]);

  useEffect(() => {
    if (beat === 'done') onSettled();
  }, [beat, onSettled]);

  // Names already out leave the pot; the rest keep flickering in it.
  const potDrawn = useMemo(() => {
    const next = new Set(drawn);
    if (frontLocked) next.add(team.player1.name);
    if (backLocked) next.add(team.player2.name);
    return next;
  }, [drawn, frontLocked, backLocked, team]);

  return (
    <>
      <Stage eyebrow={`Equipo ${index + 1} de ${total}`} number={`${index + 1}`}>
        <div className="mt-5 space-y-2">
          <RouletteRow
            label="Delante"
            tone="ember"
            name={frontName}
            state={frontLocked ? 'locked' : 'spinning'}
          />
          <div className="text-center font-display text-lg leading-none text-coal-600">&</div>
          <RouletteRow
            label="Atrás"
            tone="sky"
            name={backName}
            state={backLocked ? 'locked' : backSpinning ? 'spinning' : 'waiting'}
          />
        </div>

        {/* The team name writes itself as the rods lock: ¿? & ¿? → Werwer & ¿? → done. */}
        <div className="mt-6 flex flex-col items-center">
          {beat === 'done' ? (
            <span className="animate-pop-in">
              <TeamCrest name={team.name} players={[team.player1, team.player2]} size="xl" zoomable={false} />
            </span>
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-xl border border-dashed border-coal-700 font-display text-2xl text-coal-600">
              ?
            </span>
          )}
          <h2
            key={beat === 'done' ? 'done' : 'pending'}
            className={`mt-4 text-center font-display text-3xl uppercase leading-none tracking-tight sm:text-4xl ${
              beat === 'done' ? 'animate-slam-in text-white' : 'text-zinc-600'
            }`}
          >
            {beat === 'done' ? (
              team.name
            ) : (
              <>
                <span className={frontLocked ? 'text-zinc-300' : ''}>
                  {frontLocked ? frontName : '¿?'}
                </span>{' '}
                &amp;{' '}
                <span className={backLocked ? 'text-zinc-300' : ''}>
                  {backLocked ? backName : '¿?'}
                </span>
              </>
            )}
          </h2>
        </div>
      </Stage>

      {/* Only the rod the selector is on lights up a chip; the name it just stopped on
          stays marked through the pause, until the selector sets off again. */}
      <Pot
        participants={participants}
        drawn={potDrawn}
        active={[beat === 'frontSpin' ? frontName : '', backSpinning ? backName : '']}
        picked={[
          beat === 'frontLock' ? team.player1.name : '',
          beat === 'backLock' ? team.player2.name : '',
        ]}
      />
      <DrawnTeams teams={drawnTeams} />
    </>
  );
}

/** The odd one out, drawn with the same suspense as a team. */
function SatOutStep({
  player,
  pool,
  participants,
  rush,
  onSettled,
}: {
  player: Player;
  pool: string[];
  participants: string[];
  rush: number;
  onSettled: () => void;
}) {
  const phase = usePhases(['spin', 'done'] as const, [SPIN_MS], rush);
  const locked = phase === 'done';
  const spinning = useNameRoulette(pool, !locked, SPIN_MS);
  const name = locked ? player.name : spinning;

  useEffect(() => {
    if (locked) onSettled();
  }, [locked, onSettled]);

  return (
    <>
      <Stage eyebrow="Número impar · alguien se queda fuera" tone="amber">
        <div className="mt-6 flex flex-col items-center">
          <span className={locked ? '' : 'opacity-60'}>
            <DrawFace name={name} size="xl" />
          </span>
          <h2
            key={locked ? 'locked' : 'spinning'}
            className={`mt-5 text-center font-display text-4xl uppercase leading-none tracking-tight sm:text-5xl ${
              locked ? 'animate-slam-in text-amber-200' : 'text-zinc-500 blur-[2px]'
            }`}
          >
            {name}
          </h2>
          <p
            className={`mt-4 font-condensed text-sm font-semibold uppercase tracking-wide ${
              locked ? 'animate-fade-in text-amber-300/80' : 'text-zinc-600'
            }`}
          >
            {locked ? 'Se queda fuera esta edición' : 'Sorteando…'}
          </p>
        </div>
      </Stage>

      <Pot
        participants={participants}
        drawn={locked ? new Set([player.name]) : new Set()}
        active={locked ? [] : [name]}
        picked={locked ? [player.name] : []}
      />
    </>
  );
}

/**
 * Broadcast-style reveal shown right after a draw. Instead of showing the finished
 * teams, it draws them in front of you: names spin through the pot and lock one rod at
 * a time, so the pairing is a surprise until the last moment, while the pot empties and
 * the formed teams pile up. Advances on click (or space/enter), and a click during an
 * animation fast-forwards it rather than skipping ahead.
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

  // Everybody in the draw. Alphabetical on purpose: the order teams come in would give
  // the pairings away, and the roulette should look like it can land on anyone.
  const participants = useMemo(() => {
    const names = teams.flatMap((t) => [t.player1.name, t.player2.name]);
    if (satOutPlayer) names.push(satOutPlayer.name);
    return names.sort((a, b) => a.localeCompare(b));
  }, [teams, satOutPlayer]);

  const directory = useMemo(() => {
    const map = new Map<string, PlayerRef>();
    for (const t of teams) {
      map.set(t.player1.name, t.player1);
      map.set(t.player2.name, t.player2);
    }
    if (satOutPlayer) map.set(satOutPlayer.name, satOutPlayer);
    return map;
  }, [teams, satOutPlayer]);

  const [stepIndex, setStepIndex] = useState(0);
  const [settled, setSettled] = useState(false);
  const [rush, setRush] = useState(0);

  // While the reveal is on, the app underneath is frozen and hidden. Locking the scroll
  // stops the page moving behind the overlay, and hiding the shell (which lives in #root,
  // outside this portal) keeps its backdrop-blurred sidebar and top bar from being
  // composited over the overlay — the browser flickers them through otherwise.
  useEffect(() => {
    const root = document.getElementById('root');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (root) root.style.visibility = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      if (root) root.style.visibility = '';
    };
  }, []);
  const step = steps[stepIndex];
  const animated = ANIMATED.includes(step.kind);

  const advance = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    setSettled(false);
    setRush(0);
  }, [steps.length]);

  const onSettled = useCallback(() => setSettled(true), []);

  /** A click either finishes the running animation or moves on to the next step. */
  function tap() {
    if (step.kind === 'summary') return;
    if (animated && !settled) {
      setRush((r) => r + 1);
      return;
    }
    advance();
  }

  // Keep the tap handler out of the keyboard listener's dependencies.
  const tapRef = useRef(tap);
  tapRef.current = tap;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        tapRef.current();
      } else if (e.key === 'Escape') {
        setStepIndex(steps.length - 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [steps.length]);

  const teamCount = teams.length;
  const waiting = animated && !settled;

  // Names already assigned when the current team step starts (the sat-out player is
  // out of the pot from the moment the draw moves past them).
  const drawnBefore = useMemo(() => {
    if (step.kind !== 'team') return new Set<string>();
    const names = teams
      .slice(0, step.index)
      .flatMap((t) => [t.player1.name, t.player2.name]);
    if (satOutPlayer) names.push(satOutPlayer.name);
    return new Set(names);
  }, [step, teams, satOutPlayer]);

  // The roulette can only land on someone still in the pot.
  const spinPool = useMemo(
    () => participants.filter((name) => !drawnBefore.has(name)),
    [participants, drawnBefore],
  );

  return createPortal(
    <Directory.Provider value={directory}>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-coal-950" onClick={tap}>
        <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-40" />
        <div className="pointer-events-none absolute inset-0 bg-ember-radial" />

        <div className="relative flex min-h-full flex-col items-center justify-center gap-5 px-5 py-10">
          {step.kind === 'intro' && (
            <>
              <div key="intro" className="text-center">
                <p className="animate-pop-in text-5xl">🎲</p>
                <h2 className="mt-4 animate-slam-in font-display text-4xl uppercase tracking-tight text-white sm:text-5xl">
                  ¡Sorteo realizado!
                </h2>
                <p className="mt-3 font-condensed text-sm font-bold uppercase tracking-broadcast text-ember-400">
                  {satOutPlayer
                    ? 'Toca para ver quién se queda fuera'
                    : `Toca para formar los ${teamCount} equipos`}
                </p>
              </div>
              <Pot participants={participants} drawn={new Set()} />
            </>
          )}

          {step.kind === 'satOut' && satOutPlayer && (
            <SatOutStep
              key="satOut"
              player={satOutPlayer}
              pool={participants}
              participants={participants}
              rush={rush}
              onSettled={onSettled}
            />
          )}

          {step.kind === 'team' && (
            <TeamStep
              key={teams[step.index].id}
              team={teams[step.index]}
              index={step.index}
              total={teamCount}
              pool={spinPool}
              participants={participants}
              drawn={drawnBefore}
              drawnTeams={teams.slice(0, step.index)}
              rush={rush}
              onSettled={onSettled}
            />
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
                      <TeamCrest name={team.name} players={[team.player1, team.player2]} size="md" zoomable={false} />
                      <p className="truncate text-[15px] font-semibold text-zinc-100">{team.name}</p>
                    </div>
                    <TeamLineup front={team.player1} back={team.player2} />
                  </li>
                ))}
              </ul>
              <button
                onClick={onClose}
                className="btn-primary animate-rise mt-8 px-8"
                style={{ animationDelay: `${200 + teamCount * 120}ms` }}
              >
                ¡A jugar!
              </button>
            </div>
          )}

          {/* Tap-to-continue hint + progress dots + skip, hidden on the summary */}
          {step.kind !== 'summary' && (
            <div className="mt-3 flex flex-col items-center gap-3">
              <p
                className={`font-condensed text-[11px] font-semibold uppercase tracking-broadcast ${
                  waiting ? 'text-ember-400/80' : 'animate-pulse text-zinc-500'
                }`}
              >
                {waiting ? 'Sorteando…' : 'Toca para continuar →'}
              </p>
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
      </div>
    </Directory.Provider>,
    document.body,
  );
}
