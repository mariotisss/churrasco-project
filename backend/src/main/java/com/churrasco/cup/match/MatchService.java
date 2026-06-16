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
            maybeCreateFinalissima(edition);
        }
        editionRepository.save(edition);

        return editionService.getDetail(edition.getId());
    }

    /**
     * Cuando se completa la liga (sin partidos PENDING) y aun no existe Finalissima,
     * la crea automaticamente entre el 1o y el 2o de la clasificacion.
     */
    private void maybeCreateFinalissima(Edition edition) {
        Long editionId = edition.getId();
        boolean leaguePending =
                matchRepository.existsByEditionIdAndFinalissimaFalseAndStatus(editionId, MatchStatus.PENDING);
        if (leaguePending || matchRepository.existsByEditionIdAndFinalissimaTrue(editionId)) {
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
        int nextOrder = leagueMatches.stream().mapToInt(Match::getOrderIndex).max().orElse(-1) + 1;

        matchRepository.save(new Match(edition, first, second, Leg.FINAL, nextOrder, true));
    }

    private Team teamById(List<Team> teams, Long id) {
        return teams.stream()
                .filter(t -> t.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Equipo " + id + " no encontrado en la edicion"));
    }
}
