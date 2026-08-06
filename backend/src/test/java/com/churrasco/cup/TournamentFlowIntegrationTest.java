package com.churrasco.cup;

import com.churrasco.cup.edition.EditionService;
import com.churrasco.cup.edition.dto.CreateEditionRequest;
import com.churrasco.cup.edition.dto.DrawRequest;
import com.churrasco.cup.edition.dto.EditionDetailDto;
import com.churrasco.cup.edition.dto.EditionSummaryDto;
import com.churrasco.cup.edition.dto.StandingRowDto;
import com.churrasco.cup.match.MatchService;
import com.churrasco.cup.match.Side;
import com.churrasco.cup.match.dto.MatchDto;
import com.churrasco.cup.match.dto.MatchResultRequest;
import com.churrasco.cup.match.dto.SideChoiceRequest;
import com.churrasco.cup.player.PlayerService;
import com.churrasco.cup.player.dto.CreatePlayerRequest;
import com.churrasco.cup.player.dto.PlayerDto;
import com.churrasco.cup.team.dto.TeamDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

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

        List<MatchDto> league = detail.matches().stream().filter(m -> !m.playoff()).toList();
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
        List<Long> playerIds = createPlayers("Leo", "Mia", "Noa", "Ona", "Pau", "Qui", "Ras", "Sol");

        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Única Cup", false));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(playerIds, false));

        // 8 players -> 4 teams, single round-robin -> 6 league matches, no VUELTA.
        assertEquals(4, detail.teams().size());
        assertEquals(false, detail.roundTrip(), "La edición debe quedar marcada como partido único");
        List<MatchDto> league = detail.matches().stream().filter(m -> !m.playoff()).toList();
        assertEquals(6, league.size());
        assertTrue(league.stream().allMatch(m -> m.leg().equals("IDA")));
    }

    @Test
    void singleRoundNeedsFourTeamsForTheBracket() {
        List<Long> playerIds = createPlayers("Tim", "Uma", "Val", "Wes", "Xan", "Yal");

        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Corta Cup", false));
        assertThrows(RuntimeException.class,
                () -> editionService.draw(edition.id(), new DrawRequest(playerIds, false)),
                "6 jugadores (3 equipos) no dan para las eliminatorias");

        // The same players can play the ida y vuelta format without any problem.
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(playerIds, true));
        assertEquals(3, detail.teams().size());
    }

    /**
     * Full single-round flow: the league opens a bracket with the cruce alto (1º-2º) and the
     * cruce bajo (4º at the 3º); whoever loses the alto drops into the semifinal against
     * whoever wins the bajo, and that survivor plays the alto's winner in the Finalissima.
     * The better-classified team is always the one at home (the one that picks the side).
     */
    @Test
    void singleRoundLeagueIsFollowedByTheBracketAndTheFinal() {
        List<Long> ids = createPlayers("S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8");
        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Semis Cup", false));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(ids, false));
        assertEquals(4, detail.teams().size());

        EditionDetailDto afterLeague = recordSingleRoundLeague(edition.id(), detail.teams());
        assertEquals(2, afterLeague.playoffs().size(), "La liga abre las dos cruces");
        assertNull(afterLeague.finalissima(), "La final no existe hasta que se resuelve el cuadro");

        List<StandingRowDto> table = afterLeague.standings();
        MatchDto alto = afterLeague.playoffs().get(0);
        MatchDto bajo = afterLeague.playoffs().get(1);
        assertEquals("CRUCE_ALTO", alto.leg());
        assertEquals(table.get(0).teamId(), alto.homeTeam().id(), "1º en casa contra el 2º");
        assertEquals(table.get(1).teamId(), alto.awayTeam().id());
        assertEquals("CRUCE_BAJO", bajo.leg());
        assertEquals(table.get(2).teamId(), bajo.homeTeam().id(), "3º en casa contra el 4º");
        assertEquals(table.get(3).teamId(), bajo.awayTeam().id());

        // The 1st picks its side; the 2nd gets the other one.
        EditionDetailDto withSide =
                matchService.chooseSide(alto.id(), new SideChoiceRequest(Side.AZUL));
        assertEquals("AZUL", withSide.playoffs().get(0).chosenSide());

        // The 2nd loses the alto and the 4th wins the bajo: neither is out yet.
        matchService.recordResult(alto.id(), new MatchResultRequest(5, 2));
        EditionDetailDto afterCruces =
                matchService.recordResult(bajo.id(), new MatchResultRequest(1, 4));
        assertEquals(3, afterCruces.playoffs().size(), "Las dos cruces jugadas definen la semifinal");
        assertNull(afterCruces.finalissima(), "La final espera a la semifinal");
        MatchDto semifinal = afterCruces.playoffs().get(2);
        assertEquals("SEMIFINAL", semifinal.leg());
        assertEquals(table.get(1).teamId(), semifinal.homeTeam().id(),
                "El que cae del cruce alto es el mejor clasificado de los dos");
        assertEquals(table.get(3).teamId(), semifinal.awayTeam().id());

        // The 2nd survives the semifinal, so the final is a rematch of the cruce alto.
        EditionDetailDto afterSemi =
                matchService.recordResult(semifinal.id(), new MatchResultRequest(6, 3));
        MatchDto finalissima = afterSemi.finalissima();
        assertNotNull(finalissima, "La semifinal jugada debe generar la final");
        assertEquals(table.get(0).teamId(), finalissima.homeTeam().id(),
                "El mejor clasificado de los dos finalistas juega en casa y elige lado");
        assertEquals(table.get(1).teamId(), finalissima.awayTeam().id());
        assertNull(finalissima.chosenSide(), "La final empieza sin lado elegido");

        EditionDetailDto finished =
                matchService.recordResult(finalissima.id(), new MatchResultRequest(7, 3));
        assertEquals("FINISHED", finished.status());
        assertEquals(table.get(0).teamId(), finished.champion().id());
    }

    /** Losing the cruce alto is not fatal: the 2nd can still take the title through the semifinal. */
    @Test
    void theSecondChanceCanWinTheEdition() {
        List<Long> ids = createPlayers("R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8");
        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Repesca Cup", false));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(ids, false));

        EditionDetailDto afterLeague = recordSingleRoundLeague(edition.id(), detail.teams());
        List<StandingRowDto> table = afterLeague.standings();
        matchService.recordResult(afterLeague.playoffs().get(0).id(), new MatchResultRequest(5, 2));
        EditionDetailDto afterCruces =
                matchService.recordResult(afterLeague.playoffs().get(1).id(), new MatchResultRequest(5, 1));
        EditionDetailDto afterSemi = matchService.recordResult(
                afterCruces.playoffs().get(2).id(), new MatchResultRequest(5, 3));

        // The 2nd (beaten in the alto) wins the semifinal and then the final, away.
        EditionDetailDto finished = matchService.recordResult(
                afterSemi.finalissima().id(), new MatchResultRequest(2, 6));
        assertEquals(table.get(1).teamId(), finished.champion().id(),
                "Perder la cruce alto no elimina: el 2º puede ser campeón");
    }

    @Test
    void clearingASemifinalResultRemovesTheFinal() {
        List<Long> ids = createPlayers("K1", "K2", "K3", "K4", "K5", "K6", "K7", "K8");
        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Semis Clear", false));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(ids, false));

        EditionDetailDto afterLeague = recordSingleRoundLeague(edition.id(), detail.teams());
        matchService.recordResult(afterLeague.playoffs().get(0).id(), new MatchResultRequest(5, 2));
        EditionDetailDto afterCruces =
                matchService.recordResult(afterLeague.playoffs().get(1).id(), new MatchResultRequest(5, 2));
        Long semifinalId = afterCruces.playoffs().get(2).id();
        EditionDetailDto afterSemi = matchService.recordResult(semifinalId, new MatchResultRequest(5, 2));
        assertNotNull(afterSemi.finalissima());

        EditionDetailDto cleared = matchService.clearResult(semifinalId);
        assertNull(cleared.finalissima(), "Sin semifinal jugada no se conoce al segundo finalista");
        assertEquals(3, cleared.playoffs().size(), "Las cruces y la semifinal siguen en pie");
    }

    @Test
    void clearingACruceRemovesTheRestOfTheBracket() {
        List<Long> ids = createPlayers("E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8");
        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Cruce Clear", false));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(ids, false));

        EditionDetailDto afterLeague = recordSingleRoundLeague(edition.id(), detail.teams());
        Long altoId = afterLeague.playoffs().get(0).id();
        matchService.recordResult(altoId, new MatchResultRequest(5, 2));
        EditionDetailDto afterCruces =
                matchService.recordResult(afterLeague.playoffs().get(1).id(), new MatchResultRequest(5, 2));
        matchService.recordResult(afterCruces.playoffs().get(2).id(), new MatchResultRequest(5, 2));

        EditionDetailDto cleared = matchService.clearResult(altoId);
        assertEquals(2, cleared.playoffs().size(), "Sin la cruce alto jugada la semifinal no existe");
        assertEquals("CRUCE_ALTO", cleared.playoffs().get(0).leg());
        assertEquals("CRUCE_BAJO", cleared.playoffs().get(1).leg());
        assertNull(cleared.finalissima());
    }

    @Test
    void clearingALeagueResultRemovesTheWholePlayoffPhase() {
        List<Long> ids = createPlayers("L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8");
        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Liga Clear", false));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(ids, false));

        EditionDetailDto afterLeague = recordSingleRoundLeague(edition.id(), detail.teams());
        assertEquals(2, afterLeague.playoffs().size());

        MatchDto anyLeagueMatch = afterLeague.matches().stream()
                .filter(m -> !m.playoff()).findFirst().orElseThrow();
        EditionDetailDto cleared = matchService.clearResult(anyLeagueMatch.id());
        assertEquals(0, cleared.playoffs().size(), "Una liga incompleta no tiene eliminatorias");
        assertNull(cleared.finalissima());
    }

    @Test
    void sideCanOnlyBeChosenInThePlayoffs() {
        List<Long> ids = createPlayers("N1", "N2", "N3", "N4");
        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Lado Cup", false));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(ids, true));

        Long leagueMatchId = detail.matches().stream()
                .filter(m -> !m.playoff()).findFirst().orElseThrow().id();
        assertThrows(RuntimeException.class,
                () -> matchService.chooseSide(leagueMatchId, new SideChoiceRequest(Side.AZUL)),
                "En la liga el lado lo fija la ida o la vuelta");
    }

    @Test
    void roundTripFinalIsPlayedAtHomeByTheLeagueWinnerWhoPicksTheSide() {
        List<Long> ids = createPlayers("V1", "V2", "V3", "V4", "V5", "V6");
        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Vuelta Cup", false));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(ids, true));

        long a = detail.teams().get(0).id();
        long b = detail.teams().get(1).id();
        EditionDetailDto afterLeague = recordLeague(edition.id(), a, b);

        MatchDto finalissima = afterLeague.finalissima();
        assertEquals(afterLeague.standings().get(0).teamId(), finalissima.homeTeam().id(),
                "El primero de la liga elige lado, así que juega como local");
        assertNull(finalissima.chosenSide());

        EditionDetailDto picked =
                matchService.chooseSide(finalissima.id(), new SideChoiceRequest(Side.ROJIBLANCO));
        assertEquals("ROJIBLANCO", picked.finalissima().chosenSide());
    }

    /**
     * Records every league match of a single-round edition so the table ends up ordered
     * exactly like {@code teams}: the first team beats everyone, the second beats everyone
     * below it, and so on. Winner scores 5–1.
     */
    private EditionDetailDto recordSingleRoundLeague(Long editionId, List<TeamDto> teams) {
        List<Long> byStrength = teams.stream().map(TeamDto::id).toList();
        EditionDetailDto detail = editionService.getDetail(editionId);
        EditionDetailDto last = detail;
        for (MatchDto m : detail.matches()) {
            if (m.playoff()) {
                continue;
            }
            boolean homeWins = byStrength.indexOf(m.homeTeam().id()) < byStrength.indexOf(m.awayTeam().id());
            last = matchService.recordResult(m.id(),
                    new MatchResultRequest(homeWins ? 5 : 1, homeWins ? 1 : 5));
        }
        return last;
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
        List<MatchDto> league = firstDetail.matches().stream().filter(m -> !m.playoff()).toList();
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
            if (m.playoff()) {
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
    void pairsOfThePreviousEditionAreNotRepeated() {
        List<Long> ids = createPlayers("W1", "W2", "W3", "W4");
        EditionSummaryDto previous = editionService.create(new CreateEditionRequest("Anterior", false));
        Set<Set<Long>> previousPairs = pairsOf(editionService.draw(previous.id(), new DrawRequest(ids)));

        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Siguiente", false));
        for (int i = 0; i < 10; i++) {
            Set<Set<Long>> pairs = pairsOf(editionService.draw(edition.id(), new DrawRequest(ids)));
            for (Set<Long> pair : pairs) {
                assertFalse(previousPairs.contains(pair),
                        "Una pareja de la edición anterior no puede repetirse");
            }
        }
    }

    @Test
    void redrawKeepsTheParticipantsOfTheOriginalDraw() {
        List<Long> everyone = createPlayers("D1", "D2", "D3", "D4", "D5", "D6");
        Set<Long> signedUp = Set.copyOf(everyone.subList(0, 4));

        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Resorteo Cup", false));
        editionService.draw(edition.id(), new DrawRequest(List.copyOf(signedUp)));

        // A re-draw without an explicit list re-shuffles whoever signed up for this
        // edition; it must never pull in the players who stayed out of it.
        EditionDetailDto redrawn = editionService.draw(edition.id(), new DrawRequest(null));
        assertEquals(2, redrawn.teams().size());
        assertEquals(signedUp, participantsOf(redrawn));
    }

    @Test
    void anyEditionCanBeDeletedNotOnlyTheSandboxOnes() {
        List<Long> ids = createPlayers("Z1", "Z2", "Z3", "Z4");
        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Borrable", false));
        editionService.draw(edition.id(), new DrawRequest(ids));

        editionService.delete(edition.id());

        assertThrows(RuntimeException.class, () -> editionService.getDetail(edition.id()),
                "La edición borrada ya no existe");
        assertTrue(editionService.list().stream().noneMatch(e -> e.id().equals(edition.id())));
    }

    /** The drawn pairs, as unordered player-id pairs. */
    private static Set<Set<Long>> pairsOf(EditionDetailDto detail) {
        return detail.teams().stream()
                .map(t -> Set.of(t.player1().id(), t.player2().id()))
                .collect(Collectors.toSet());
    }

    /** Everyone the draw took in: the drawn players plus whoever sat out. */
    private static Set<Long> participantsOf(EditionDetailDto detail) {
        Set<Long> ids = new HashSet<>();
        for (TeamDto team : detail.teams()) {
            ids.add(team.player1().id());
            ids.add(team.player2().id());
        }
        if (detail.satOutPlayer() != null) {
            ids.add(detail.satOutPlayer().id());
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

        List<MatchDto> league = detail.matches().stream().filter(m -> !m.playoff()).toList();
        matchService.recordResult(league.get(0).id(), new MatchResultRequest(5, 1));
        EditionDetailDto afterLeague = matchService.recordResult(league.get(1).id(), new MatchResultRequest(2, 4));

        Long finalissimaId = afterLeague.finalissima().id();
        assertThrows(RuntimeException.class,
                () -> matchService.recordResult(finalissimaId, new MatchResultRequest(3, 3)));
    }

    @Test
    void leagueMatchCannotEndInDraw() {
        List<Long> ids = createPlayers("Da1", "Da2", "Da3", "Da4");
        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Liga Empate", false));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(ids));

        Long leagueMatchId = detail.matches().stream()
                .filter(m -> !m.playoff()).findFirst().orElseThrow().id();
        assertThrows(RuntimeException.class,
                () -> matchService.recordResult(leagueMatchId, new MatchResultRequest(4, 4)),
                "Ningún partido de liga puede terminar en empate");
    }

    @Test
    void clearingLeagueResultRevertsMatchAndRemovesPrematureFinalissima() {
        List<Long> ids = createPlayers("Cl1", "Cl2", "Cl3", "Cl4");
        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Clear Cup", false));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(ids));

        List<MatchDto> league = detail.matches().stream().filter(m -> !m.playoff()).toList();
        assertEquals(2, league.size());
        matchService.recordResult(league.get(0).id(), new MatchResultRequest(5, 2));
        EditionDetailDto afterLeague =
                matchService.recordResult(league.get(1).id(), new MatchResultRequest(1, 4));
        assertNotNull(afterLeague.finalissima(), "La Finalissima se crea al completar la liga");

        // Clearing a league result leaves the league incomplete: the match reverts and the
        // premature Finalissima is dropped (no lingering 0-0).
        EditionDetailDto cleared = matchService.clearResult(league.get(0).id());
        MatchDto reverted = cleared.matches().stream()
                .filter(m -> m.id().equals(league.get(0).id())).findFirst().orElseThrow();
        assertEquals("PENDING", reverted.status());
        assertNull(reverted.homeScore(), "El marcador quitado no debe quedar como 0-0");
        assertNull(reverted.awayScore());
        assertNull(cleared.finalissima(), "La Finalissima prematura debe eliminarse");
    }

    @Test
    void clearingLeagueResultAfterFinalRevertsChampion() {
        List<Long> ids = createPlayers("Cx1", "Cx2", "Cx3", "Cx4");
        EditionSummaryDto edition = editionService.create(new CreateEditionRequest("Clear Champ", false));
        EditionDetailDto detail = editionService.draw(edition.id(), new DrawRequest(ids));

        List<MatchDto> league = detail.matches().stream().filter(m -> !m.playoff()).toList();
        matchService.recordResult(league.get(0).id(), new MatchResultRequest(5, 2));
        EditionDetailDto afterLeague =
                matchService.recordResult(league.get(1).id(), new MatchResultRequest(1, 4));
        EditionDetailDto finished =
                matchService.recordResult(afterLeague.finalissima().id(), new MatchResultRequest(6, 3));
        assertEquals("FINISHED", finished.status());
        assertNotNull(finished.champion());

        EditionDetailDto cleared = matchService.clearResult(league.get(0).id());
        assertNull(cleared.finalissima(), "La final jugada se descarta al quedar la liga incompleta");
        assertNull(cleared.champion(), "El campeón obsoleto debe revertirse");
        assertEquals("IN_PROGRESS", cleared.status());
    }
}
