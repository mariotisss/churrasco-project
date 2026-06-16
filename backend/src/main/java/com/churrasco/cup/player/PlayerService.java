package com.churrasco.cup.player;

import com.churrasco.cup.api.DtoMapper;
import com.churrasco.cup.common.BadRequestException;
import com.churrasco.cup.common.NotFoundException;
import com.churrasco.cup.player.dto.CreatePlayerRequest;
import com.churrasco.cup.player.dto.PlayerDto;
import com.churrasco.cup.player.dto.UpdatePlayerRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PlayerService {

    private final PlayerRepository repository;

    public PlayerService(PlayerRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<PlayerDto> list(boolean activeOnly) {
        List<Player> players = activeOnly
                ? repository.findByActiveTrueOrderByNameAsc()
                : repository.findAllByOrderByNameAsc();
        return players.stream().map(DtoMapper::toPlayerDto).toList();
    }

    @Transactional
    public PlayerDto create(CreatePlayerRequest request) {
        String name = request.name().trim();
        if (repository.existsByNameIgnoreCase(name)) {
            throw new BadRequestException("Ya existe un jugador con el nombre '" + name + "'");
        }
        return DtoMapper.toPlayerDto(repository.save(new Player(name)));
    }

    @Transactional
    public PlayerDto update(Long id, UpdatePlayerRequest request) {
        Player player = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Jugador " + id + " no encontrado"));

        if (request.name() != null && !request.name().isBlank()) {
            String name = request.name().trim();
            if (!name.equalsIgnoreCase(player.getName()) && repository.existsByNameIgnoreCase(name)) {
                throw new BadRequestException("Ya existe un jugador con el nombre '" + name + "'");
            }
            player.setName(name);
        }
        if (request.active() != null) {
            player.setActive(request.active());
        }
        return DtoMapper.toPlayerDto(player);
    }

    /** Baja logica: no se borra, se marca inactivo (preserva historial de ediciones). */
    @Transactional
    public void deactivate(Long id) {
        Player player = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Jugador " + id + " no encontrado"));
        player.setActive(false);
    }
}
