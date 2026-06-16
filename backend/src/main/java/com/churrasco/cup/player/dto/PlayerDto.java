package com.churrasco.cup.player.dto;

import java.time.Instant;

public record PlayerDto(Long id, String name, boolean active, Instant createdAt) {
}
