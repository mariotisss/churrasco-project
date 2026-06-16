package com.churrasco.cup.edition.dto;

import java.util.List;

/**
 * Peticion de sorteo. Si participantIds es null o vacio, se usan todos los jugadores activos.
 */
public record DrawRequest(List<Long> participantIds) {
}
