package com.churrasco.cup.match;

import com.churrasco.cup.common.BadRequestException;
import com.churrasco.cup.common.NotFoundException;
import com.churrasco.cup.edition.Edition;
import com.churrasco.cup.edition.EditionRepository;
import com.churrasco.cup.edition.EditionService;
import com.churrasco.cup.edition.EditionStatus;
import com.churrasco.cup.edition.dto.EditionDetailDto;
import com.churrasco.cup.match.dto.MatchResultRequest;
import com.churrasco.cup.match.dto.SideChoiceRequest;
import com.churrasco.cup.tournament.PlayoffService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatchService {

    private final MatchRepository matchRepository;
    private final EditionRepository editionRepository;
    private final PlayoffService playoffService;
    private final EditionService editionService;

    public MatchService(MatchRepository matchRepository,
                        EditionRepository editionRepository,
                        PlayoffService playoffService,
                        EditionService editionService) {
        this.matchRepository = matchRepository;
        this.editionRepository = editionRepository;
        this.playoffService = playoffService;
        this.editionService = editionService;
    }

    @Transactional
    public EditionDetailDto recordResult(Long matchId, MatchResultRequest request) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new NotFoundException("Partido " + matchId + " no encontrado"));

        int homeScore = request.homeScore();
        int awayScore = request.awayScore();

        if (homeScore == awayScore) {
            throw new BadRequestException(match.isFinal()
                    ? "La Finalissima no puede terminar en empate"
                    : "Ningún partido puede terminar en empate");
        }

        match.recordResult(homeScore, awayScore);
        matchRepository.save(match);

        Edition edition = match.getEdition();
        if (match.isFinal()) {
            Long championId = homeScore > awayScore
                    ? match.getHomeTeam().getId()
                    : match.getAwayTeam().getId();
            edition.setChampionTeamId(championId);
            edition.setStatus(EditionStatus.FINISHED);
        } else {
            if (edition.getStatus() == EditionStatus.TEAMS_DRAWN) {
                edition.setStatus(EditionStatus.IN_PROGRESS);
            }
            // A league or knockout result can change who qualifies further up the bracket.
            playoffService.reconcile(edition);
        }
        editionRepository.save(edition);

        return editionService.getDetail(edition.getId());
    }

    /**
     * Removes a match's recorded result, reverting it to PENDING (as if never played).
     * A blanked score must never linger as a 0-0 draw. Clearing a league or knockout
     * result invalidates whatever came after it, so the playoff phase is reconciled;
     * clearing the Finalissima simply un-decides the edition.
     */
    @Transactional
    public EditionDetailDto clearResult(Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new NotFoundException("Partido " + matchId + " no encontrado"));

        if (match.getStatus() == MatchStatus.PENDING) {
            // Nothing recorded yet; return the current state unchanged.
            return editionService.getDetail(match.getEdition().getId());
        }

        Edition edition = match.getEdition();
        match.clearResult();
        matchRepository.save(match);

        if (match.isFinal()) {
            edition.setChampionTeamId(null);
            if (edition.getStatus() == EditionStatus.FINISHED) {
                edition.setStatus(EditionStatus.IN_PROGRESS);
            }
        } else {
            playoffService.reconcile(edition);
            // If no league match remains played, the edition is effectively back to just-drawn.
            boolean anyLeaguePlayed = matchRepository
                    .existsByEditionIdAndPlayoffFalseAndStatus(edition.getId(), MatchStatus.PLAYED);
            if (!anyLeaguePlayed && edition.getStatus() == EditionStatus.IN_PROGRESS) {
                edition.setStatus(EditionStatus.TEAMS_DRAWN);
            }
        }
        editionRepository.save(edition);

        return editionService.getDetail(edition.getId());
    }

    /**
     * Picks the side of the table for a playoff match. Only the home team chooses, and it
     * is always the better-classified one (see PlayoffService), so no team id is needed:
     * the opponent simply gets the other side.
     */
    @Transactional
    public EditionDetailDto chooseSide(Long matchId, SideChoiceRequest request) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new NotFoundException("Partido " + matchId + " no encontrado"));

        if (!match.isPlayoff()) {
            throw new BadRequestException(
                    "Solo se elige lado en las eliminatorias: en la liga lo fija la ida o la vuelta");
        }

        match.chooseSide(request.side());
        matchRepository.save(match);

        return editionService.getDetail(match.getEdition().getId());
    }
}
