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
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * End-to-end integration test over real SQLite (file under target/): creates players,
 * draws with an odd count, records the league, and checks that the Finalissima is created
 * automatically and decides the champion. @Transactional rolls back the data afterwards.
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
     * Regression: Instant fields (created_at) must be re-readable from the DB.
     * flush + clear empties the persistence context to force a real hydration from the
     * ResultSet (not from the first-level cache).
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

        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Test Cup", false));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(playerIds));

        // 5 players (odd) -> one sits out, 2 teams, 2 league matches (home and away).
        assertNotNull(detail.satOutPlayer(), "Con numero impar debe quedar un jugador fuera");
        assertEquals(2, detail.teams().size());
        assertEquals("TEAMS_DRAWN", detail.status());

        List<MatchDto> league = detail.matches().stream().filter(m -> !m.finalissima()).toList();
        assertEquals(2, league.size());

        // Record the whole league.
        matchService.recordResult(league.get(0).id(), new MatchResultRequest(10, 5));
        EditionDetailDto afterLeague = matchService.recordResult(league.get(1).id(), new MatchResultRequest(3, 8));

        // League complete -> the Finalissima has been created automatically.
        assertNotNull(afterLeague.finalissima(), "La Finalissima debe generarse al completar la liga");
        assertEquals("IN_PROGRESS", afterLeague.status());

        // Record the Finalissima -> champion decided and edition FINISHED.
        MatchDto finalissima = afterLeague.finalissima();
        EditionDetailDto finished =
                matchService.recordResult(finalissima.id(), new MatchResultRequest(7, 4));

        assertEquals("FINISHED", finished.status());
        assertNotNull(finished.champion(), "Debe haber campeon tras la Finalissima");
        assertEquals(finished.finalissima().homeTeam().id(), finished.champion().id());
    }

    @Test
    void singleRoundDrawGeneratesOneLegAndFlagsTheEdition() {
        List<Long> playerIds = new ArrayList<>();
        for (String name : List.of("Leo", "Mia", "Noa", "Ona")) {
            playerIds.add(playerService.create(new CreatePlayerRequest(name)).id());
        }

        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Única Cup", false));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(playerIds, false));

        // 4 players -> 2 teams, single round-robin -> 1 league match, no VUELTA.
        assertEquals(2, detail.teams().size());
        assertEquals(false, detail.roundTrip(), "La edición debe quedar marcada como partido único");
        List<MatchDto> league = detail.matches().stream().filter(m -> !m.finalissima()).toList();
        assertEquals(1, league.size());
        assertEquals("IDA", league.get(0).leg());
    }

    @Test
    void satOutPlayerIsNeverOneWithFewerPlayedMatches() {
        // First edition: four veterans play a full tournament (3 played matches each).
        List<Long> veteranIds = new ArrayList<>();
        for (String name : List.of("Vet1", "Vet2", "Vet3", "Vet4")) {
            veteranIds.add(playerService.create(new CreatePlayerRequest(name)).id());
        }
        EditionSummaryDto first = editionService.create(new CreateEditionRequest("Primera", false));
        EditionDetailDto firstDetail = editionService.draw(first.id(), new DrawRequest(veteranIds));
        List<MatchDto> league = firstDetail.matches().stream().filter(m -> !m.finalissima()).toList();
        matchService.recordResult(league.get(0).id(), new MatchResultRequest(10, 5));
        EditionDetailDto afterLeague =
                matchService.recordResult(league.get(1).id(), new MatchResultRequest(3, 8));
        matchService.recordResult(afterLeague.finalissima().id(), new MatchResultRequest(7, 4));

        // Second edition: the four veterans plus a newcomer with zero played matches.
        Long rookieId = playerService.create(new CreatePlayerRequest("Novato")).id();
        List<Long> allIds = new ArrayList<>(veteranIds);
        allIds.add(rookieId);
        EditionSummaryDto second = editionService.create(new CreateEditionRequest("Segunda", false));

        // Re-draw several times: the rookie must never be the one sitting out.
        for (int i = 0; i < 5; i++) {
            EditionDetailDto detail = editionService.draw(second.id(), new DrawRequest(allIds));
            assertNotNull(detail.satOutPlayer());
            assertNotEquals(rookieId, detail.satOutPlayer().id(),
                    "El jugador con menos partidos que el resto no puede quedarse fuera");
        }
    }

    @Test
    void editingLeagueResultReseedsThePendingFinalissima() {
        List<Long> ids = createPlayers("P1", "P2", "P3", "P4", "P5", "P6");
        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Reseed Cup", false));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(ids));
        assertEquals(3, detail.teams().size(), "6 jugadores -> 3 equipos");

        long a = detail.teams().get(0).id(); // will always win
        long b = detail.teams().get(1).id();
        long c = detail.teams().get(2).id();

        // A wins everything and B beats C -> standings A, B, C -> Finalissima A vs B.
        EditionDetailDto afterLeague = recordLeague(edition.id(), a, b);
        assertNotNull(afterLeague.finalissima(), "La Finalissima debe generarse al completar la liga");
        assertEquals(Set.of(a, b), finalists(afterLeague.finalissima()));
        assertEquals("PENDING", afterLeague.finalissima().status());

        // Correct the B–C results so C now finishes 2nd -> the final must be re-seeded to A vs C.
        EditionDetailDto reseeded = recordLeague(edition.id(), a, c);
        assertEquals(Set.of(a, c), finalists(reseeded.finalissima()),
                "Editar la liga debe re-sembrar la Finalissima con el nuevo top-2");
        assertEquals("PENDING", reseeded.finalissima().status());
        assertNull(reseeded.champion());
        assertEquals("IN_PROGRESS", reseeded.status());
    }

    @Test
    void editingLeagueResultAfterFinalRevertsChampionWhenFinalistsChange() {
        List<Long> ids = createPlayers("Q1", "Q2", "Q3", "Q4", "Q5", "Q6");
        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Revert Cup", false));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(ids));

        long a = detail.teams().get(0).id();
        long b = detail.teams().get(1).id();
        long c = detail.teams().get(2).id();

        EditionDetailDto afterLeague = recordLeague(edition.id(), a, b); // final A vs B
        EditionDetailDto finished =
                matchService.recordResult(afterLeague.finalissima().id(), new MatchResultRequest(6, 3));
        assertEquals("FINISHED", finished.status());
        assertNotNull(finished.champion());

        // Correct the league so C replaces B in the top-2: the played final is no longer valid.
        EditionDetailDto reverted = recordLeague(edition.id(), a, c);
        assertEquals(Set.of(a, c), finalists(reverted.finalissima()));
        assertEquals("PENDING", reverted.finalissima().status(), "La final re-sembrada vuelve a estar por jugar");
        assertNull(reverted.champion(), "El campeón obsoleto debe revertirse");
        assertEquals("IN_PROGRESS", reverted.status());
    }

    @Test
    void editingLeagueResultThatKeepsFinalistsPreservesTheChampion() {
        List<Long> ids = createPlayers("R1", "R2", "R3", "R4", "R5", "R6");
        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Stable Cup", false));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(ids));

        long a = detail.teams().get(0).id();
        long b = detail.teams().get(1).id();

        EditionDetailDto afterLeague = recordLeague(edition.id(), a, b); // final A vs B
        EditionDetailDto finished =
                matchService.recordResult(afterLeague.finalissima().id(), new MatchResultRequest(6, 3));
        Long championId = finished.champion().id();
        assertEquals("FINISHED", finished.status());

        // Re-record the same outcome (A 1st, B 2nd) -> finalists unchanged, so nothing is disturbed.
        EditionDetailDto edited = recordLeague(edition.id(), a, b);
        assertEquals("FINISHED", edited.status(), "Un cambio que no altera el top-2 no debe tocar la final");
        assertEquals(championId, edited.champion().id());
        assertEquals("PLAYED", edited.finalissima().status());
    }

    /**
     * Records (or re-records) every league match so {@code strong} wins all of its games and,
     * among the other two teams, {@code bcWinner} wins their head-to-head. Winner scores 5–1.
     * Returns the edition detail after the last league match, so the Finalissima is reflected.
     */
    private EditionDetailDto recordLeague(Long editionId, long strong, long bcWinner) {
        EditionDetailDto detail = editionService.getDetail(editionId);
        EditionDetailDto last = detail;
        for (MatchDto m : detail.matches()) {
            if (m.finalissima()) {
                continue;
            }
            long home = m.homeTeam().id();
            long away = m.awayTeam().id();
            long winner = (home == strong || away == strong) ? strong : bcWinner;
            int homeScore = home == winner ? 5 : 1;
            int awayScore = home == winner ? 1 : 5;
            last = matchService.recordResult(m.id(), new MatchResultRequest(homeScore, awayScore));
        }
        return last;
    }

    private static Set<Long> finalists(MatchDto finalissima) {
        return Set.of(finalissima.homeTeam().id(), finalissima.awayTeam().id());
    }

    private List<Long> createPlayers(String... names) {
        List<Long> ids = new ArrayList<>();
        for (String name : names) {
            ids.add(playerService.create(new CreatePlayerRequest(name)).id());
        }
        return ids;
    }

    @Test
    void finalissimaCannotEndInDraw() {
        List<Long> playerIds = new ArrayList<>();
        for (String name : List.of("Uno", "Dos", "Tres", "Cuatro")) {
            playerIds.add(playerService.create(new CreatePlayerRequest(name)).id());
        }
        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Empate Cup", false));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(playerIds));

        List<MatchDto> league = detail.matches().stream().filter(m -> !m.finalissima()).toList();
        matchService.recordResult(league.get(0).id(), new MatchResultRequest(5, 1));
        EditionDetailDto afterLeague = matchService.recordResult(league.get(1).id(), new MatchResultRequest(2, 4));

        Long finalissimaId = afterLeague.finalissima().id();
        assertThrows(RuntimeException.class,
                () -> matchService.recordResult(finalissimaId, new MatchResultRequest(3, 3)));
    }
}
