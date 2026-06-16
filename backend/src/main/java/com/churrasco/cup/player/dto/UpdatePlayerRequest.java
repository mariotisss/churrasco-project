package com.churrasco.cup.player.dto;

import jakarta.validation.constraints.Size;

/** Actualizacion parcial: cualquier campo puede venir a null y se ignora. */
public record UpdatePlayerRequest(
        @Size(max = 60, message = "El nombre no puede superar 60 caracteres")
        String name,
        Boolean active
) {
}
