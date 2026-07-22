package com.churrasco.cup.match;

import com.churrasco.cup.common.BadRequestException;
import com.churrasco.cup.common.NotFoundException;
import com.churrasco.cup.edition.Edition;
import com.churrasco.cup.edition.EditionRepository;
import com.churrasco.cup.edition.EditionService;
import com.churrasco.cup.edition.EditionStatus;
import com.churrasco.cup.edition.dto.EditionDetailDto;
import com.churrasco.cup.edition.dto.StandingRowDto;
import com.churrasco.cup.match.dto.MatchResultRequest;
import com.churrasco.cup.team.Team;
import com.churrasco.cup.team.TeamRepository;
import com.churrasco.cup.tournament.StandingsCalculator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class MatchService {

    private final MatchRepository matchRepository;
    private final TeamRepository teamRepository;
    private final EditionRepository editionRepository;
    private final StandingsCalculator standingsCalculator;
    private final EditionService editionService;

    public MatchService(MatchRepository matchRepository,
                        TeamRepository teamRepository,
                        EditionRepository editionRepository,
                        StandingsCalculator standingsCalculator,
                        EditionService editionService) {
        this.matchRepository = matchRepository;
        this.teamRepository = teamRepository;
        this.editionRepository = editionRepository;
        this.standingsCalculator = standingsCalculator;
        this.editionService = editionService;
    }

    @Transactional
    public EditionDetailDto recordResult(Long matchId, MatchResultRequest request) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new NotFoundException("Partido " + matchId + " no encontrado"));

        int homeScore = request.homeScore();
        int awayScore = request.awayScore();

        if (match.isFinalissima() && homeScore == awayScore) {
            throw new BadRequestException("La Finalissima no puede terminar en empate");
        }

        match.recordResult(homeScore, awayScore);
        matchRepository.save(match);

        Edition edition = match.getEdition();
        if (match.isFinalissima()) {
            Long championId = homeScore > awayScore
                    ? match.getHomeTeam().getId()
                    : match.getAwayTeam().getId();
            edition.setChampionTeamId(championId);
            edition.setStatus(EditionStatus.FINISHED);
        } else {
            if (edition.getStatus() == EditionStatus.TEAMS_DRAWN) {
                edition.setStatus(EditionStatus.IN_PROGRESS);
            }
            reconcileFinalissima(edition);
        }
        editionRepository.save(edition);

        return editionService.getDetail(edition.getId());
    }

    /**
     * Keeps the Finalissima consistent with the current standings after any league result
     * is recorded or edited. When the league is complete (no PENDING matches):
     * <ul>
     *   <li>if no Finalissima exists yet, it is created between the 1st and 2nd;</li>
     *   <li>if one exists but the two finalists no longer match the current top-2, it is
     *       re-seeded with the correct pair. If that final had already been played, the
     *       recorded result is dropped and the edition's champion/status are reverted, so a
     *       result edit can never leave a champion who didn't actually reach the final.</li>
     * </ul>
     * An existing final whose finalists are unchanged is left untouched, so correcting an
     * unrelated result never disturbs an already-decided final.
     */
    private void reconcileFinalissima(Edition edition) {
        Long editionId = edition.getId();
        boolean leaguePending =
                matchRepository.existsByEditionIdAndFinalissimaFalseAndStatus(editionId, MatchStatus.PENDING);
        if (leaguePending) {
            return;
        }

        List<Team> teams = teamRepository.findByEditionIdOrderByIdAsc(editionId);
        List<Match> leagueMatches = matchRepository.findByEditionIdAndFinalissimaFalse(editionId);
        List<StandingRowDto> standings = standingsCalculator.compute(teams, leagueMatches);
        if (standings.size() < 2) {
            return;
        }

        Team first = teamById(teams, standings.get(0).teamId());
        Team second = teamById(teams, standings.get(1).teamId());

        Match finalissima = matchRepository.findByEditionIdOrderByOrderIndexAsc(editionId).stream()
                .filter(Match::isFinalissima)
                .findFirst()
                .orElse(null);

        if (finalissima == null) {
            int nextOrder = leagueMatches.stream().mapToInt(Match::getOrderIndex).max().orElse(-1) + 1;
            matchRepository.save(new Match(edition, first, second, Leg.FINAL, nextOrder, true));
            return;
        }

        Set<Long> currentFinalists = Set.of(finalissima.getHomeTeam().getId(), finalissima.getAwayTeam().getId());
        Set<Long> qualifiedFinalists = Set.of(first.getId(), second.getId());
        if (currentFinalists.equals(qualifiedFinalists)) {
            return; // same pair reaches the final; leave the existing (possibly played) final as is
        }

        // The finalists changed: re-seed the final and undo any decided outcome.
        finalissima.reseed(first, second);
        matchRepository.save(finalissima);
        edition.setChampionTeamId(null);
        if (edition.getStatus() == EditionStatus.FINISHED) {
            edition.setStatus(EditionStatus.IN_PROGRESS);
        }
    }

    private Team teamById(List<Team> teams, Long id) {
        return teams.stream()
                .filter(t -> t.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Equipo " + id + " no encontrado en la edicion"));
    }
}
