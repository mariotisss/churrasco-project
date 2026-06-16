package com.churrasco.cup.edition.dto;

import java.util.List;

/**
 * Draw request. If participantIds is null or empty, all active players are used.
 */
public record DrawRequest(List<Long> participantIds) {
}
