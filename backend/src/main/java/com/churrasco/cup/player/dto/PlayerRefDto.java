package com.churrasco.cup.player.dto;

/**
 * Just enough of a player to draw them: the name, and the version of their profile
 * picture ({@code null} when they have none) to build the photo URL and cache it.
 */
public record PlayerRefDto(Long id, String name, Long photoVersion) {
}
