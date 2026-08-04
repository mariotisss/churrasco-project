package com.churrasco.cup.team.dto;

import com.churrasco.cup.player.dto.PlayerRefDto;

/**
 * Lightweight team reference (for standings and matches). Carries its two players so
 * that a team can be drawn with their faces, not just with the pair's name.
 */
public record TeamRefDto(Long id, String name, PlayerRefDto player1, PlayerRefDto player2) {
}
