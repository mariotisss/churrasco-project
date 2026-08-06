// "Camino al título" drawn as an actual knockout bracket instead of a row of stages:
// the qualified teams feed the ties, the ties feed the Finalissima and the Finalissima
// feeds the trophy, with the connectors drawn between the rounds.
//
// The bracket is always complete, even before the league ends: rounds that don't exist
// yet are previewed from the current table and marked as provisional, so you can see
// the shape of the tournament (and who is heading where) from day one.
//
// In the single-round format the rounds are a ladder, not a bracket: the 4º plays the
// 3º, the winner plays the 2º and whoever survives plays the 1º. Each rung only becomes
// a real match once the one below it is played, so the ones above are drawn as previews.

import { Fragment } from 'react';
import type { EditionDetail, Leg, MatchDto, PlayerRef, Side, StandingRow } from '../api/types';
import { LADDER_LEGS, LEG_LABELS, hasLadder, leagueProgress, playoffSpots } from '../lib/tournament';
import TeamCrest from './TeamCrest';
import { SIDE_LABEL, SideSwatch, sidesForMatch } from './MatchSide';

/** One team's line inside a bracket box. */
interface Slot {
  /** League position, when the team is known. */
  seed: number | null;
  name: string | null;
  /** The team's two players, for the crest; null while the team is undecided. */
  players: [PlayerRef, PlayerRef] | null;
  /** Goals, once the tie has been played. */
  score: number | null;
  /** League points, shown while the tie is still only a preview. */
  points: number | null;
  side: Side | null;
  outcome: 'win' | 'loss' | null;
  /** Shown in place of the name while the team is undecided. */
  placeholder?: string;
}

/** A box in the bracket: a tie (two slots) or a single qualified team. */
interface Box {
  key: string;
  slots: Slot[];
  /** Not a real match yet — previewed from the standings. */
  provisional: boolean;
  accent?: boolean;
}

function StageLabel({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <p
      className={`mb-2.5 font-condensed text-[11px] font-bold uppercase tracking-broadcast ${
        accent ? 'text-ember-400' : 'text-zinc-500'
      }`}
    >
      {children}
    </p>
  );
}

/** A column of the bracket: its label, then its boxes centred against the tallest column. */
function Round({
  label,
  accent,
  children,
  className = '',
}: {
  label: string;
  accent?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      <StageLabel accent={accent}>{label}</StageLabel>
      <div className="flex flex-1 flex-col justify-center gap-5">{children}</div>
    </div>
  );
}

/**
 * Bracket connector between two rounds, drawn edge to edge of the cell so it lines up
 * with the boxes on either side. `merge` joins two boxes into one, `line` is a straight
 * carry-over. Hidden on small screens, where the rounds stack instead.
 */
function Connector({ kind }: { kind: 'merge' | 'line' }) {
  return (
    <div className="hidden min-w-0 flex-col lg:flex">
      {/* Keeps the drawing aligned with the boxes, below the round labels. */}
      <p aria-hidden className="mb-2.5 font-condensed text-[11px] font-bold uppercase leading-normal opacity-0">
        ·
      </p>
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full flex-1 text-coal-700"
      >
        <path
          d={kind === 'merge' ? 'M0 25 H55 M0 75 H55 M55 25 V75 M55 50 H100' : 'M0 50 H100'}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

function SlotRow({ slot }: { slot: Slot }) {
  const lost = slot.outcome === 'loss';
  const won = slot.outcome === 'win';

  return (
    <div className={`flex items-stretch gap-0 ${won ? 'bg-emerald-500/[0.07]' : ''}`}>
      {/* Side of the table, as a colored edge on the team's row. */}
      <span
        className="w-1 shrink-0 self-stretch"
        title={slot.side ? SIDE_LABEL[slot.side] : undefined}
      >
        {slot.side && <SideSwatch side={slot.side} className="block h-full w-full" />}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2">
        <span
          className={`w-4 shrink-0 text-center font-condensed text-xs font-bold tabular-nums ${
            lost ? 'text-zinc-600' : 'text-zinc-500'
          }`}
        >
          {slot.seed ?? '·'}
        </span>
        {slot.name ? (
          <>
            <TeamCrest name={slot.name} players={slot.players ?? undefined} size="sm" />
            <span
              className={`min-w-0 flex-1 truncate text-[13px] ${
                won
                  ? 'font-bold text-white'
                  : lost
                    ? 'font-medium text-zinc-500'
                    : 'font-semibold text-zinc-200'
              }`}
            >
              {slot.name}
            </span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate font-condensed text-xs font-semibold uppercase tracking-wide text-zinc-600">
            {slot.placeholder ?? 'Por definir'}
          </span>
        )}
        {slot.score !== null ? (
          <span
            className={`shrink-0 font-display text-base leading-none tabular-nums ${
              won ? 'text-white' : 'text-zinc-600'
            }`}
          >
            {slot.score}
          </span>
        ) : (
          slot.points !== null && (
            <span className="shrink-0 font-condensed text-[11px] font-bold uppercase tracking-wide tabular-nums text-zinc-500">
              {slot.points} pts
            </span>
          )
        )}
      </div>
    </div>
  );
}

function BracketBox({ box }: { box: Box }) {
  return (
    <div
      className={`overflow-hidden rounded-lg border ${
        box.provisional
          ? 'border-dashed border-coal-700 bg-coal-950/40'
          : box.accent
            ? 'border-ember-500/40 bg-coal-950/60'
            : 'border-coal-700/70 bg-coal-950/60'
      }`}
    >
      {box.slots.map((slot, i) => (
        <div key={i} className={i > 0 ? 'border-t border-coal-800/80' : ''}>
          <SlotRow slot={slot} />
        </div>
      ))}
    </div>
  );
}

/** A column of the bracket: everything played (or previewed) at the same stage. */
interface RoundData {
  key: string;
  label: string;
  boxes: Box[];
  accent: boolean;
}

/** A round's label; a legacy edition with the old two-tie bracket says "Semifinales". */
function roundLabel(leg: Leg, ties: number): string {
  return leg === 'SEMIFINAL' && ties > 1 ? 'Semifinales' : LEG_LABELS[leg];
}

export default function RoadToFinal({ detail }: { detail: EditionDetail }) {
  const ladder = hasLadder(detail);
  const fin = detail.finalissima;
  const champ = detail.champion;
  const table = detail.standings;
  const { played, total } = leagueProgress(detail);
  const leagueDone = total > 0 && played === total;

  const seedOf = (teamId: number): number | null =>
    table.find((r) => r.teamId === teamId)?.position ?? null;

  function slotFromRow(row: StandingRow | undefined): Slot {
    return {
      seed: row?.position ?? null,
      name: row?.teamName ?? null,
      players: row ? [row.player1, row.player2] : null,
      score: null,
      points: row?.points ?? null,
      side: null,
      outcome: null,
    };
  }

  function boxFromMatch(match: MatchDto, accent = false): Box {
    const sides = sidesForMatch(match);
    const isPlayed = match.status === 'PLAYED';
    const homeWon = isPlayed && (match.homeScore ?? 0) > (match.awayScore ?? 0);
    return {
      key: `m${match.id}`,
      provisional: false,
      accent,
      slots: [
        {
          seed: seedOf(match.homeTeam.id),
          name: match.homeTeam.name,
          players: [match.homeTeam.player1, match.homeTeam.player2],
          score: isPlayed ? match.homeScore : null,
          points: null,
          side: sides?.home ?? null,
          outcome: isPlayed ? (homeWon ? 'win' : 'loss') : null,
        },
        {
          seed: seedOf(match.awayTeam.id),
          name: match.awayTeam.name,
          players: [match.awayTeam.player1, match.awayTeam.player2],
          score: isPlayed ? match.awayScore : null,
          points: null,
          side: sides?.away ?? null,
          outcome: isPlayed ? (homeWon ? 'loss' : 'win') : null,
        },
      ],
    };
  }

  function pendingSlot(placeholder: string): Slot {
    return {
      seed: null,
      name: null,
      players: null,
      score: null,
      points: null,
      side: null,
      outcome: null,
      placeholder,
    };
  }

  // --- The rounds before the Finalissima. The ones that already exist are drawn from
  // their matches, grouped by leg; a legacy edition (the old 1º-4º / 2º-3º bracket) lands
  // here as a single round with two ties, which draws just fine.
  const existingLegs = LADDER_LEGS.filter((leg) => detail.playoffs.some((m) => m.leg === leg));
  const rounds: RoundData[] = existingLegs.map((leg) => {
    const ties = detail.playoffs.filter((m) => m.leg === leg);
    return {
      key: leg,
      label: roundLabel(leg, ties.length),
      accent: true,
      boxes: ties.map((m) => boxFromMatch(m)),
    };
  });

  // Rungs still to climb, previewed from the table so the whole ladder is visible from
  // day one: the 3º hosts the 4º, and the 2º waits for whoever comes up.
  if (ladder) {
    const climbed = existingLegs.length
      ? LADDER_LEGS.indexOf(existingLegs[existingLegs.length - 1])
      : -1;
    for (const leg of LADDER_LEGS.slice(climbed + 1)) {
      rounds.push({
        key: leg,
        label: LEG_LABELS[leg],
        accent: false,
        boxes: [
          {
            key: leg,
            provisional: true,
            slots:
              leg === 'CRUCE'
                ? [slotFromRow(table[2]), slotFromRow(table[3])]
                : [slotFromRow(table[1]), pendingSlot('Ganador del cruce')],
          },
        ],
      });
    }
  }

  // Ida y vuelta: no knockout rounds at all, the top 2 go straight to the Finalissima.
  if (rounds.length === 0) {
    rounds.push({
      key: 'liga',
      label: 'Clasificados · Liga',
      accent: false,
      boxes: table.slice(0, playoffSpots(detail)).map((row, i) => ({
        key: `seed${i}`,
        provisional: false,
        slots: [slotFromRow(row)],
      })),
    });
  }

  // --- The Finalissima: the real match, or a preview of who is heading there.
  const finalBox: Box = fin
    ? boxFromMatch(fin, true)
    : {
        key: 'final',
        provisional: true,
        slots: ladder
          ? [slotFromRow(table[0]), pendingSlot('Ganador de la semifinal')]
          : [slotFromRow(table[0]), slotFromRow(table[1])],
      };

  // One column per round plus the Finalissima and the trophy, with a connector between.
  const gridClass =
    rounds.length > 1
      ? 'lg:grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)_2rem_minmax(0,1fr)_2rem_minmax(0,0.85fr)]'
      : 'lg:grid-cols-[minmax(0,1.1fr)_2.5rem_minmax(0,1fr)_2.5rem_minmax(0,0.9fr)]';

  return (
    <div className="panel p-5 sm:p-6">
      {/* Format + league progress: the context the bracket hangs from. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-coal-800 pb-4">
        <p className="font-condensed text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {ladder
            ? 'Liga a una vuelta · eliminatorias en escalera'
            : 'Liga ida y vuelta · final directa'}
        </p>
        <div className="flex items-center gap-2.5">
          <div className="h-1 w-24 overflow-hidden rounded-full bg-coal-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ember-500 to-ember-400 transition-all"
              style={{ width: `${total ? (played / total) * 100 : 0}%` }}
            />
          </div>
          <span className="font-condensed text-[11px] font-semibold uppercase tracking-wide tabular-nums text-zinc-500">
            Liga {played}/{total}
          </span>
        </div>
      </div>

      <div className={`grid gap-4 lg:items-stretch lg:gap-x-0 ${gridClass}`}>
        {rounds.map((round) => (
          <Fragment key={round.key}>
            <Round label={round.label} accent={round.accent}>
              {round.boxes.map((box) => (
                <BracketBox key={box.key} box={box} />
              ))}
            </Round>
            <Connector kind={round.boxes.length > 1 ? 'merge' : 'line'} />
          </Fragment>
        ))}

        <Round label="Finalissima" accent={!!fin}>
          <BracketBox box={finalBox} />
          {!fin && (
            <p className="text-center font-condensed text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
              {ladder
                ? 'Se define al jugarse las eliminatorias'
                : leagueDone
                  ? 'Por jugar'
                  : 'Se define al terminar la liga'}
            </p>
          )}
        </Round>

        <Connector kind="line" />

        <Round label="Campeón">
          {champ ? (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-3">
              <span className="text-2xl">🏆</span>
              <span className="min-w-0 truncate font-display text-xl uppercase leading-none tracking-tight text-white">
                {champ.name}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-coal-700 bg-coal-950/40 px-3 py-3">
              <span className="text-2xl opacity-40 grayscale">🏆</span>
              <span className="font-condensed text-sm font-semibold uppercase tracking-wide text-zinc-600">
                Por decidir
              </span>
            </div>
          )}
        </Round>
      </div>
    </div>
  );
}
