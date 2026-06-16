package com.churrasco.cup.match;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MatchRepository extends JpaRepository<Match, Long> {

    List<Match> findByEditionIdOrderByOrderIndexAsc(Long editionId);

    List<Match> findByEditionIdAndFinalissimaFalse(Long editionId);

    boolean existsByEditionIdAndStatus(Long editionId, MatchStatus status);

    boolean existsByEditionIdAndFinalissimaFalseAndStatus(Long editionId, MatchStatus status);

    boolean existsByEditionIdAndFinalissimaTrue(Long editionId);

    void deleteByEditionId(Long editionId);
}
