package com.churrasco.cup.team;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TeamRepository extends JpaRepository<Team, Long> {

    List<Team> findByEditionIdOrderByIdAsc(Long editionId);

    void deleteByEditionId(Long editionId);

    /** Whether a player is part of any team (in any edition). Used to protect history on delete. */
    boolean existsByPlayer1IdOrPlayer2Id(Long player1Id, Long player2Id);
}
