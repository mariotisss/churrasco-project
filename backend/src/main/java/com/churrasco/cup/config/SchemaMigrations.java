package com.churrasco.cup.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Tiny idempotent schema migrations for columns added after the initial release.
 *
 * schema.sql only runs CREATE TABLE IF NOT EXISTS, so a column added to a table
 * that already exists in a populated database (e.g. the deployed SQLite volume)
 * is never applied by it. This runs once at startup, after schema.sql, and adds
 * any missing column with an ALTER TABLE. Safe to run on every boot.
 */
@Component
@Order(0)
public class SchemaMigrations implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    public SchemaMigrations(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        addColumnIfMissing("edition", "is_test", "INTEGER NOT NULL DEFAULT 0");
        addColumnIfMissing("edition", "round_trip", "INTEGER NOT NULL DEFAULT 1");
        addColumnIfMissing("game", "chosen_side", "TEXT");
        addColumnIfMissing("player", "photo_updated_at", "INTEGER");
        // team.name used to be a snapshot of the players' names taken at draw time, so it
        // went stale as soon as a player was renamed. The name is derived from the players
        // now; the column has to go or its NOT NULL would reject every new team.
        dropColumnIfPresent("team", "name");
    }

    private void addColumnIfMissing(String table, String column, String definition) {
        if (!hasColumn(table, column)) {
            jdbc.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
        }
    }

    /** Drops a column left over from an earlier model (SQLite supports it since 3.35). */
    private void dropColumnIfPresent(String table, String column) {
        if (hasColumn(table, column)) {
            jdbc.execute("ALTER TABLE " + table + " DROP COLUMN " + column);
        }
    }

    private boolean hasColumn(String table, String column) {
        List<Map<String, Object>> columns = jdbc.queryForList("PRAGMA table_info(" + table + ")");
        return columns.stream()
                .anyMatch(c -> column.equalsIgnoreCase(String.valueOf(c.get("name"))));
    }
}
