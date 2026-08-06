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
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
 * Draws the teams for an edition and generates its schedule.
 * If the number of participants is odd, the player who sits out is drawn only among
 * those with the most played matches, so nobody lagging behind is ever left out.
 * Pairs that played together in the previous edition are not repeated.
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
    public void draw(Long editionId, List<Long> participantIds, boolean roundTrip) {
        Edition edition = editionRepository.findById(editionId)
                .orElseThrow(() -> new NotFoundException("Edicion " + editionId + " no encontrada"));

        if (matchRepository.existsByEditionIdAndStatus(editionId, MatchStatus.PLAYED)) {
            throw new BadRequestException(
                    "No se puede re-sortear: ya hay resultados anotados en esta edicion");
        }

        List<Player> participants = resolveParticipants(edition, participantIds);
        if (participants.size() < MIN_PARTICIPANTS) {
            throw new BadRequestException(
                    "Se necesitan al menos " + MIN_PARTICIPANTS + " jugadores (2 equipos) para sortear");
        }
        // A una vuelta la liga es corta, así que se decide con eliminatorias: sin 4 equipos
        // no hay cuadro que jugar (con impares uno se queda fuera, de ahí el redondeo).
        int teamCount = participants.size() / 2;
        if (!roundTrip && teamCount < PlayoffService.MIN_TEAMS_FOR_BRACKET) {
            throw new BadRequestException("El formato a una vuelta necesita al menos "
                    + (PlayoffService.MIN_TEAMS_FOR_BRACKET * 2) + " jugadores ("
                    + PlayoffService.MIN_TEAMS_FOR_BRACKET + " equipos) para jugar las eliminatorias");
        }

        // Pairs to avoid, read before the previous draw of this edition is wiped.
        Set<Set<Long>> repeats = pairsOfPreviousEdition(edition);

        // Clear a previous draw (matches before teams because of the foreign keys).
        matchRepository.deleteByEditionId(editionId);
        teamRepository.deleteByEditionId(editionId);
        matchRepository.flush();
        teamRepository.flush();

        List<Player> pool = new ArrayList<>(participants);
        Collections.shuffle(pool, random);

        // Odd count -> one sits out. Only the participants tied for the most played
        // matches can be excluded, so a player with fewer matches than the rest never
        // sits out; when everyone is level it stays a pure random draw.
        if (pool.size() % 2 != 0) {
            Player satOut = pickSatOut(pool);
            pool.remove(satOut);
            edition.setSatOutPlayer(satOut);
        } else {
            edition.setSatOutPlayer(null);
        }

        List<Team> teams = new ArrayList<>();
        for (Player[] pair : pairUp(pool, repeats)) {
            Player p1 = pair[0];
            Player p2 = pair[1];
            // Roles are random too: player1 plays up front ("delante") and player2 at the
            // back ("atras"). The pool is already shuffled, so an extra coin flip keeps the
            // within-pair order independent of the team name's left-to-right reading.
            if (random.nextBoolean()) {
                Player tmp = p1;
                p1 = p2;
                p2 = tmp;
            }
            teams.add(new Team(edition, p1, p2));
        }
        teams = teamRepository.saveAll(teams);

        List<Match> matches = scheduleGenerator.generate(edition, teams, roundTrip);
        matchRepository.saveAll(matches);

        edition.setRoundTrip(roundTrip);
        edition.setStatus(EditionStatus.TEAMS_DRAWN);
        edition.setChampionTeamId(null);
        editionRepository.save(edition);
    }

    /**
     * Splits the (already shuffled) pool into pairs, skipping the pairs that played
     * together in the previous edition. Backtracks because a greedy pass can paint itself
     * into a corner: the last two players left may be exactly a pair to avoid. If no valid
     * split exists at all, the constraint is dropped rather than failing the draw — with a
     * small enough pool every pairing can be a repeat.
     */
    private List<Player[]> pairUp(List<Player> pool, Set<Set<Long>> repeats) {
        List<Player[]> pairs = new ArrayList<>();
        if (!repeats.isEmpty() && pairWithout(new ArrayList<>(pool), repeats, pairs)) {
            return pairs;
        }
        pairs.clear();
        for (int i = 0; i < pool.size(); i += 2) {
            pairs.add(new Player[]{pool.get(i), pool.get(i + 1)});
        }
        return pairs;
    }

    /**
     * Pairs everyone in {@code remaining} avoiding {@code repeats}, appending the pairs
     * found to {@code pairs}. Candidates are tried in the pool's (shuffled) order, so the
     * result is as random as the draw itself. Returns false when it cannot be done.
     */
    private boolean pairWithout(List<Player> remaining, Set<Set<Long>> repeats, List<Player[]> pairs) {
        if (remaining.isEmpty()) {
            return true;
        }
        Player first = remaining.remove(0);
        for (int i = 0; i < remaining.size(); i++) {
            Player partner = remaining.get(i);
            if (repeats.contains(pairKey(first, partner))) {
                continue;
            }
            remaining.remove(i);
            pairs.add(new Player[]{first, partner});
            if (pairWithout(remaining, repeats, pairs)) {
                return true;
            }
            pairs.remove(pairs.size() - 1);
            remaining.add(i, partner);
        }
        remaining.add(0, first);
        return false;
    }

    /**
     * The pairs drawn in the edition right before this one, so a team never repeats two
     * editions in a row. Sandbox editions don't count (they are not part of the run of
     * editions), and an edition that hasn't been drawn yet has nothing to say.
     */
    private Set<Set<Long>> pairsOfPreviousEdition(Edition edition) {
        for (Edition candidate : editionRepository.findAllByOrderByCreatedAtDescIdDesc()) {
            if (candidate.isTest() || !isBefore(candidate, edition)) {
                continue;
            }
            List<Team> teams = teamRepository.findByEditionIdOrderByIdAsc(candidate.getId());
            if (teams.isEmpty()) {
                continue;
            }
            Set<Set<Long>> pairs = new HashSet<>();
            for (Team team : teams) {
                pairs.add(pairKey(team.getPlayer1(), team.getPlayer2()));
            }
            return pairs;
        }
        return Set.of();
    }

    /** Editions run in creation order; the id breaks a tie between two created together. */
    private static boolean isBefore(Edition candidate, Edition edition) {
        int byDate = candidate.getCreatedAt().compareTo(edition.getCreatedAt());
        return byDate != 0 ? byDate < 0 : candidate.getId() < edition.getId();
    }

    /** A pair as an unordered key: who plays up front is irrelevant here. */
    private static Set<Long> pairKey(Player a, Player b) {
        return Set.of(a.getId(), b.getId());
    }

    /** Random pick among the participants with the highest number of played matches. */
    private Player pickSatOut(List<Player> pool) {
        Map<Long, Long> played = playedMatchCounts();
        long max = pool.stream()
                .mapToLong(p -> played.getOrDefault(p.getId(), 0L))
                .max()
                .orElse(0L);
        List<Player> candidates = pool.stream()
                .filter(p -> played.getOrDefault(p.getId(), 0L) == max)
                .toList();
        return candidates.get(random.nextInt(candidates.size()));
    }

    /**
     * Played matches per player across all editions. Sandbox editions are skipped,
     * consistent with the all-time ranking. The edition being (re-)drawn never
     * contributes: its matches are still PENDING (a draw is blocked otherwise).
     */
    private Map<Long, Long> playedMatchCounts() {
        Map<Long, Long> counts = new HashMap<>();
        for (Match match : matchRepository.findByStatus(MatchStatus.PLAYED)) {
            if (match.getEdition().isTest()) {
                continue;
            }
            for (Team team : List.of(match.getHomeTeam(), match.getAwayTeam())) {
                counts.merge(team.getPlayer1().getId(), 1L, Long::sum);
                counts.merge(team.getPlayer2().getId(), 1L, Long::sum);
            }
        }
        return counts;
    }

    /**
     * Who takes part in the draw: the players the client asked for, or — when it doesn't
     * say — whoever is already drawn into the edition. A re-draw must shuffle exactly the
     * players who signed up for this edition, never everyone active. Only an edition with
     * no teams yet falls back to the full list of active players.
     */
    private List<Player> resolveParticipants(Edition edition, List<Long> participantIds) {
        if (participantIds == null || participantIds.isEmpty()) {
            List<Player> drawn = currentParticipants(edition);
            return drawn.isEmpty() ? playerRepository.findByActiveTrueOrderByNameAsc() : drawn;
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

    /** The players of the edition's current teams, plus whoever sat out that draw. */
    private List<Player> currentParticipants(Edition edition) {
        List<Team> teams = teamRepository.findByEditionIdOrderByIdAsc(edition.getId());
        if (teams.isEmpty()) {
            return List.of();
        }
        List<Player> players = new ArrayList<>();
        for (Team team : teams) {
            players.add(team.getPlayer1());
            players.add(team.getPlayer2());
        }
        if (edition.getSatOutPlayer() != null) {
            players.add(edition.getSatOutPlayer());
        }
        return players;
    }
}
