package com.churrasco.cup.player;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A player's profile picture, kept in its own table so that the bytes are only read
 * when the image is actually served -- listing players or an edition never drags the
 * blobs along. The player's {@code photoUpdatedAt} says whether one exists.
 */
@Entity
@Table(name = "player_photo")
public class PlayerPhoto {

    @Id
    @Column(name = "player_id")
    private Long playerId;

    /** Always a square JPEG: whatever is uploaded gets re-encoded before it lands here. */
    @Column(nullable = false)
    private byte[] image;

    protected PlayerPhoto() {
    }

    public PlayerPhoto(Long playerId, byte[] image) {
        this.playerId = playerId;
        this.image = image;
    }

    public Long getPlayerId() {
        return playerId;
    }

    public byte[] getImage() {
        return image;
    }

    public void setImage(byte[] image) {
        this.image = image;
    }
}
