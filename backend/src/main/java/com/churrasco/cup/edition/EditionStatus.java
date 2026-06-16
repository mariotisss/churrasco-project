package com.churrasco.cup.edition;

/** Lifecycle of a monthly edition. */
public enum EditionStatus {
    /** Created, teams not drawn yet. */
    DRAFT,
    /** Teams drawn and schedule generated, no results yet. */
    TEAMS_DRAWN,
    /** League in progress (at least one result) or Finalissima pending. */
    IN_PROGRESS,
    /** Finalissima played and champion decided. */
    FINISHED
}
