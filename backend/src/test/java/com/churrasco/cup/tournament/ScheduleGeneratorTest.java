package com.churrasco.cup.tournament;

import com.churrasco.cup.edition.Edition;
import com.churrasco.cup.match.Leg;
import com.churrasco.cup.match.Match;
import com.churrasco.cup.player.Player;
import com.churrasco.cup.team.Team;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ScheduleGeneratorTest {

    private final ScheduleGenerator generator = new ScheduleGenerator();

    private List<Team> teams(int n) {
        Edition edition = new Edition("test");
        List<Team> result = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            result.add(new Team(edition, "T" + i, new Player("P" + i + "a"), new Player("P" + i + "b")));
        }
        return result;
    }

    @Test
    void threeTeamsProduceSixMatches() {
        assertEquals(6, generator.generate(new Edition("e"), teams(3)).size());
    }

    @Test
    void fourTeamsProduceTwelveMatches() {
        assertEquals(12, generator.generate(new Edition("e"), teams(4)).size());
    }

    @Test
    void twoTeamsProduceTwoMatches() {
        assertEquals(2, generator.generate(new Edition("e"), teams(2)).size());
    }

    @Test
    void noTeamPlaysAgainstItself() {
        List<Match> matches = generator.generate(new Edition("e"), teams(4));
        assertTrue(matches.stream()
                .noneMatch(m -> m.getHomeTeam().getName().equals(m.getAwayTeam().getName())));
    }

    @Test
    void eachUnorderedPairPlaysExactlyTwiceOnceEachOrientation() {
        List<Match> matches = generator.generate(new Edition("e"), teams(4));

        long ida = matches.stream().filter(m -> m.getLeg() == Leg.IDA).count();
        long vuelta = matches.stream().filter(m -> m.getLeg() == Leg.VUELTA).count();
        assertEquals(6, ida);
        assertEquals(6, vuelta);

        // Cada pareja ordenada (local>visitante) aparece como mucho una vez.
        Set<String> orderedPairs = new HashSet<>();
        for (Match m : matches) {
            String key = m.getHomeTeam().getName() + ">" + m.getAwayTeam().getName();
            assertTrue(orderedPairs.add(key), "Pareja ordenada repetida: " + key);
        }

        // Cada pareja no ordenada aparece exactamente dos veces (ida y vuelta).
        Map<String, Integer> unordered = new HashMap<>();
        for (Match m : matches) {
            String a = m.getHomeTeam().getName();
            String b = m.getAwayTeam().getName();
            String key = a.compareTo(b) < 0 ? a + "-" + b : b + "-" + a;
            unordered.merge(key, 1, Integer::sum);
        }
        assertEquals(6, unordered.size());
        assertTrue(unordered.values().stream().allMatch(count -> count == 2));
    }

    @Test
    void orderIndexIsContiguousAndUnique() {
        List<Match> matches = generator.generate(new Edition("e"), teams(3));
        List<Integer> indices = matches.stream().map(Match::getOrderIndex).sorted().toList();
        assertEquals(List.of(0, 1, 2, 3, 4, 5), indices);
    }
}
