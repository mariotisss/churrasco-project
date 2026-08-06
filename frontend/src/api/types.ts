// Types mirroring the backend DTOs.

export interface Player {
  id: number;
  name: string;
  active: boolean;
  createdAt: string;
  /** When the profile picture was last set (epoch millis), or null if there is none. */
  photoVersion: number | null;
}

/** Just enough of a player to draw them: name plus profile-picture version. */
export interface PlayerRef {
  id: number;
  name: string;
  photoVersion: number | null;
}

export interface TeamRef {
  id: number;
  name: string;
  player1: PlayerRef;
  player2: PlayerRef;
}

export interface TeamDto {
  id: number;
  name: string;
  player1: Player;
  player2: Player;
}

/** CRUCE is retired (the old ladder); it only turns up in editions drawn back then. */
export type Leg = 'IDA' | 'VUELTA' | 'CRUCE_ALTO' | 'CRUCE_BAJO' | 'SEMIFINAL' | 'FINAL' | 'CRUCE';
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
  /** true = knockout round or Finalissima; these never count for the league table. */
  playoff: boolean;
  /** Side picked by the home team of a playoff match, null while nobody has picked. */
  chosenSide: Side | null;
  playedAt: string | null;
}

export interface StandingRow {
  position: number;
  teamId: number;
  teamName: string;
  player1: PlayerRef;
  player2: PlayerRef;
  played: number;
  won: number;
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
  photoVersion: number | null;
  points: number;
  /** Non-test editions the player has been drawn into, decided or still under way. */
  editionsPlayed: number;
  championships: number;
  runnerUps: number;
  penaltyPoints: number;
}

export interface Penalty {
  id: number;
  playerId: number;
  playerName: string;
  playerPhotoVersion: number | null;
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
  /**
   * Knockout rounds before the Finalissima, in play order: the cruce alto (1º-2º), the
   * cruce bajo (4º at the 3º) and the semifinal that the loser of the alto plays against
   * the winner of the bajo. Only in the single-round format, and the semifinal only once
   * both cruces have been played.
   */
  playoffs: MatchDto[];
  finalissima: MatchDto | null;
}
