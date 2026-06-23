package com.churrasco.cup.penalty.dto;

import java.time.Instant;

/** A penalty as shown in the history: who, how many points were deducted and why. */
public record PenaltyDto(
        Long id,
        Long playerId,
        String playerName,
        int points,
        String reason,
        Instant createdAt
) {
}
