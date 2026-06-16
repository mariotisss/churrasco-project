package com.churrasco.cup.player;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlayerRepository extends JpaRepository<Player, Long> {

    List<Player> findAllByOrderByNameAsc();

    List<Player> findByActiveTrueOrderByNameAsc();

    boolean existsByNameIgnoreCase(String name);
}
