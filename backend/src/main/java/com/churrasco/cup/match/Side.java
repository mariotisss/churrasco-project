package com.churrasco.cup.match;

/**
 * One of the two sides of the futbolín table. In the league the side is fixed by the
 * leg (see the frontend's MatchSide), but in the playoffs the better-classified team
 * picks where it plays, so the choice has to be stored per match.
 */
public enum Side {
    ROJIBLANCO,
    AZUL;

    /** The side left for the opponent. */
    public Side opposite() {
        return this == ROJIBLANCO ? AZUL : ROJIBLANCO;
    }
}
