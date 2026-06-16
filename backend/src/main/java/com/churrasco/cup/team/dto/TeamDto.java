package com.churrasco.cup.team.dto;

import com.churrasco.cup.player.dto.PlayerDto;

public record TeamDto(Long id, String name, PlayerDto player1, PlayerDto player2) {
}
