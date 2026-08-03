package com.churrasco.cup.match.dto;

import com.churrasco.cup.match.Side;
import jakarta.validation.constraints.NotNull;

/** The side of the table picked by the home (better-classified) team of a playoff match. */
public record SideChoiceRequest(
        @NotNull(message = "Hay que elegir un lado de la mesa")
        Side side
) {
}
