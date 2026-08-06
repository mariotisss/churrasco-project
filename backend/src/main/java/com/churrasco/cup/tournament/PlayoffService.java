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
 *   <li><b>Partido único</b> (needs at least {@value #MIN_TEAMS_FOR_BRACKET} teams): the top 4
 *       play a double-chance bracket — the <i>cruce alto</i> (1st vs 2nd) and the <i>cruce
 *       bajo</i> (4th at the 3rd) open it; whoever loses the alto drops into the semifinal
 *       against whoever wins the bajo, and that survivor meets the alto's winner in the
 *       Finalissima. Finishing in the top 2 buys a second life: you can lose once and still
 *       be champion, while the 3rd and the 4th are out the moment they lose.</li>
 * </ul>
 *
 * In every playoff match the better-classified team is the home team, which is the one
 * that gets to pick the side of the table (see {@link Match#chooseSide}) — the only thing
 * winning the league is worth once the bracket starts.
 *
 * This runs after any result is recorded, edited or cleared, so the bracket always
 * reflects the current standings:
 * <ul>
 *   <li>an unfinished league drops the whole playoff phase (it is premature);</li>
 *   <li>a match whose pairing no longer matches the qualified teams is re-seeded,
 *       discarding its result — a result edit can never leave a champion who didn't
 *       actually reach the final;</li>
 *   <li>a round whose contenders are still unknown (because the round feeding it is not
 *       played) is dropped, and recreated as soon as it is decided again;</li>
 *   <li>a pairing that still holds is left untouched, so correcting an unrelated result
 *       never disturbs an already-played match.</li>
 * </ul>
 */
@Service
public class PlayoffService {

    /** Below this, the single-round format has no room for the bracket. */
    public static final int MIN_TEAMS_FOR_BRACKET = 4;

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

    /** True when this edition's format sends the top 4 into the bracket. */
    public static boolean hasBracket(boolean roundTrip, int teamCount) {
        return !roundTrip && teamCount >= MIN_TEAMS_FOR_BRACKET;
    }

    /** Rebuilds/repairs the playoff matches of an edition after any result change. */
    public void reconcile(Edition edition) {
        Long editionId = edition.getId();
        List<Match> all = matchRepository.findByEditionIdOrderByOrderIndexAsc(editionId);
        List<Match> league = all.stream().filter(m -> !m.isPlayoff()).toList();
        List<Match> altos = matchesOf(all, Leg.CRUCE_ALTO);
        List<Match> bajos = matchesOf(all, Leg.CRUCE_BAJO);
        List<Match> semifinals = matchesOf(all, Leg.SEMIFINAL);
        // Editions drawn while the ladder format was in place; nothing generates these now.
        List<Match> legacy = matchesOf(all, Leg.CRUCE);
        Match finalissima = all.stream().filter(Match::isFinal).findFirst().orElse(null);

        boolean leagueComplete = !league.isEmpty()
                && league.stream().allMatch(m -> m.getStatus() == MatchStatus.PLAYED);
        if (!leagueComplete) {
            // The league is not decided (yet, or any more): the whole playoff phase is
            // premature, so it goes away along with any champion it had crowned.
            dropAll(edition, legacy);
            dropAll(edition, altos);
            dropAll(edition, bajos);
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
        dropAll(edition, legacy);

        if (!hasBracket(edition.isRoundTrip(), teams.size())) {
            // e.g. the edition was re-drawn as ida y vuelta: the bracket no longer applies.
            dropAll(edition, altos);
            dropAll(edition, bajos);
            dropAll(edition, semifinals);
            ensure(edition, finalissima, seed(teams, standings, 0), seed(teams, standings, 1),
                    Leg.FINAL, nextOrder);
            return;
        }

        // Opening round, both halves at once: the 1st hosts the 2nd, the 3rd hosts the 4th.
        Match alto = ensure(edition, first(altos),
                seed(teams, standings, 0), seed(teams, standings, 1), Leg.CRUCE_ALTO, nextOrder);
        dropAll(edition, rest(altos));
        Match bajo = ensure(edition, first(bajos),
                seed(teams, standings, 2), seed(teams, standings, 3), Leg.CRUCE_BAJO, nextOrder + 1);
        dropAll(edition, rest(bajos));

        if (alto.getStatus() != MatchStatus.PLAYED || bajo.getStatus() != MatchStatus.PLAYED) {
            dropAll(edition, semifinals); // nobody has dropped down or come up yet
            drop(edition, finalissima);
            return;
        }

        // Second chance: the one who lost upstairs against the one who survived downstairs.
        // The former is the 1st or the 2nd and the latter the 3rd or the 4th, so the drop-down
        // is always the better classified of the two, and the one who picks the side.
        Match semifinal = ensure(edition, first(semifinals),
                loserOf(alto), winnerOf(bajo), Leg.SEMIFINAL, nextOrder + 2);
        dropAll(edition, rest(semifinals));
        if (semifinal.getStatus() != MatchStatus.PLAYED) {
            drop(edition, finalissima); // the second finalist is still unknown
            return;
        }

        // The Finalissima. It can be a rematch of the cruce alto, when whoever lost it comes
        // all the way back; the better-classified finalist plays at home either way.
        Team fromAlto = winnerOf(alto);
        Team fromSemifinal = winnerOf(semifinal);
        boolean altoIsBetter = position(standings, fromAlto) < position(standings, fromSemifinal);
        ensure(edition, finalissima,
                altoIsBetter ? fromAlto : fromSemifinal,
                altoIsBetter ? fromSemifinal : fromAlto,
                Leg.FINAL, nextOrder + 3);
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

    private Team loserOf(Match match) {
        return match.getHomeScore() > match.getAwayScore() ? match.getAwayTeam() : match.getHomeTeam();
    }
}
