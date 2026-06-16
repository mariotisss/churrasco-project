package com.churrasco.cup;

import com.churrasco.cup.edition.EditionService;
import com.churrasco.cup.edition.dto.CreateEditionRequest;
import com.churrasco.cup.edition.dto.DrawRequest;
import com.churrasco.cup.edition.dto.EditionDetailDto;
import com.churrasco.cup.edition.dto.EditionSummaryDto;
import com.churrasco.cup.match.MatchService;
import com.churrasco.cup.match.dto.MatchDto;
import com.churrasco.cup.match.dto.MatchResultRequest;
import com.churrasco.cup.player.PlayerService;
import com.churrasco.cup.player.dto.CreatePlayerRequest;
import com.churrasco.cup.player.dto.PlayerDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Test de integracion end-to-end sobre SQLite real (fichero en target/): crea jugadores,
 * sortea con numero impar, anota la liga, y verifica que la Finalissima se genera sola y
 * decide al campeon. @Transactional revierte los datos al terminar.
 */
@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:sqlite:./target/churrasco-test.db",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@Transactional
class TournamentFlowIntegrationTest {

    @Autowired
    private PlayerService playerService;
    @Autowired
    private EditionService editionService;
    @Autowired
    private MatchService matchService;

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Regresion: los campos Instant (created_at) deben poder releerse desde la BD.
     * flush + clear vacia el contexto de persistencia para forzar una hidratacion real
     * desde el ResultSet (no desde la cache de primer nivel).
     */
    @Test
    void instantFieldsRoundTripThroughDatabase() {
        playerService.create(new CreatePlayerRequest("Roundtrip"));
        entityManager.flush();
        entityManager.clear();

        List<PlayerDto> players = playerService.list(false);
        assertEquals(1, players.size());
        assertNotNull(players.get(0).createdAt(), "created_at debe releerse correctamente");
    }

    @Test
    void oddPlayersOneSitsOutAndFinalissimaDecidesChampion() {
        List<Long> playerIds = new ArrayList<>();
        for (String name : List.of("Ana", "Beto", "Caro", "Dani", "Eva")) {
            playerIds.add(playerService.create(new CreatePlayerRequest(name)).id());
        }

        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Test Cup"));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(playerIds));

        // 5 jugadores (impar) -> uno fuera, 2 equipos, 2 partidos de liga (ida y vuelta).
        assertNotNull(detail.satOutPlayer(), "Con numero impar debe quedar un jugador fuera");
        assertEquals(2, detail.teams().size());
        assertEquals("TEAMS_DRAWN", detail.status());

        List<MatchDto> league = detail.matches().stream().filter(m -> !m.finalissima()).toList();
        assertEquals(2, league.size());

        // Anota la liga completa.
        matchService.recordResult(league.get(0).id(), new MatchResultRequest(10, 5));
        EditionDetailDto afterLeague = matchService.recordResult(league.get(1).id(), new MatchResultRequest(3, 8));

        // Liga completa -> la Finalissima se ha creado automaticamente.
        assertNotNull(afterLeague.finalissima(), "La Finalissima debe generarse al completar la liga");
        assertEquals("IN_PROGRESS", afterLeague.status());

        // Anota la Finalissima -> campeon decidido y edicion FINISHED.
        MatchDto finalissima = afterLeague.finalissima();
        EditionDetailDto finished =
                matchService.recordResult(finalissima.id(), new MatchResultRequest(7, 4));

        assertEquals("FINISHED", finished.status());
        assertNotNull(finished.champion(), "Debe haber campeon tras la Finalissima");
        assertEquals(finished.finalissima().homeTeam().id(), finished.champion().id());
    }

    @Test
    void finalissimaCannotEndInDraw() {
        List<Long> playerIds = new ArrayList<>();
        for (String name : List.of("Uno", "Dos", "Tres", "Cuatro")) {
            playerIds.add(playerService.create(new CreatePlayerRequest(name)).id());
        }
        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Empate Cup"));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(playerIds));

        List<MatchDto> league = detail.matches().stream().filter(m -> !m.finalissima()).toList();
        matchService.recordResult(league.get(0).id(), new MatchResultRequest(5, 1));
        EditionDetailDto afterLeague = matchService.recordResult(league.get(1).id(), new MatchResultRequest(2, 4));

        Long finalissimaId = afterLeague.finalissima().id();
        assertThrows(RuntimeException.class,
                () -> matchService.recordResult(finalissimaId, new MatchResultRequest(3, 3)));
    }
}
