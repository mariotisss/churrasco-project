package com.churrasco.cup.edition;

/** Ciclo de vida de una edicion mensual. */
public enum EditionStatus {
    /** Creada, aun sin equipos sorteados. */
    DRAFT,
    /** Equipos sorteados y calendario generado, sin resultados todavia. */
    TEAMS_DRAWN,
    /** Liga en juego (hay al menos un resultado) o Finalissima pendiente. */
    IN_PROGRESS,
    /** Finalissima jugada y campeon decidido. */
    FINISHED
}
