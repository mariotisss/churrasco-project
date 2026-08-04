package com.churrasco.cup.team;

import com.churrasco.cup.edition.Edition;
import com.churrasco.cup.player.Player;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * A pair of players for one edition. The team name is <b>derived</b> from its two
 * players, never stored: renaming a player has to show up everywhere the team appears,
 * including editions played long ago.
 */
@Entity
@Table(name = "team")
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "edition_id", nullable = false)
    private Edition edition;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "player1_id", nullable = false)
    private Player player1;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "player2_id", nullable = false)
    private Player player2;

    protected Team() {
    }

    public Team(Edition edition, Player player1, Player player2) {
        this.edition = edition;
        this.player1 = player1;
        this.player2 = player2;
    }

    public Long getId() {
        return id;
    }

    public Edition getEdition() {
        return edition;
    }

    /** "Ana &amp; Bea" — player1 (delante) first, always from the players' current names. */
    public String getName() {
        return player1.getName() + " & " + player2.getName();
    }

    public Player getPlayer1() {
        return player1;
    }

    public Player getPlayer2() {
        return player2;
    }
}
