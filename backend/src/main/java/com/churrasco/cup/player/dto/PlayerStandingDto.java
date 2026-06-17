package com.churrasco.cup.player.dto;

/**
 * A player's standing in the all-time ranking: 2 points per edition won as
 * champion, 1 point per edition finished as runner-up (Finalissima loser).
 */
public record PlayerStandingDto(
        Long playerId,
        String name,
        int points,
        int championships,
        int runnerUps
) {
}
