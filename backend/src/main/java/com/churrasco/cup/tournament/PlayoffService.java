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

import java.util.List;
import java.util.Set;

/**
 * Keeps an edition's playoff phase consistent with the league standings.
 *
 * Two shapes, decided by the league format:
 * <ul>
 *   <li><b>Ida y vuelta</b>: the top 2 go straight to the Finalissima.</li>
 *   <li><b>Partido único</b> (needs at least {@value #MIN_TEAMS_FOR_LADDER} teams): a ladder
 *       instead of a bracket. The 4th plays the 3rd (the <i>cruce</i>), the winner plays the
 *       2nd (the semifinal) and whoever survives plays the 1st in the Finalissima. Finishing
 *       higher up the table is worth more: you enter later and always at home.</li>
 * </ul>
 *
 * In every playoff match the better-classified team is the home team, which is the one
 * that gets to pick the side of the table (see {@link Match#chooseSide}). On the ladder
 * that is always the team waiting at the top of the rung, since it never faces anyone
 * who finished above it.
 *
 * This runs after any result is recorded, edited or cleared, so the bracket always
 * reflects the current standings:
 * <ul>
 *   <li>an unfinished league drops the whole playoff phase (it is premature);</li>
 *   <li>a match whose pairing no longer matches the qualified teams is re-seeded,
 *       discarding its result — a result edit can never leave a champion who didn't
 *       actually reach the final;</li>
 *   <li>a rung whose challenger is still unknown (because the rung below it is not
 *       played) is dropped, and recreated as soon as it is decided again;</li>
 *   <li>a pairing that still holds is left untouched, so correcting an unrelated result
 *       never disturbs an already-played match.</li>
 * </ul>
 */
@Service
public class PlayoffService {

    /** Below this, the single-round format has no room for the playoff ladder. */
    public static final int MIN_TEAMS_FOR_LADDER = 4;

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

    /** True when this edition's format sends the top 4 up the playoff ladder. */
    public static boolean hasLadder(boolean roundTrip, int teamCount) {
        return !roundTrip && teamCount >= MIN_TEAMS_FOR_LADDER;
    }

    /** Rebuilds/repairs the playoff matches of an edition after any result change. */
    public void reconcile(Edition edition) {
        Long editionId = edition.getId();
        List<Match> all = matchRepository.findByEditionIdOrderByOrderIndexAsc(editionId);
        List<Match> league = all.stream().filter(m -> !m.isPlayoff()).toList();
        List<Match> cruces = matchesOf(all, Leg.CRUCE);
        List<Match> semifinals = matchesOf(all, Leg.SEMIFINAL);
        Match finalissima = all.stream().filter(Match::isFinal).findFirst().orElse(null);

        boolean leagueComplete = !league.isEmpty()
                && league.stream().allMatch(m -> m.getStatus() == MatchStatus.PLAYED);
        if (!leagueComplete) {
            // The league is not decided (yet, or any more): the whole playoff phase is
            // premature, so it goes away along with any champion it had crowned.
            dropAll(edition, cruces);
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

        if (!hasLadder(edition.isRoundTrip(), teams.size())) {
            // e.g. the edition was re-drawn as ida y vuelta: the ladder no longer applies.
            dropAll(edition, cruces);
            dropAll(edition, semifinals);
            ensure(edition, finalissima, seed(teams, standings, 0), seed(teams, standings, 1),
                    Leg.FINAL, nextOrder);
            return;
        }

        // Rung 1: the 3rd hosts the 4th.
        Match cruce = ensure(edition, first(cruces),
                seed(teams, standings, 2), seed(teams, standings, 3), Leg.CRUCE, nextOrder);
        dropAll(edition, rest(cruces)); // leftovers from another format
        if (cruce.getStatus() != MatchStatus.PLAYED) {
            dropAll(edition, semifinals); // the 2nd's challenger is still unknown
            drop(edition, finalissima);
            return;
        }

        // Rung 2: the 2nd hosts whoever came up from the cruce.
        Match semifinal = ensure(edition, first(semifinals),
                seed(teams, standings, 1), winnerOf(cruce), Leg.SEMIFINAL, nextOrder + 1);
        dropAll(edition, rest(semifinals));
        if (semifinal.getStatus() != MatchStatus.PLAYED) {
            drop(edition, finalissima); // the 1st's challenger is still unknown
            return;
        }

        // Rung 3: the 1st hosts the survivor. The Finalissima.
        ensure(edition, finalissima,
                seed(teams, standings, 0), winnerOf(semifinal), Leg.FINAL, nextOrder + 2);
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

    /** The edition's matches for one playoff round, in play order. */
    private static List<Match> matchesOf(List<Match> all, Leg leg) {
        return all.stream().filter(m -> m.getLeg() == leg).toList();
    }

    private static Match first(List<Match> matches) {
        return matches.isEmpty() ? null : matches.get(0);
    }

    private static List<Match> rest(List<Match> matches) {
        return matches.isEmpty() ? List.of() : matches.subList(1, matches.size());
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

    private Team winnerOf(Match match) {
        return match.getHomeScore() > match.getAwayScore() ? match.getHomeTeam() : match.getAwayTeam();
    }
}
