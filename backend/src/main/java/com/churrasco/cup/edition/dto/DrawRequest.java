package com.churrasco.cup.edition.dto;

import java.util.List;

/**
 * Draw request. If participantIds is null or empty, all active players are used.
 * roundTrip picks the league format: true (or null) = ida y vuelta (double
 * round-robin), false = partido único (single round-robin).
 */
public record DrawRequest(List<Long> participantIds, Boolean roundTrip) {

    /** Backwards-compatible constructor: defaults to ida y vuelta. */
    public DrawRequest(List<Long> participantIds) {
        this(participantIds, null);
    }

    /** Ida y vuelta by default when the client doesn't specify a format. */
    public boolean isRoundTrip() {
        return roundTrip == null || roundTrip;
    }
}
