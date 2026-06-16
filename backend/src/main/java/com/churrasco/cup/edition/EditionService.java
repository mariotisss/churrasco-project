package com.churrasco.cup.edition;

import com.churrasco.cup.api.DtoMapper;
import com.churrasco.cup.common.NotFoundException;
import com.churrasco.cup.edition.dto.CreateEditionRequest;
import com.churrasco.cup.edition.dto.DrawRequest;
import com.churrasco.cup.edition.dto.EditionDetailDto;
import com.churrasco.cup.edition.dto.EditionSummaryDto;
import com.churrasco.cup.edition.dto.StandingRowDto;
import com.churrasco.cup.match.Match;
import com.churrasco.cup.match.MatchRepository;
import com.churrasco.cup.match.dto.MatchDto;
import com.churrasco.cup.team.Team;
import com.churrasco.cup.team.TeamRepository;
import com.churrasco.cup.team.dto.TeamDto;
import com.churrasco.cup.team.dto.TeamRefDto;
import com.churrasco.cup.tournament.StandingsCalculator;
import com.churrasco.cup.tournament.TeamDrawService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class EditionService {

    private final EditionRepository editionRepository;
    private final TeamRepository teamRepository;
    private final MatchRepository matchRepository;
    private final StandingsCalculator standingsCalculator;
    private final TeamDrawService teamDrawService;

    public EditionService(EditionRepository editionRepository,
                          TeamRepository teamRepository,
                          MatchRepository matchRepository,
                          StandingsCalculator standingsCalculator,
                          TeamDrawService teamDrawService) {
        this.editionRepository = editionRepository;
        this.teamRepository = teamRepository;
        this.matchRepository = matchRepository;
        this.standingsCalculator = standingsCalculator;
        this.teamDrawService = teamDrawService;
    }

    @Transactional(readOnly = true)
    public List<EditionSummaryDto> list() {
        return editionRepository.findAllByOrderByCreatedAtDescIdDesc().stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public EditionSummaryDto create(CreateEditionRequest request) {
        Edition edition = editionRepository.save(new Edition(request.name().trim()));
        return toSummary(edition);
    }

    @Transactional(readOnly = true)
    public EditionDetailDto getDetail(Long id) {
        Edition edition = editionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Edicion " + id + " no encontrada"));

        List<Team> teams = teamRepository.findByEditionIdOrderByIdAsc(id);
        List<Match> matches = matchRepository.findByEditionIdOrderByOrderIndexAsc(id);
        List<Match> leagueMatches = matches.stream().filter(m -> !m.isFinalissima()).toList();
        Match finalissima = matches.stream().filter(Match::isFinalissima).findFirst().orElse(null);

        List<StandingRowDto> standings = standingsCalculator.compute(teams, leagueMatches);
        List<TeamDto> teamDtos = teams.stream().map(DtoMapper::toTeamDto).toList();
        List<MatchDto> matchDtos = matches.stream().map(DtoMapper::toMatchDto).toList();

        return new EditionDetailDto(
                edition.getId(),
                edition.getName(),
                edition.getStatus().name(),
                DtoMapper.toPlayerDto(edition.getSatOutPlayer()),
                resolveChampion(edition.getChampionTeamId()),
                teamDtos,
                standings,
                matchDtos,
                DtoMapper.toMatchDto(finalissima)
        );
    }

    @Transactional
    public EditionDetailDto draw(Long id, DrawRequest request) {
        teamDrawService.draw(id, request == null ? null : request.participantIds());
        return getDetail(id);
    }

    @Transactional(readOnly = true)
    public List<StandingRowDto> getStandings(Long id) {
        if (!editionRepository.existsById(id)) {
            throw new NotFoundException("Edicion " + id + " no encontrada");
        }
        List<Team> teams = teamRepository.findByEditionIdOrderByIdAsc(id);
        List<Match> leagueMatches = matchRepository.findByEditionIdAndFinalissimaFalse(id);
        return standingsCalculator.compute(teams, leagueMatches);
    }

    private EditionSummaryDto toSummary(Edition edition) {
        return new EditionSummaryDto(
                edition.getId(),
                edition.getName(),
                edition.getStatus().name(),
                edition.getCreatedAt(),
                resolveChampion(edition.getChampionTeamId())
        );
    }

    private TeamRefDto resolveChampion(Long championTeamId) {
        if (championTeamId == null) {
            return null;
        }
        return teamRepository.findById(championTeamId)
                .map(DtoMapper::toTeamRefDto)
                .orElse(null);
    }
}
