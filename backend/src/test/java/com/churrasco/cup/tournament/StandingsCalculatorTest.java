package com.churrasco.cup.tournament;

import com.churrasco.cup.edition.Edition;
import com.churrasco.cup.edition.dto.StandingRowDto;
import com.churrasco.cup.match.Leg;
import com.churrasco.cup.match.Match;
import com.churrasco.cup.player.Player;
import com.churrasco.cup.team.Team;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class StandingsCalculatorTest {

    private final StandingsCalculator calculator = new StandingsCalculator();
    private final Edition edition = new Edition("test");

    /** A team whose derived name is "<name>1 &amp; <name>2", so it sorts under `name`. */
    private Team team(long id, String name) {
        Team team = new Team(edition, new Player(name + "1"), new Player(name + "2"));
        ReflectionTestUtils.setField(team, "id", id);
        return team;
    }

    private Match played(Team home, Team away, int homeScore, int awayScore) {
        Match match = new Match(edition, home, away, Leg.IDA, 0, false);
        match.recordResult(homeScore, awayScore);
        return match;
    }

    @Test
    void rankByPointsThenGoalDifference() {
        Team a = team(1, "A");
        Team b = team(2, "B");
        Team c = team(3, "C");

        List<Match> matches = List.of(
                played(a, b, 2, 0),  // A gana
                played(a, c, 3, 1),  // A gana
                played(b, c, 3, 1)   // B gana
        );

        List<StandingRowDto> table = calculator.compute(List.of(a, b, c), matches);

        // A: 6 pts (gd +4). B: 3 pts (gd 0). C: 0 pts (gd -4).
        assertEquals("A1 & A2", table.get(0).teamName());
        assertEquals(6, table.get(0).points());
        assertEquals(2, table.get(0).won());
        assertEquals(0, table.get(0).lost());
        assertEquals(4, table.get(0).goalDifference());
        assertEquals(1, table.get(0).position());

        assertEquals("B1 & B2", table.get(1).teamName());
        assertEquals(3, table.get(1).points());

        assertEquals("C1 & C2", table.get(2).teamName());
        assertEquals(0, table.get(2).points());
        assertEquals(2, table.get(2).lost());
        assertEquals(3, table.get(2).position());
    }

    @Test
    void tieOnPointsBrokenByGoalDifference() {
        Team x = team(1, "X");
        Team y = team(2, "Y");
        Team z = team(3, "Z");

        List<Match> matches = List.of(
                played(x, z, 3, 0),  // X gana, gd +3
                played(y, z, 1, 0)   // Y gana, gd +1
        );

        List<StandingRowDto> table = calculator.compute(List.of(x, y, z), matches);

        // X and Y tie on 3 points; X ahead on goal difference.
        assertEquals("X1 & X2", table.get(0).teamName());
        assertEquals("Y1 & Y2", table.get(1).teamName());
        assertEquals("Z1 & Z2", table.get(2).teamName());
        assertEquals(0, table.get(2).points());
    }

    @Test
    void teamsWithoutMatchesStillAppear() {
        Team a = team(1, "A");
        Team b = team(2, "B");
        List<StandingRowDto> table = calculator.compute(List.of(a, b), List.of());
        assertEquals(2, table.size());
        assertEquals(0, table.get(0).played());
    }
}
