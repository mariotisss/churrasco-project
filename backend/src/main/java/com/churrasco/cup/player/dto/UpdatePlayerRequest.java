package com.churrasco.cup.player.dto;

import jakarta.validation.constraints.Size;

/** Partial update: any field left null is ignored. */
public record UpdatePlayerRequest(
        @Size(max = 60, message = "El nombre no puede superar 60 caracteres")
        String name,
        Boolean active
) {
}
