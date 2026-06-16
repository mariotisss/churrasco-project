package com.churrasco.cup.team;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TeamRepository extends JpaRepository<Team, Long> {

    List<Team> findByEditionIdOrderByIdAsc(Long editionId);

    void deleteByEditionId(Long editionId);
}
