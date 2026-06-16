package com.churrasco.cup.tournament;

import com.churrasco.cup.edition.dto.StandingRowDto;
import com.churrasco.cup.match.Match;
import com.churrasco.cup.match.MatchStatus;
import com.churrasco.cup.team.Team;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Calcula la clasificacion de la liga a partir de los partidos jugados.
 * No se persiste: siempre se deriva, asi editar un resultado recalcula correctamente.
 *
 * Puntos: victoria 3, empate 1, derrota 0.
 * Desempate: puntos -> diferencia de goles -> goles a favor -> nombre del equipo.
 */
@Component
public class StandingsCalculator {

    private static final Comparator<Acc> ORDER = Comparator
            .comparingInt((Acc a) -> a.points).reversed()
            .thenComparing(Comparator.comparingInt((Acc a) -> a.goalsFor - a.goalsAgainst).reversed())
            .thenComparing(Comparator.comparingInt((Acc a) -> a.goalsFor).reversed())
            .thenComparing(a -> a.team.getName(), String.CASE_INSENSITIVE_ORDER);

    /**
     * @param teams        todos los equipos de la edicion (aparecen aunque no hayan jugado)
     * @param leagueMatches partidos de liga (sin la Finalissima); solo se cuentan los PLAYED
     */
    public List<StandingRowDto> compute(List<Team> teams, List<Match> leagueMatches) {
        Map<Long, Acc> table = new LinkedHashMap<>();
        for (Team t : teams) {
            table.put(t.getId(), new Acc(t));
        }

        for (Match m : leagueMatches) {
            if (m.getStatus() != MatchStatus.PLAYED || m.isFinalissima()) {
                continue;
            }
            Acc home = table.get(m.getHomeTeam().getId());
            Acc away = table.get(m.getAwayTeam().getId());
            if (home == null || away == null) {
                continue; // partido de otra edicion; no deberia ocurrir
            }
            int hs = m.getHomeScore();
            int as = m.getAwayScore();
            home.apply(hs, as);
            away.apply(as, hs);
        }

        List<Acc> sorted = new ArrayList<>(table.values());
        sorted.sort(ORDER);

        List<StandingRowDto> rows = new ArrayList<>(sorted.size());
        int position = 1;
        for (Acc a : sorted) {
            rows.add(new StandingRowDto(
                    position++,
                    a.team.getId(),
                    a.team.getName(),
                    a.played,
                    a.won,
                    a.drawn,
                    a.lost,
                    a.goalsFor,
                    a.goalsAgainst,
                    a.goalsFor - a.goalsAgainst,
                    a.points
            ));
        }
        return rows;
    }

    /** Acumulador mutable interno por equipo. */
    private static final class Acc {
        private final Team team;
        private int played;
        private int won;
        private int drawn;
        private int lost;
        private int goalsFor;
        private int goalsAgainst;
        private int points;

        private Acc(Team team) {
            this.team = team;
        }

        private void apply(int scored, int conceded) {
            played++;
            goalsFor += scored;
            goalsAgainst += conceded;
            if (scored > conceded) {
                won++;
                points += 3;
            } else if (scored == conceded) {
                drawn++;
                points += 1;
            } else {
                lost++;
            }
        }
    }
}
