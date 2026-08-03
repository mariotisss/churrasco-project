// Types mirroring the backend DTOs.

export interface Player {
  id: number;
  name: string;
  active: boolean;
  createdAt: string;
}

export interface TeamRef {
  id: number;
  name: string;
}

export interface TeamDto {
  id: number;
  name: string;
  player1: Player;
  player2: Player;
}

export type Leg = 'IDA' | 'VUELTA' | 'SEMIFINAL' | 'FINAL';
export type MatchStatus = 'PENDING' | 'PLAYED';

/** The two sides of the futbolín table. */
export type Side = 'ROJIBLANCO' | 'AZUL';

export interface MatchDto {
  id: number;
  leg: Leg;
  orderIndex: number;
  /** In a playoff match the home team is the better classified: the one that picks the side. */
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  /** true = semifinal or Finalissima; these never count for the league table. */
  playoff: boolean;
  /** Side picked by the home team of a playoff match, null while nobody has picked. */
  chosenSide: Side | null;
  playedAt: string | null;
}

export interface StandingRow {
  position: number;
  teamId: number;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export type EditionStatus = 'DRAFT' | 'TEAMS_DRAWN' | 'IN_PROGRESS' | 'FINISHED';

export interface EditionSummary {
  id: number;
  name: string;
  status: EditionStatus;
  test: boolean;
  createdAt: string;
  champion: TeamRef | null;
}

export interface PlayerStanding {
  playerId: number;
  name: string;
  points: number;
  championships: number;
  runnerUps: number;
  penaltyPoints: number;
}

export interface Penalty {
  id: number;
  playerId: number;
  playerName: string;
  points: number;
  reason: string;
  createdAt: string;
}

export interface EditionDetail {
  id: number;
  name: string;
  status: EditionStatus;
  test: boolean;
  /** true = ida y vuelta (double round-robin); false = partido único (single). */
  roundTrip: boolean;
  satOutPlayer: Player | null;
  champion: TeamRef | null;
  teams: TeamDto[];
  standings: StandingRow[];
  matches: MatchDto[];
  /** 1º vs 4º and 2º vs 3º; only in the single-round format, once the league is over. */
  semifinals: MatchDto[];
  finalissima: MatchDto | null;
}
