package com.churrasco.cup.player;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "player")
public class Player {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    /**
     * When the profile picture was last set, or null when the player has none. Doubles
     * as the cache-busting version in the photo URL, so clients see a new picture the
     * moment it is uploaded without ever re-fetching an unchanged one.
     */
    @Column(name = "photo_updated_at")
    private Instant photoUpdatedAt;

    protected Player() {
    }

    public Player(String name) {
        this.name = name;
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

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getPhotoUpdatedAt() {
        return photoUpdatedAt;
    }

    public void setPhotoUpdatedAt(Instant photoUpdatedAt) {
        this.photoUpdatedAt = photoUpdatedAt;
    }
}
