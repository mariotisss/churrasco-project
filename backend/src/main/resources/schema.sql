-- Esquema de Churrasco's Cup (SQLite).
-- Se ejecuta al arrancar (spring.sql.init.mode=always). Idempotente: CREATE ... IF NOT EXISTS.
-- Nota: la tabla de partidos se llama "game" porque MATCH es palabra reservada en SQLite.

PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS player (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    active      INTEGER NOT NULL DEFAULT 1,
    -- epoch en milisegundos (ver InstantEpochMilliConverter)
    created_at  INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
);

CREATE TABLE IF NOT EXISTS edition (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    name              TEXT    NOT NULL,
    status            TEXT    NOT NULL DEFAULT 'DRAFT',
    sat_out_player_id INTEGER REFERENCES player(id),
    champion_team_id  INTEGER,
    created_at        INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
);

CREATE TABLE IF NOT EXISTS team (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    edition_id INTEGER NOT NULL REFERENCES edition(id) ON DELETE CASCADE,
    name       TEXT    NOT NULL,
    player1_id INTEGER NOT NULL REFERENCES player(id),
    player2_id INTEGER NOT NULL REFERENCES player(id)
);

CREATE TABLE IF NOT EXISTS game (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    edition_id     INTEGER NOT NULL REFERENCES edition(id) ON DELETE CASCADE,
    home_team_id   INTEGER NOT NULL REFERENCES team(id) ON DELETE CASCADE,
    away_team_id   INTEGER NOT NULL REFERENCES team(id) ON DELETE CASCADE,
    leg            TEXT    NOT NULL,           -- IDA | VUELTA | FINAL
    order_index    INTEGER NOT NULL,
    home_score     INTEGER,
    away_score     INTEGER,
    status         TEXT    NOT NULL DEFAULT 'PENDING',  -- PENDING | PLAYED
    is_finalissima INTEGER NOT NULL DEFAULT 0,
    played_at      INTEGER  -- epoch en milisegundos
);

CREATE INDEX IF NOT EXISTS idx_team_edition ON team(edition_id);
CREATE INDEX IF NOT EXISTS idx_game_edition ON game(edition_id);
