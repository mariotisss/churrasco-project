package com.churrasco.cup.edition;

import com.churrasco.cup.player.Player;
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

@Entity
@Table(name = "edition")
public class Edition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EditionStatus status = EditionStatus.DRAFT;

    /** Player who sits out when the number of participants is odd (may be null). */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sat_out_player_id")
    private Player satOutPlayer;

    /**
     * The edition's champion team. Stored as an id (not an association) to avoid a
     * circular edition <-> team dependency in the SQLite schema.
     */
    @Column(name = "champion_team_id")
    private Long championTeamId;

    /** Sandbox edition: kept out of the all-time ranking and the home spotlight. */
    @Column(name = "is_test", nullable = false)
    private boolean test = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected Edition() {
    }

    public Edition(String name) {
        this.name = name;
    }

    public Edition(String name, boolean test) {
        this.name = name;
        this.test = test;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public EditionStatus getStatus() {
        return status;
    }

    public void setStatus(EditionStatus status) {
        this.status = status;
    }

    public Player getSatOutPlayer() {
        return satOutPlayer;
    }

    public void setSatOutPlayer(Player satOutPlayer) {
        this.satOutPlayer = satOutPlayer;
    }

    public Long getChampionTeamId() {
        return championTeamId;
    }

    public void setChampionTeamId(Long championTeamId) {
        this.championTeamId = championTeamId;
    }

    public boolean isTest() {
        return test;
    }

    public void setTest(boolean test) {
        this.test = test;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
