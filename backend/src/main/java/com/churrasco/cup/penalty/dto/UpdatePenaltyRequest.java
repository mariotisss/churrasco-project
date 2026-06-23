package com.churrasco.cup.penalty.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdatePenaltyRequest(
        @Min(value = 1, message = "La penalización debe ser de 1 o 2 puntos")
        @Max(value = 2, message = "La penalización debe ser de 1 o 2 puntos")
        int points,

        @NotBlank(message = "La razón es obligatoria")
        @Size(max = 200, message = "La razón no puede superar 200 caracteres")
        String reason
) {
}
