import axios from 'axios';
import type {
  EditionDetail,
  EditionSummary,
  Penalty,
  Player,
  PlayerStanding,
  StandingRow,
} from './types';

const api = axios.create({ baseURL: '/api' });

/** Extracts the backend error message (ApiError) to show in the UI. */
export function apiErrorMessage(error: unknown, fallback = 'Algo ha fallado'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
  }
  return fallback;
}

// --- Players ---
export async function getPlayers(activeOnly = false): Promise<Player[]> {
  const { data } = await api.get<Player[]>('/players', { params: { activeOnly } });
  return data;
}

export async function createPlayer(name: string): Promise<Player> {
  const { data } = await api.post<Player>('/players', { name });
  return data;
}

export async function updatePlayer(
  id: number,
  body: { name?: string; active?: boolean },
): Promise<Player> {
  const { data } = await api.patch<Player>(`/players/${id}`, body);
  return data;
}

export async function deletePlayer(id: number): Promise<void> {
  await api.delete(`/players/${id}`);
}

export async function getPlayerStandings(): Promise<PlayerStanding[]> {
  const { data } = await api.get<PlayerStanding[]>('/players/standings');
  return data;
}

// --- Penalties ---
export async function getPenalties(): Promise<Penalty[]> {
  const { data } = await api.get<Penalty[]>('/penalties');
  return data;
}

export async function createPenalty(body: {
  playerId: number;
  points: number;
  reason: string;
}): Promise<Penalty> {
  const { data } = await api.post<Penalty>('/penalties', body);
  return data;
}

export async function updatePenalty(
  id: number,
  body: { points: number; reason: string },
): Promise<Penalty> {
  const { data } = await api.put<Penalty>(`/penalties/${id}`, body);
  return data;
}

export async function deletePenalty(id: number): Promise<void> {
  await api.delete(`/penalties/${id}`);
}

// --- Editions ---
export async function getEditions(): Promise<EditionSummary[]> {
  const { data } = await api.get<EditionSummary[]>('/editions');
  return data;
}

export async function createEdition(name: string, test = false): Promise<EditionSummary> {
  const { data } = await api.post<EditionSummary>('/editions', { name, test });
  return data;
}

export async function getEdition(id: number): Promise<EditionDetail> {
  const { data } = await api.get<EditionDetail>(`/editions/${id}`);
  return data;
}

export async function deleteEdition(id: number): Promise<void> {
  await api.delete(`/editions/${id}`);
}

export async function drawTeams(
  id: number,
  participantIds?: number[],
): Promise<EditionDetail> {
  const { data } = await api.post<EditionDetail>(`/editions/${id}/draw`, {
    participantIds: participantIds ?? null,
  });
  return data;
}

export async function getStandings(id: number): Promise<StandingRow[]> {
  const { data } = await api.get<StandingRow[]>(`/editions/${id}/standings`);
  return data;
}

// --- Matches ---
export async function recordResult(
  matchId: number,
  homeScore: number,
  awayScore: number,
): Promise<EditionDetail> {
  const { data } = await api.put<EditionDetail>(`/matches/${matchId}/result`, {
    homeScore,
    awayScore,
  });
  return data;
}
