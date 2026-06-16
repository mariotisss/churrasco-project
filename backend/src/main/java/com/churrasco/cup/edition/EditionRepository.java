package com.churrasco.cup.edition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EditionRepository extends JpaRepository<Edition, Long> {

    List<Edition> findAllByOrderByCreatedAtDescIdDesc();
}
