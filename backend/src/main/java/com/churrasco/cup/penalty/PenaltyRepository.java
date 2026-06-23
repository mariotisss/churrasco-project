package com.churrasco.cup.penalty;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PenaltyRepository extends JpaRepository<Penalty, Long> {

    /** Newest first, for the penalties history view. */
    List<Penalty> findAllByOrderByCreatedAtDesc();
}
