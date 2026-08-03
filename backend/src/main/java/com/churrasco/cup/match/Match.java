package com.churrasco.cup.match;

import com.churrasco.cup.edition.Edition;
import com.churrasco.cup.team.Team;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

/** A tournament match. Table "game" (MATCH is a reserved keyword in SQLite). */
@Entity
@Table(name = "game")
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "edition_id", nullable = false)
    private Edition edition;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "home_team_id", nullable = false)
    private Team homeTeam;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "away_team_id", nullable = false)
    private Team awayTeam;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Leg leg;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    @Column(name = "home_score")
    private Integer homeScore;

    @Column(name = "away_score")
    private Integer awayScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MatchStatus status = MatchStatus.PENDING;

    /**
     * True for playoff matches (semifinals and the Finalissima), i.e. everything that
     * doesn't count for the league table. The column keeps its original name from when
     * the Finalissima was the only playoff match there was.
     */
    @Column(name = "is_finalissima", nullable = false)
    private boolean playoff = false;

    /**
     * Side of the table picked by the home team, or null while nobody has picked yet.
     * Only playoff matches have one: there the better-classified team is always the home
     * team and gets to choose, while league sides are fixed by the leg.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "chosen_side")
    private Side chosenSide;

    @Column(name = "played_at")
    private Instant playedAt;

    protected Match() {
    }

    public Match(Edition edition, Team homeTeam, Team awayTeam, Leg leg, int orderIndex, boolean playoff) {
        this.edition = edition;
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;
        this.leg = leg;
        this.orderIndex = orderIndex;
        this.playoff = playoff;
    }

    /** Records the result and marks the match as played. */
    public void recordResult(int homeScore, int awayScore) {
        this.homeScore = homeScore;
        this.awayScore = awayScore;
        this.status = MatchStatus.PLAYED;
        this.playedAt = Instant.now();
    }

    /**
     * Clears any recorded result, reverting the match to an unplayed (PENDING) state.
     * Used when a result is removed so a blanked score never lingers as a 0-0 draw.
     */
    public void clearResult() {
        this.homeScore = null;
        this.awayScore = null;
        this.status = MatchStatus.PENDING;
        this.playedAt = null;
    }

    /**
     * Re-seeds this match for a new pair of teams, discarding any recorded result and
     * the side that had been picked (a new home team gets to choose again). Used when a
     * result edit changes who qualifies for a playoff match.
     */
    public void reseed(Team homeTeam, Team awayTeam) {
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;
        this.homeScore = null;
        this.awayScore = null;
        this.status = MatchStatus.PENDING;
        this.playedAt = null;
        this.chosenSide = null;
    }

    /** Records the side the home team picks to play on. */
    public void chooseSide(Side side) {
        this.chosenSide = side;
    }

    public Long getId() {
        return id;
    }

    public Edition getEdition() {
        return edition;
    }

    public Team getHomeTeam() {
        return homeTeam;
    }

    public Team getAwayTeam() {
        return awayTeam;
    }

    public Leg getLeg() {
        return leg;
    }

    public int getOrderIndex() {
        return orderIndex;
    }

    public Integer getHomeScore() {
        return homeScore;
    }

    public Integer getAwayScore() {
        return awayScore;
    }

    public MatchStatus getStatus() {
        return status;
    }

    /** True for semifinals and the Finalissima: playoff matches never count for the table. */
    public boolean isPlayoff() {
        return playoff;
    }

    /** The Finalissima itself (as opposed to a semifinal). */
    public boolean isFinal() {
        return playoff && leg == Leg.FINAL;
    }

    public Side getChosenSide() {
        return chosenSide;
    }

    public Instant getPlayedAt() {
        return playedAt;
    }
}
