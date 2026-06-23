package com.churrasco.cup.tournament;

import com.churrasco.cup.common.BadRequestException;
import com.churrasco.cup.common.NotFoundException;
import com.churrasco.cup.edition.Edition;
import com.churrasco.cup.edition.EditionRepository;
import com.churrasco.cup.edition.EditionStatus;
import com.churrasco.cup.match.Match;
import com.churrasco.cup.match.MatchRepository;
import com.churrasco.cup.match.MatchStatus;
import com.churrasco.cup.player.Player;
import com.churrasco.cup.player.PlayerRepository;
import com.churrasco.cup.team.Team;
import com.churrasco.cup.team.TeamRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Draws the teams for an edition and generates its schedule.
 * If the number of participants is odd, the player who sits out is chosen at random.
 */
@Service
public class TeamDrawService {

    private static final int MIN_PARTICIPANTS = 4; // at least 2 teams

    private final EditionRepository editionRepository;
    private final PlayerRepository playerRepository;
    private final TeamRepository teamRepository;
    private final MatchRepository matchRepository;
    private final ScheduleGenerator scheduleGenerator;
    private final Random random;

    public TeamDrawService(EditionRepository editionRepository,
                           PlayerRepository playerRepository,
                           TeamRepository teamRepository,
                           MatchRepository matchRepository,
                           ScheduleGenerator scheduleGenerator) {
        this.editionRepository = editionRepository;
        this.playerRepository = playerRepository;
        this.teamRepository = teamRepository;
        this.matchRepository = matchRepository;
        this.scheduleGenerator = scheduleGenerator;
        this.random = new Random();
    }

    @Transactional
    public void draw(Long editionId, List<Long> participantIds) {
        Edition edition = editionRepository.findById(editionId)
                .orElseThrow(() -> new NotFoundException("Edicion " + editionId + " no encontrada"));

        if (matchRepository.existsByEditionIdAndStatus(editionId, MatchStatus.PLAYED)) {
            throw new BadRequestException(
                    "No se puede re-sortear: ya hay resultados anotados en esta edicion");
        }

        List<Player> participants = resolveParticipants(participantIds);
        if (participants.size() < MIN_PARTICIPANTS) {
            throw new BadRequestException(
                    "Se necesitan al menos " + MIN_PARTICIPANTS + " jugadores (2 equipos) para sortear");
        }

        // Clear a previous draw (matches before teams because of the foreign keys).
        matchRepository.deleteByEditionId(editionId);
        teamRepository.deleteByEditionId(editionId);
        matchRepository.flush();
        teamRepository.flush();

        List<Player> pool = new ArrayList<>(participants);
        Collections.shuffle(pool, random);

        // Odd count -> one sits out (random, since the pool is already shuffled).
        if (pool.size() % 2 != 0) {
            Player satOut = pool.remove(pool.size() - 1);
            edition.setSatOutPlayer(satOut);
        } else {
            edition.setSatOutPlayer(null);
        }

        List<Team> teams = new ArrayList<>();
        for (int i = 0; i < pool.size(); i += 2) {
            Player p1 = pool.get(i);
            Player p2 = pool.get(i + 1);
            // Roles are random too: player1 plays up front ("delante") and player2 at the
            // back ("atras"). The pool is already shuffled, so an extra coin flip keeps the
            // within-pair order independent of the team name's left-to-right reading.
            if (random.nextBoolean()) {
                Player tmp = p1;
                p1 = p2;
                p2 = tmp;
            }
            teams.add(new Team(edition, p1.getName() + " & " + p2.getName(), p1, p2));
        }
        teams = teamRepository.saveAll(teams);

        List<Match> matches = scheduleGenerator.generate(edition, teams);
        matchRepository.saveAll(matches);

        edition.setStatus(EditionStatus.TEAMS_DRAWN);
        edition.setChampionTeamId(null);
        editionRepository.save(edition);
    }

    private List<Player> resolveParticipants(List<Long> participantIds) {
        if (participantIds == null || participantIds.isEmpty()) {
            return playerRepository.findByActiveTrueOrderByNameAsc();
        }
        // Keep uniqueness while preserving insertion order.
        Map<Long, Player> unique = new LinkedHashMap<>();
        for (Long id : participantIds) {
            if (unique.containsKey(id)) {
                continue;
            }
            Player player = playerRepository.findById(id)
                    .orElseThrow(() -> new BadRequestException("Jugador " + id + " no existe"));
            unique.put(id, player);
        }
        return new ArrayList<>(unique.values());
    }
}
