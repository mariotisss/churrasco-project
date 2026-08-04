package com.churrasco.cup.player.dto;

import java.time.Instant;

/** {@code photoVersion} is null when the player has no profile picture. */
public record PlayerDto(Long id, String name, boolean active, Instant createdAt, Long photoVersion) {
}
