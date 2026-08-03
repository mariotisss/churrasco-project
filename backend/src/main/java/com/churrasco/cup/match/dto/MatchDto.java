package com.churrasco.cup.match.dto;

import com.churrasco.cup.team.dto.TeamRefDto;

import java.time.Instant;

/**
 * @param playoff    true for semifinals and the Finalissima (they never count for the table)
 * @param chosenSide side picked by the home team of a playoff match, null while unpicked
 */
public record MatchDto(
        Long id,
        String leg,
        int orderIndex,
        TeamRefDto homeTeam,
        TeamRefDto awayTeam,
        Integer homeScore,
        Integer awayScore,
        String status,
        boolean playoff,
        String chosenSide,
        Instant playedAt
) {
}
