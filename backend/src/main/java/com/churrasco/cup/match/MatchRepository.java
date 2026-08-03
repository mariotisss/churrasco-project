package com.churrasco.cup.match;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MatchRepository extends JpaRepository<Match, Long> {

    List<Match> findByEditionIdOrderByOrderIndexAsc(Long editionId);

    List<Match> findByStatus(MatchStatus status);

    List<Match> findByEditionIdAndPlayoffFalse(Long editionId);

    boolean existsByEditionIdAndStatus(Long editionId, MatchStatus status);

    boolean existsByEditionIdAndPlayoffFalseAndStatus(Long editionId, MatchStatus status);

    boolean existsByEditionIdAndPlayoffTrue(Long editionId);

    void deleteByEditionId(Long editionId);
}
