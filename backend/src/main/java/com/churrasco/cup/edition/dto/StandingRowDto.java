package com.churrasco.cup.edition.dto;

import com.churrasco.cup.player.dto.PlayerRefDto;

/** A standings row (computed, not persisted). */
public record StandingRowDto(
        int position,
        Long teamId,
        String teamName,
        PlayerRefDto player1,
        PlayerRefDto player2,
        int played,
        int won,
        int lost,
        int goalsFor,
        int goalsAgainst,
        int goalDifference,
        int points
) {
}
