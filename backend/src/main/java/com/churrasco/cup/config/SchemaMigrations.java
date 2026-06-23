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
    }

    private void addColumnIfMissing(String table, String column, String definition) {
        List<Map<String, Object>> columns = jdbc.queryForList("PRAGMA table_info(" + table + ")");
        boolean present = columns.stream()
                .anyMatch(c -> column.equalsIgnoreCase(String.valueOf(c.get("name"))));
        if (!present) {
            jdbc.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
        }
    }
}
