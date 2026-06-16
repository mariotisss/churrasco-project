import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { EditionDetail } from './types';
import {
  createEdition,
  createPlayer,
  deletePlayer,
  drawTeams,
  getEdition,
  getEditions,
  getPlayers,
  recordResult,
  updatePlayer,
} from './client';

export const queryKeys = {
  players: (activeOnly: boolean) => ['players', { activeOnly }] as const,
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

// --- Editions ---
export function useEditions() {
  return useQuery({ queryKey: queryKeys.editions, queryFn: getEditions });
}

export function useCreateEdition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createEdition(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.editions }),
  });
}

export function useEdition(id: number) {
  return useQuery({
    queryKey: queryKeys.edition(id),
    queryFn: () => getEdition(id),
    // El cuadro se refresca solo cada 15s (util si varios miran a la vez).
    refetchInterval: 15000,
  });
}

/** Escribe el detalle devuelto en la cache para repintar el cuadro al instante. */
function cacheEdition(qc: ReturnType<typeof useQueryClient>, detail: EditionDetail) {
  qc.setQueryData(queryKeys.edition(detail.id), detail);
  qc.invalidateQueries({ queryKey: queryKeys.editions });
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
    // editionId se usa para fijar el tipo del hook al detalle correcto.
    meta: { editionId },
  });
}
