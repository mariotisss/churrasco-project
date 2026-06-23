import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { EditionDetail } from './types';
import {
  createEdition,
  createPenalty,
  createPlayer,
  deleteEdition,
  deletePenalty,
  deletePlayer,
  drawTeams,
  getEdition,
  getEditions,
  getPenalties,
  getPlayers,
  getPlayerStandings,
  recordResult,
  updatePenalty,
  updatePlayer,
} from './client';

export const queryKeys = {
  players: (activeOnly: boolean) => ['players', { activeOnly }] as const,
  playerStandings: ['playerStandings'] as const,
  penalties: ['penalties'] as const,
  editions: ['editions'] as const,
  edition: (id: number) => ['edition', id] as const,
};

// --- Players ---
export function usePlayers(activeOnly = false) {
  return useQuery({
    queryKey: queryKeys.players(activeOnly),
    queryFn: () => getPlayers(activeOnly),
  });
}

export function usePlayerStandings() {
  return useQuery({
    queryKey: queryKeys.playerStandings,
    queryFn: getPlayerStandings,
  });
}

export function useCreatePlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createPlayer(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['players'] }),
  });
}

export function useUpdatePlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; name?: string; active?: boolean }) =>
      updatePlayer(vars.id, { name: vars.name, active: vars.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['players'] }),
  });
}

export function useDeletePlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePlayer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['players'] }),
  });
}

// --- Penalties ---
export function usePenalties() {
  return useQuery({ queryKey: queryKeys.penalties, queryFn: getPenalties });
}

/** A penalty change shifts the all-time points, so the ranking is invalidated too. */
function invalidatePenalties(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.penalties });
  qc.invalidateQueries({ queryKey: queryKeys.playerStandings });
}

export function useCreatePenalty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { playerId: number; points: number; reason: string }) =>
      createPenalty(vars),
    onSuccess: () => invalidatePenalties(qc),
  });
}

export function useUpdatePenalty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; points: number; reason: string }) =>
      updatePenalty(vars.id, { points: vars.points, reason: vars.reason }),
    onSuccess: () => invalidatePenalties(qc),
  });
}

export function useDeletePenalty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePenalty(id),
    onSuccess: () => invalidatePenalties(qc),
  });
}

// --- Editions ---
export function useEditions() {
  return useQuery({ queryKey: queryKeys.editions, queryFn: getEditions });
}

export function useCreateEdition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { name: string; test?: boolean }) =>
      createEdition(vars.name, vars.test),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.editions }),
  });
}

export function useDeleteEdition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteEdition(id),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: queryKeys.edition(id) });
      qc.invalidateQueries({ queryKey: queryKeys.editions });
      qc.invalidateQueries({ queryKey: queryKeys.playerStandings });
    },
  });
}

export function useEdition(id: number) {
  return useQuery({
    queryKey: queryKeys.edition(id),
    queryFn: () => getEdition(id),
    // The bracket refreshes itself every 15s (handy if several people are watching).
    refetchInterval: 15000,
  });
}

/** Writes the returned detail into the cache to repaint the bracket instantly. */
function cacheEdition(qc: ReturnType<typeof useQueryClient>, detail: EditionDetail) {
  qc.setQueryData(queryKeys.edition(detail.id), detail);
  qc.invalidateQueries({ queryKey: queryKeys.editions });
  // A recorded Finalissima can crown a champion, which changes the player ranking.
  qc.invalidateQueries({ queryKey: queryKeys.playerStandings });
}

export function useDrawTeams(editionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (participantIds?: number[]) => drawTeams(editionId, participantIds),
    onSuccess: (detail) => cacheEdition(qc, detail),
  });
}

export function useRecordResult(editionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { matchId: number; homeScore: number; awayScore: number }) =>
      recordResult(vars.matchId, vars.homeScore, vars.awayScore),
    onSuccess: (detail) => cacheEdition(qc, detail),
    // editionId pins the hook's type to the right edition detail.
    meta: { editionId },
  });
}
