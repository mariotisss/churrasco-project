package com.churrasco.cup.penalty;

import com.churrasco.cup.api.DtoMapper;
import com.churrasco.cup.common.NotFoundException;
import com.churrasco.cup.penalty.dto.CreatePenaltyRequest;
import com.churrasco.cup.penalty.dto.PenaltyDto;
import com.churrasco.cup.penalty.dto.UpdatePenaltyRequest;
import com.churrasco.cup.player.Player;
import com.churrasco.cup.player.PlayerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PenaltyService {

    private final PenaltyRepository repository;
    private final PlayerRepository playerRepository;

    public PenaltyService(PenaltyRepository repository, PlayerRepository playerRepository) {
        this.repository = repository;
        this.playerRepository = playerRepository;
    }

    @Transactional(readOnly = true)
    public List<PenaltyDto> list() {
        return repository.findAllByOrderByCreatedAtDesc().stream()
                .map(DtoMapper::toPenaltyDto)
                .toList();
    }

    @Transactional
    public PenaltyDto create(CreatePenaltyRequest request) {
        Player player = playerRepository.findById(request.playerId())
                .orElseThrow(() -> new NotFoundException(
                        "Jugador " + request.playerId() + " no encontrado"));
        Penalty penalty = new Penalty(player, request.points(), request.reason().trim());
        return DtoMapper.toPenaltyDto(repository.save(penalty));
    }

    @Transactional
    public PenaltyDto update(Long id, UpdatePenaltyRequest request) {
        Penalty penalty = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Penalización " + id + " no encontrada"));
        penalty.setPoints(request.points());
        penalty.setReason(request.reason().trim());
        return DtoMapper.toPenaltyDto(penalty);
    }

    @Transactional
    public void delete(Long id) {
        Penalty penalty = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Penalización " + id + " no encontrada"));
        repository.delete(penalty);
    }
}
