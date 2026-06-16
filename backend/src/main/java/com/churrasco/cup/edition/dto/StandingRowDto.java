package com.churrasco.cup.edition.dto;

/** Fila de la clasificacion (calculada, no persistida). */
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
