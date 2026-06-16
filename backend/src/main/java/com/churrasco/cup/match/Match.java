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

/** Un partido del torneo. Tabla "game" (MATCH es palabra reservada en SQLite). */
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

    @Column(name = "is_finalissima", nullable = false)
    private boolean finalissima = false;

    @Column(name = "played_at")
    private Instant playedAt;

    protected Match() {
    }

    public Match(Edition edition, Team homeTeam, Team awayTeam, Leg leg, int orderIndex, boolean finalissima) {
        this.edition = edition;
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;
        this.leg = leg;
        this.orderIndex = orderIndex;
        this.finalissima = finalissima;
    }

    /** Registra el resultado y marca el partido como jugado. */
    public void recordResult(int homeScore, int awayScore) {
        this.homeScore = homeScore;
        this.awayScore = awayScore;
        this.status = MatchStatus.PLAYED;
        this.playedAt = Instant.now();
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

    public boolean isFinalissima() {
        return finalissima;
    }

    public Instant getPlayedAt() {
        return playedAt;
    }
}
