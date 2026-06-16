package com.churrasco.cup.edition.dto;

/** A standings row (computed, not persisted). */
public record StandingRowDto(
        int position,
        Long teamId,
        String teamName,
        int played,
        int won,
        int drawn,
        int lost,
        int goalsFor,
        int goalsAgainst,
        int goalDifference,
        int points
) {
}
