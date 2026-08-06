package com.churrasco.cup.match;

/** Phase/leg a match belongs to. */
public enum Leg {
    /** League: first (or only) round-robin round. */
    IDA,
    /** League: return round, only in the ida y vuelta format. */
    VUELTA,
    /** Playoff: 1st vs 2nd. Its winner goes straight to the Finalissima. */
    LLAVE_ALTA,
    /** Playoff: 4th at the 3rd. Its loser is out of the edition. */
    LLAVE_BAJA,
    /** Playoff: whoever lost the llave alta against whoever won the llave baja. */
    SEMIFINAL,
    /** The Finalissima: the match for the title. */
    FINAL,
    /**
     * Legacy: the 4th-3rd rung of the ladder that briefly replaced the semifinals.
     * Never generated any more; kept so editions drawn back then still load.
     */
    CRUCE
}
