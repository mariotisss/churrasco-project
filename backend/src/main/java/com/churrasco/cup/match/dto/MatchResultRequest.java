package com.churrasco.cup.match.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record MatchResultRequest(
        @NotNull(message = "El marcador local es obligatorio")
        @Min(value = 0, message = "El marcador no puede ser negativo")
        @Max(value = 99, message = "Marcador demasiado alto")
        Integer homeScore,

        @NotNull(message = "El marcador visitante es obligatorio")
        @Min(value = 0, message = "El marcador no puede ser negativo")
        @Max(value = 99, message = "Marcador demasiado alto")
        Integer awayScore
) {
}
