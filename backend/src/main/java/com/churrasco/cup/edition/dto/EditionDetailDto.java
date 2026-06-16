package com.churrasco.cup.edition.dto;

import com.churrasco.cup.match.dto.MatchDto;
import com.churrasco.cup.player.dto.PlayerDto;
import com.churrasco.cup.team.dto.TeamDto;
import com.churrasco.cup.team.dto.TeamRefDto;

import java.util.List;

/** Full view of an edition for rendering the interactive bracket. */
public record EditionDetailDto(
        Long id,
        String name,
        String status,
        PlayerDto satOutPlayer,
        TeamRefDto champion,
        List<TeamDto> teams,
        List<StandingRowDto> standings,
        List<MatchDto> matches,
        MatchDto finalissima
) {
}
