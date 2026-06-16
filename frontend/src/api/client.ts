import axios from 'axios';
import type {
  EditionDetail,
  EditionSummary,
  Player,
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

// --- Editions ---
export async function getEditions(): Promise<EditionSummary[]> {
  const { data } = await api.get<EditionSummary[]>('/editions');
  return data;
}

export async function createEdition(name: string): Promise<EditionSummary> {
  const { data } = await api.post<EditionSummary>('/editions', { name });
  return data;
}

export async function getEdition(id: number): Promise<EditionDetail> {
  const { data } = await api.get<EditionDetail>(`/editions/${id}`);
  return data;
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
