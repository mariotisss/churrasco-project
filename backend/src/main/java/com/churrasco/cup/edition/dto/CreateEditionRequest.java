package com.churrasco.cup.edition.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateEditionRequest(
        @NotBlank(message = "El nombre de la edicion es obligatorio")
        @Size(max = 80, message = "El nombre no puede superar 80 caracteres")
        String name
) {
}
