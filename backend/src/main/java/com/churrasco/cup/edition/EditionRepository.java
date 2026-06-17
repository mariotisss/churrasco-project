package com.churrasco.cup.edition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EditionRepository extends JpaRepository<Edition, Long> {

    List<Edition> findAllByOrderByCreatedAtDescIdDesc();

    /** Whether a player sat out in any edition. Used to protect history on delete. */
    boolean existsBySatOutPlayerId(Long satOutPlayerId);
}
