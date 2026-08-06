package com.churrasco.cup.edition.dto;

import com.churrasco.cup.match.dto.MatchDto;
import com.churrasco.cup.player.dto.PlayerDto;
import com.churrasco.cup.team.dto.TeamDto;
import com.churrasco.cup.team.dto.TeamRefDto;

import java.util.List;

/**
 * Full view of an edition for rendering the interactive bracket.
 *
 * @param playoffs    the playoff rounds before the Finalissima, in play order (both
 *                    cruces and the semifinal they feed); empty unless the single-round
 *                    format is in play and the league is over
 * @param finalissima the match for the title, null until its finalists are known
 */
public record EditionDetailDto(
        Long id,
        String name,
        String status,
        boolean test,
        boolean roundTrip,
        PlayerDto satOutPlayer,
        TeamRefDto champion,
        List<TeamDto> teams,
        List<StandingRowDto> standings,
        List<MatchDto> matches,
        List<MatchDto> playoffs,
        MatchDto finalissima
) {
}
