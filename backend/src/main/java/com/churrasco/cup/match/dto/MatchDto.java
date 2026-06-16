package com.churrasco.cup.match.dto;

import com.churrasco.cup.team.dto.TeamRefDto;

import java.time.Instant;

public record MatchDto(
        Long id,
        String leg,
        int orderIndex,
        TeamRefDto homeTeam,
        TeamRefDto awayTeam,
        Integer homeScore,
        Integer awayScore,
        String status,
        boolean finalissima,
        Instant playedAt
) {
}
