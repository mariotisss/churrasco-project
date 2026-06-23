package com.churrasco.cup.player;

import com.churrasco.cup.api.DtoMapper;
import com.churrasco.cup.common.BadRequestException;
import com.churrasco.cup.common.NotFoundException;
import com.churrasco.cup.edition.Edition;
import com.churrasco.cup.edition.EditionRepository;
import com.churrasco.cup.match.Match;
import com.churrasco.cup.match.MatchRepository;
import com.churrasco.cup.penalty.Penalty;
import com.churrasco.cup.penalty.PenaltyRepository;
import com.churrasco.cup.player.dto.CreatePlayerRequest;
import com.churrasco.cup.player.dto.PlayerDto;
import com.churrasco.cup.player.dto.PlayerStandingDto;
import com.churrasco.cup.player.dto.UpdatePlayerRequest;
import com.churrasco.cup.team.Team;
import com.churrasco.cup.team.TeamRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PlayerService {

    /** Points awarded to each player of the winning / runner-up team per edition. */
    private static final int CHAMPION_POINTS = 2;
    private static final int RUNNER_UP_POINTS = 1;

    private final PlayerRepository repository;
    private final TeamRepository teamRepository;
    private final EditionRepository editionRepository;
    private final MatchRepository matchRepository;
    private final PenaltyRepository penaltyRepository;

    public PlayerService(
            PlayerRepository repository,
            TeamRepository teamRepository,
            EditionRepository editionRepository,
            MatchRepository matchRepository,
            PenaltyRepository penaltyRepository) {
        this.repository = repository;
        this.teamRepository = teamRepository;
        this.editionRepository = editionRepository;
        this.matchRepository = matchRepository;
        this.penaltyRepository = penaltyRepository;
    }

    @Transactional(readOnly = true)
    public List<PlayerDto> list(boolean activeOnly) {
        List<Player> players = activeOnly
                ? repository.findByActiveTrueOrderByNameAsc()
                : repository.findAllByOrderByNameAsc();
        return players.stream().map(DtoMapper::toPlayerDto).toList();
    }

    @Transactional
    public PlayerDto create(CreatePlayerRequest request) {
        String name = request.name().trim();
        if (repository.existsByNameIgnoreCase(name)) {
            throw new BadRequestException("Ya existe un jugador con el nombre '" + name + "'");
        }
        return DtoMapper.toPlayerDto(repository.save(new Player(name)));
    }

    @Transactional
    public PlayerDto update(Long id, UpdatePlayerRequest request) {
        Player player = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Jugador " + id + " no encontrado"));

        if (request.name() != null && !request.name().isBlank()) {
            String name = request.name().trim();
            if (!name.equalsIgnoreCase(player.getName()) && repository.existsByNameIgnoreCase(name)) {
                throw new BadRequestException("Ya existe un jugador con el nombre '" + name + "'");
            }
            player.setName(name);
        }
        if (request.active() != null) {
            player.setActive(request.active());
        }
        return DtoMapper.toPlayerDto(player);
    }

    /**
     * Hard delete. Refused when the player has participated in any edition (is part of a
     * team or sat one out), since removing the row would corrupt that edition's history.
     */
    @Transactional
    public void delete(Long id) {
        Player player = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Jugador " + id + " no encontrado"));

        boolean inTeam = teamRepository.existsByPlayer1IdOrPlayer2Id(id, id);
        boolean satOut = editionRepository.existsBySatOutPlayerId(id);
        if (inTeam || satOut) {
            throw new BadRequestException(
                    "No se puede eliminar a '" + player.getName()
                            + "' porque ha participado en alguna edición.");
        }

        repository.delete(player);
    }

    /**
     * All-time player ranking. The whole roster appears (even players with no points yet).
     * Every decided edition awards CHAMPION_POINTS to each player of the winning team and
     * RUNNER_UP_POINTS to each player of the runner-up (the Finalissima loser); manual
     * penalties are then subtracted. Sorted by net points, then titles, then name.
     */
    @Transactional(readOnly = true)
    public List<PlayerStandingDto> standings() {
        Map<Long, Accumulator> byPlayer = new LinkedHashMap<>();

        // Seed every player so the ranking shows the whole roster, even at 0 points.
        for (Player player : repository.findAllByOrderByNameAsc()) {
            byPlayer.put(player.getId(), new Accumulator(player));
        }

        for (Edition edition : editionRepository.findAll()) {
            if (edition.isTest()) {
                continue; // sandbox edition: never affects the all-time ranking
            }
            Long championTeamId = edition.getChampionTeamId();
            if (championTeamId == null) {
                continue; // edition not decided yet
            }
            Team champion = teamRepository.findById(championTeamId).orElse(null);
            if (champion == null) {
                continue;
            }
            award(byPlayer, champion, CHAMPION_POINTS, true);

            Team runnerUp = findRunnerUp(edition.getId(), championTeamId);
            if (runnerUp != null) {
                award(byPlayer, runnerUp, RUNNER_UP_POINTS, false);
            }
        }

        for (Penalty penalty : penaltyRepository.findAll()) {
            Player player = penalty.getPlayer();
            if (player == null) {
                continue;
            }
            Accumulator acc = byPlayer.computeIfAbsent(player.getId(), k -> new Accumulator(player));
            acc.penaltyPoints += penalty.getPoints();
        }

        return byPlayer.values().stream()
                .map(Accumulator::toDto)
                .sorted(Comparator
                        .comparingInt(PlayerStandingDto::points).reversed()
                        .thenComparing(Comparator.comparingInt(PlayerStandingDto::championships).reversed())
                        .thenComparing(PlayerStandingDto::name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    /** The Finalissima opponent that is not the champion, or null when there is no final. */
    private Team findRunnerUp(Long editionId, Long championTeamId) {
        Match finalissima = matchRepository.findByEditionIdOrderByOrderIndexAsc(editionId).stream()
                .filter(Match::isFinalissima)
                .findFirst()
                .orElse(null);
        if (finalissima == null) {
            return null;
        }
        Team home = finalissima.getHomeTeam();
        Team away = finalissima.getAwayTeam();
        if (home != null && !home.getId().equals(championTeamId)) {
            return home;
        }
        if (away != null && !away.getId().equals(championTeamId)) {
            return away;
        }
        return null;
    }

    private void award(Map<Long, Accumulator> byPlayer, Team team, int points, boolean champion) {
        addPoints(byPlayer, team.getPlayer1(), points, champion);
        addPoints(byPlayer, team.getPlayer2(), points, champion);
    }

    private void addPoints(Map<Long, Accumulator> byPlayer, Player player, int points, boolean champion) {
        if (player == null) {
            return;
        }
        Accumulator acc = byPlayer.computeIfAbsent(player.getId(), k -> new Accumulator(player));
        acc.points += points;
        if (champion) {
            acc.championships++;
        } else {
            acc.runnerUps++;
        }
    }

    /** Mutable per-player tally used while aggregating the ranking. */
    private static final class Accumulator {
        private final Player player;
        private int points;
        private int championships;
        private int runnerUps;
        private int penaltyPoints;

        Accumulator(Player player) {
            this.player = player;
        }

        PlayerStandingDto toDto() {
            return new PlayerStandingDto(player.getId(), player.getName(),
                    points - penaltyPoints, championships, runnerUps, penaltyPoints);
        }
    }
}
