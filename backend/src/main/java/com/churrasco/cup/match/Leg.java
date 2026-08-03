package com.churrasco.cup.match;

/** Phase/leg a match belongs to. */
public enum Leg {
    /** League: first (or only) round-robin round. */
    IDA,
    /** League: return round, only in the ida y vuelta format. */
    VUELTA,
    /** Playoff: 1st vs 4th and 2nd vs 3rd, only in the single-round format. */
    SEMIFINAL,
    /** The Finalissima: the match for the title. */
    FINAL
}
