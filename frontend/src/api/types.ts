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

export type Leg = 'IDA' | 'VUELTA' | 'FINAL';
export type MatchStatus = 'PENDING' | 'PLAYED';

export interface MatchDto {
  id: number;
  leg: Leg;
  orderIndex: number;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  finalissima: boolean;
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
  satOutPlayer: Player | null;
  champion: TeamRef | null;
  teams: TeamDto[];
  standings: StandingRow[];
  matches: MatchDto[];
  finalissima: MatchDto | null;
}
