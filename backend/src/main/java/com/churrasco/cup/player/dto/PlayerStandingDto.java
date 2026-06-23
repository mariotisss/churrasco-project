package com.churrasco.cup.player.dto;

/**
 * A player's standing in the all-time ranking: 2 points per edition won as
 * champion, 1 point per edition finished as runner-up (Finalissima loser),
 * minus any manual penalties. {@code points} is already the net total;
 * {@code penaltyPoints} is the amount deducted (a positive number) so the UI
 * can show why the total dropped.
 */
public record PlayerStandingDto(
        Long playerId,
        String name,
        int points,
        int championships,
        int runnerUps,
        int penaltyPoints
) {
}
