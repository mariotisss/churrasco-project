import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { EditionDetail, Side } from './types';
import {
  chooseSide,
  clearResult,
  createEdition,
  createPenalty,
  createPlayer,
  deleteEdition,
  deletePenalty,
  deletePlayer,
  deletePlayerPhoto,
  drawTeams,
  getEdition,
  getEditions,
  getPenalties,
  getPlayers,
  getPlayerStandings,
  recordResult,
  updatePenalty,
  updatePlayer,
  uploadPlayerPhoto,
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
  const refresh = useEverythingWithFaces();
  return useMutation({
    mutationFn: (vars: { id: number; name?: string; active?: boolean }) =>
      updatePlayer(vars.id, { name: vars.name, active: vars.active }),
    // Team names are derived from their players, so a rename renames the player's teams
    // in every edition too — drop everything that shows a team or a ranking.
    onSuccess: refresh,
  });
}

/** A new (or removed) picture shows up in teams, brackets and rankings, so refresh all. */
function useEverythingWithFaces() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['players'] });
    qc.invalidateQueries({ queryKey: queryKeys.playerStandings });
    qc.invalidateQueries({ queryKey: queryKeys.penalties });
    qc.invalidateQueries({ queryKey: queryKeys.editions });
    qc.invalidateQueries({ queryKey: ['edition'] });
  };
}

export function useUploadPlayerPhoto() {
  const refresh = useEverythingWithFaces();
  return useMutation({
    mutationFn: (vars: { id: number; image: Blob }) => uploadPlayerPhoto(vars.id, vars.image),
    onSuccess: refresh,
  });
}

export function useDeletePlayerPhoto() {
  const refresh = useEverythingWithFaces();
  return useMutation({
    mutationFn: (id: number) => deletePlayerPhoto(id),
    onSuccess: refresh,
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
    mutationFn: (vars: { participantIds?: number[]; roundTrip: boolean }) =>
      drawTeams(editionId, vars.participantIds, vars.roundTrip),
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

/** Clears a recorded result, reverting the match to "not played". */
export function useClearResult(editionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { matchId: number }) => clearResult(vars.matchId),
    onSuccess: (detail) => cacheEdition(qc, detail),
    meta: { editionId },
  });
}

/** Picks the side of the table for a playoff match. */
export function useChooseSide(editionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { matchId: number; side: Side }) => chooseSide(vars.matchId, vars.side),
    onSuccess: (detail) => cacheEdition(qc, detail),
    meta: { editionId },
  });
}
