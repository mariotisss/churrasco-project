package com.churrasco.cup.match;

/** Phase/leg a match belongs to. */
public enum Leg {
    /** League: first (or only) round-robin round. */
    IDA,
    /** League: return round, only in the ida y vuelta format. */
    VUELTA,
    /** Playoff: 4th at the 3rd, the first rung of the single-round format's ladder. */
    CRUCE,
    /** Playoff: the 2nd against whoever won the cruce, only in the single-round format. */
    SEMIFINAL,
    /** The Finalissima: the match for the title. */
    FINAL
}
