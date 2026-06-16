package com.churrasco.cup.api;

import com.churrasco.cup.match.Match;
import com.churrasco.cup.match.dto.MatchDto;
import com.churrasco.cup.player.Player;
import com.churrasco.cup.player.dto.PlayerDto;
import com.churrasco.cup.team.Team;
import com.churrasco.cup.team.dto.TeamDto;
import com.churrasco.cup.team.dto.TeamRefDto;

/** Conversion entidad -> DTO. Sin estado. */
public final class DtoMapper {

    private DtoMapper() {
    }

    public static PlayerDto toPlayerDto(Player p) {
        if (p == null) {
            return null;
        }
        return new PlayerDto(p.getId(), p.getName(), p.isActive(), p.getCreatedAt());
    }

    public static TeamRefDto toTeamRefDto(Team t) {
        if (t == null) {
            return null;
        }
        return new TeamRefDto(t.getId(), t.getName());
    }

    public static TeamDto toTeamDto(Team t) {
        if (t == null) {
            return null;
        }
        return new TeamDto(t.getId(), t.getName(),
                toPlayerDto(t.getPlayer1()), toPlayerDto(t.getPlayer2()));
    }

    public static MatchDto toMatchDto(Match m) {
        if (m == null) {
            return null;
        }
        return new MatchDto(
                m.getId(),
                m.getLeg().name(),
                m.getOrderIndex(),
                toTeamRefDto(m.getHomeTeam()),
                toTeamRefDto(m.getAwayTeam()),
                m.getHomeScore(),
                m.getAwayScore(),
                m.getStatus().name(),
                m.isFinalissima(),
                m.getPlayedAt()
        );
    }
}
