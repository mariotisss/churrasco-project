package com.churrasco.cup.tournament;

import com.churrasco.cup.edition.Edition;
import com.churrasco.cup.match.Leg;
import com.churrasco.cup.match.Match;
import com.churrasco.cup.team.Team;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Generates the schedule for N teams, either a double round-robin (ida y vuelta,
 * each pair twice -> N*(N-1) matches) or a single round-robin (partido único, each
 * pair once -> N*(N-1)/2 matches), depending on {@code roundTrip}.
 *
 * Uses the "circle method" to spread the pairings across rounds where no team plays
 * twice. When roundTrip is set the VUELTA (away leg) repeats the same pairings with
 * home/away swapped.
 */
@Component
public class ScheduleGenerator {

    private static final int BYE = -1;

    public List<Match> generate(Edition edition, List<Team> teams, boolean roundTrip) {
        int n = teams.size();
        if (n < 2) {
            throw new IllegalArgumentException("Se necesitan al menos 2 equipos para generar el calendario");
        }

        List<int[]> idaPairings = roundRobinPairings(n);

        List<Match> matches = new ArrayList<>(idaPairings.size() * (roundTrip ? 2 : 1));
        int order = 0;

        // IDA (home leg): a at home, b away
        for (int[] pair : idaPairings) {
            matches.add(new Match(edition, teams.get(pair[0]), teams.get(pair[1]), Leg.IDA, order++, false));
        }
        // VUELTA (away leg): home/away swapped -- only for the ida y vuelta format.
        if (roundTrip) {
            for (int[] pair : idaPairings) {
                matches.add(new Match(edition, teams.get(pair[1]), teams.get(pair[0]), Leg.VUELTA, order++, false));
            }
        }

        return matches;
    }

    /**
     * Single round-robin pairings (each pair once) ordered into rounds via the circle
     * method. Returns indices into the team list.
     */
    private List<int[]> roundRobinPairings(int n) {
        List<Integer> slots = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            slots.add(i);
        }
        if (n % 2 != 0) {
            slots.add(BYE); // bye round for an odd team count
        }

        int m = slots.size();
        int rounds = m - 1;
        int half = m / 2;

        List<int[]> pairings = new ArrayList<>();
        for (int r = 0; r < rounds; r++) {
            for (int i = 0; i < half; i++) {
                int a = slots.get(i);
                int b = slots.get(m - 1 - i);
                if (a != BYE && b != BYE) {
                    pairings.add(new int[]{a, b});
                }
            }
            // Rotation: the first slot stays fixed and the rest rotate by one position.
            Integer last = slots.remove(m - 1);
            slots.add(1, last);
        }
        return pairings;
    }
}
