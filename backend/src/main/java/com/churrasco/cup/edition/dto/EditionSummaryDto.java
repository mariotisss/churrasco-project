package com.churrasco.cup.edition.dto;

import com.churrasco.cup.team.dto.TeamRefDto;

import java.time.Instant;

public record EditionSummaryDto(
        Long id,
        String name,
        String status,
        boolean test,
        Instant createdAt,
        TeamRefDto champion
) {
}
