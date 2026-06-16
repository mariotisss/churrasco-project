package com.churrasco.cup.tournament;

import com.churrasco.cup.edition.Edition;
import com.churrasco.cup.match.Leg;
import com.churrasco.cup.match.Match;
import com.churrasco.cup.team.Team;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Genera el calendario de un round-robin doble (ida y vuelta) para N equipos:
 * cada par juega 2 veces -> N*(N-1) partidos en total (3 eq.->6, 4 eq.->12).
 *
 * Usa el "metodo del circulo" para repartir los emparejamientos en jornadas en las que
 * ningun equipo juega dos veces. La VUELTA repite los mismos emparejamientos invirtiendo
 * local/visitante.
 */
@Component
public class ScheduleGenerator {

    private static final int BYE = -1;

    public List<Match> generate(Edition edition, List<Team> teams) {
        int n = teams.size();
        if (n < 2) {
            throw new IllegalArgumentException("Se necesitan al menos 2 equipos para generar el calendario");
        }

        List<int[]> idaPairings = roundRobinPairings(n);

        List<Match> matches = new ArrayList<>(idaPairings.size() * 2);
        int order = 0;

        // IDA: a en casa, b fuera
        for (int[] pair : idaPairings) {
            matches.add(new Match(edition, teams.get(pair[0]), teams.get(pair[1]), Leg.IDA, order++, false));
        }
        // VUELTA: se invierte local/visitante
        for (int[] pair : idaPairings) {
            matches.add(new Match(edition, teams.get(pair[1]), teams.get(pair[0]), Leg.VUELTA, order++, false));
        }

        return matches;
    }

    /**
     * Emparejamientos de un round-robin simple (cada par una vez) ordenados por jornadas
     * mediante el metodo del circulo. Devuelve indices sobre la lista de equipos.
     */
    private List<int[]> roundRobinPairings(int n) {
        List<Integer> slots = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            slots.add(i);
        }
        if (n % 2 != 0) {
            slots.add(BYE); // ronda de descanso para el numero impar
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
            // Rotacion: el primer elemento queda fijo y el resto gira una posicion.
            Integer last = slots.remove(m - 1);
            slots.add(1, last);
        }
        return pairings;
    }
}
