package com.churrasco.cup.tournament;

import com.churrasco.cup.edition.Edition;
import com.churrasco.cup.edition.EditionStatus;
import com.churrasco.cup.edition.dto.StandingRowDto;
import com.churrasco.cup.match.Leg;
import com.churrasco.cup.match.Match;
import com.churrasco.cup.match.MatchRepository;
import com.churrasco.cup.match.MatchStatus;
import com.churrasco.cup.team.Team;
import com.churrasco.cup.team.TeamRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Set;

/**
 * Keeps an edition's playoff phase consistent with the league standings.
 *
 * Two shapes, decided by the league format:
 * <ul>
 *   <li><b>Ida y vuelta</b>: the top 2 go straight to the Finalissima.</li>
 *   <li><b>Partido único</b> (needs at least {@value #MIN_TEAMS_FOR_SEMIS} teams): 1st vs 4th
 *       and 2nd vs 3rd play the semifinals, and their winners meet in the Finalissima.</li>
 * </ul>
 *
 * In every playoff match the better-classified team is the home team, which is the one
 * that gets to pick the side of the table (see {@link Match#chooseSide}).
 *
 * This runs after any result is recorded, edited or cleared, so the bracket always
 * reflects the current standings:
 * <ul>
 *   <li>an unfinished league drops the whole playoff phase (it is premature);</li>
 *   <li>a match whose pairing no longer matches the qualified teams is re-seeded,
 *       discarding its result — a result edit can never leave a champion who didn't
 *       actually reach the final;</li>
 *   <li>a pairing that still holds is left untouched, so correcting an unrelated result
 *       never disturbs an already-played match.</li>
 * </ul>
 */
@Service
public class PlayoffService {

    /** Below this, the single-round format has no room for semifinals. */
    public static final int MIN_TEAMS_FOR_SEMIS = 4;

    private final MatchRepository matchRepository;
    private final TeamRepository teamRepository;
    private final StandingsCalculator standingsCalculator;

    public PlayoffService(MatchRepository matchRepository,
                          TeamRepository teamRepository,
                          StandingsCalculator standingsCalculator) {
        this.matchRepository = matchRepository;
        this.teamRepository = teamRepository;
        this.standingsCalculator = standingsCalculator;
    }

    /** True when this edition's format sends the top 4 to the semifinals. */
    public static boolean hasSemifinals(boolean roundTrip, int teamCount) {
        return !roundTrip && teamCount >= MIN_TEAMS_FOR_SEMIS;
    }

    /** Rebuilds/repairs the playoff matches of an edition after any result change. */
    public void reconcile(Edition edition) {
        Long editionId = edition.getId();
        List<Match> all = matchRepository.findByEditionIdOrderByOrderIndexAsc(editionId);
        List<Match> league = all.stream().filter(m -> !m.isPlayoff()).toList();
        List<Match> semifinals = all.stream()
                .filter(m -> m.getLeg() == Leg.SEMIFINAL)
                .sorted(Comparator.comparingInt(Match::getOrderIndex))
                .toList();
        Match finalissima = all.stream().filter(Match::isFinal).findFirst().orElse(null);

        boolean leagueComplete = !league.isEmpty()
                && league.stream().allMatch(m -> m.getStatus() == MatchStatus.PLAYED);
        if (!leagueComplete) {
            // The league is not decided (yet, or any more): the whole playoff phase is
            // premature, so it goes away along with any champion it had crowned.
            dropAll(edition, semifinals);
            drop(edition, finalissima);
            return;
        }

        List<Team> teams = teamRepository.findByEditionIdOrderByIdAsc(editionId);
        List<StandingRowDto> standings = standingsCalculator.compute(teams, league);
        if (standings.size() < 2) {
            return;
        }
        int nextOrder = league.stream().mapToInt(Match::getOrderIndex).max().orElse(-1) + 1;

        if (!hasSemifinals(edition.isRoundTrip(), teams.size())) {
            dropAll(edition, semifinals); // e.g. the edition was re-drawn as ida y vuelta
            ensure(edition, finalissima, seed(teams, standings, 0), seed(teams, standings, 1),
                    Leg.FINAL, nextOrder);
            return;
        }

        // 1 vs 4 and 2 vs 3, the better seed at home so it is the one choosing the side.
        Match first = ensure(edition, semifinals.size() > 0 ? semifinals.get(0) : null,
                seed(teams, standings, 0), seed(teams, standings, 3), Leg.SEMIFINAL, nextOrder);
        Match second = ensure(edition, semifinals.size() > 1 ? semifinals.get(1) : null,
                seed(teams, standings, 1), seed(teams, standings, 2), Leg.SEMIFINAL, nextOrder + 1);
        if (semifinals.size() > 2) {
            dropAll(edition, semifinals.subList(2, semifinals.size())); // leftovers from another format
        }

        if (first.getStatus() != MatchStatus.PLAYED || second.getStatus() != MatchStatus.PLAYED) {
            drop(edition, finalissima); // finalists still unknown
            return;
        }

        // The finalist with the better league position plays at home (and picks the side).
        Team winnerA = winnerOf(first);
        Team winnerB = winnerOf(second);
        boolean aIsBetter = position(standings, winnerA) < position(standings, winnerB);
        ensure(edition, finalissima,
                aIsBetter ? winnerA : winnerB,
                aIsBetter ? winnerB : winnerA,
                Leg.FINAL, nextOrder + 2);
    }

    /**
     * Creates the match if missing, re-seeds it when the qualified pair changed (dropping
     * its result), or just swaps home/away when the same pair meets with the seeding the
     * other way round and the match hasn't been played yet.
     */
    private Match ensure(Edition edition, Match existing, Team home, Team away, Leg leg, int orderIndex) {
        if (existing == null) {
            return matchRepository.save(new Match(edition, home, away, leg, orderIndex, true));
        }

        Set<Long> current = Set.of(existing.getHomeTeam().getId(), existing.getAwayTeam().getId());
        if (!current.equals(Set.of(home.getId(), away.getId()))) {
            existing.reseed(home, away);
            matchRepository.save(existing);
            if (leg == Leg.FINAL) {
                undecide(edition);
            }
            return existing;
        }

        boolean rolesSwapped = !existing.getHomeTeam().getId().equals(home.getId());
        if (rolesSwapped && existing.getStatus() == MatchStatus.PENDING) {
            // Same tie, but the standings moved: the other team now picks the side.
            existing.reseed(home, away);
            matchRepository.save(existing);
        }
        return existing;
    }

    private void dropAll(Edition edition, List<Match> matches) {
        for (Match match : matches) {
            drop(edition, match);
        }
    }

    private void drop(Edition edition, Match match) {
        if (match == null) {
            return;
        }
        matchRepository.delete(match);
        if (match.isFinal()) {
            undecide(edition);
        }
    }

    /** Undoes a title that the (now invalid) final had decided. */
    private void undecide(Edition edition) {
        edition.setChampionTeamId(null);
        if (edition.getStatus() == EditionStatus.FINISHED) {
            edition.setStatus(EditionStatus.IN_PROGRESS);
        }
    }

    private Team seed(List<Team> teams, List<StandingRowDto> standings, int index) {
        Long teamId = standings.get(index).teamId();
        return teams.stream()
                .filter(t -> t.getId().equals(teamId))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Equipo " + teamId + " no encontrado en la edicion"));
    }

    private int position(List<StandingRowDto> standings, Team team) {
        for (int i = 0; i < standings.size(); i++) {
            if (standings.get(i).teamId().equals(team.getId())) {
                return i;
            }
        }
        return Integer.MAX_VALUE;
    }

    private Team winnerOf(Match match) {
        return match.getHomeScore() > match.getAwayScore() ? match.getHomeTeam() : match.getAwayTeam();
    }
}
