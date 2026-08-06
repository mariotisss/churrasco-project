# 🏆 Churrasco's Cup

Web overview for the office's monthly table-football (futbolín) tournament. Each edition (month)
players sign up, get drawn into **2-player teams** and play a league, which is then decided by the
**Finalissima**. Two formats:

- **Ida y vuelta** (double round-robin): the **top 2** go straight to the Finalissima.
- **Partido único** (single round-robin, needs 4 teams): the top 4 play a **double-chance
  bracket** — *cruce alto* (1st vs 2nd) and *cruce bajo* (4th at the 3rd); whoever loses the alto
  drops into a semifinal against whoever wins the bajo, and that survivor meets the alto's winner
  in the Finalissima. The top 2 can lose once and still win it; the 3rd and 4th are out the moment
  they lose. The better-classified team is always at home, and the home team picks the side.

- **Player** management (add/edit; soft delete to keep history).
- **Team draw** per edition (if the number of players is odd, one sits out at random; pairs from
  the previous edition are never repeated).
- Automatic **schedule** generation and **result** recording.
- **Interactive bracket** (standings + matches + Finalissima) that updates as you score.

## Stack

| Layer    | Technology                                                        |
|----------|-------------------------------------------------------------------|
| Backend  | Java 21 · Spring Boot 3 (Web, Data JPA, Validation)               |
| DB       | SQLite (file-based, no server) · schema in `schema.sql`           |
| Frontend | React + TypeScript + Vite · TanStack Query · Tailwind CSS         |
| Deploy   | Docker Compose (backend + nginx) with a volume for the DB         |

## Layout

```
churrasco-project/
├── backend/        # Spring Boot REST API + tournament logic
├── frontend/       # React SPA (Vite)
└── docker-compose.yml
```

## Run with Docker (nothing else to install)

```bash
docker compose up --build
# or, with the classic binary:
docker-compose up --build
```

App available at **http://localhost:8080**. The DB persists in the `churrasco-data` volume.

## Local development

Requirements: **JDK 21** and **Node 20+**.

**Backend** (port 8080):

```bash
cd backend
./mvnw spring-boot:run
```

**Frontend** (port 5173, proxies `/api` to the backend):

```bash
cd frontend
npm install
npm run dev
```

Backend tests:

```bash
cd backend
./mvnw test
```

## REST API (summary)

| Method | Path                          | Description                                  |
|--------|-------------------------------|----------------------------------------------|
| GET    | `/api/players`                | List players (`?activeOnly=true`)            |
| POST   | `/api/players`                | Create a player                              |
| PATCH  | `/api/players/{id}`           | Edit name / activate                         |
| DELETE | `/api/players/{id}`           | Soft delete (mark inactive)                  |
| GET    | `/api/editions`               | List editions                                |
| POST   | `/api/editions`               | Create an edition                            |
| GET    | `/api/editions/{id}`          | Full detail (the bracket)                    |
| DELETE | `/api/editions/{id}`          | Delete an edition, its teams and its matches |
| POST   | `/api/editions/{id}/draw`     | Draw teams (`{ participantIds? }`)           |
| GET    | `/api/editions/{id}/standings`| Computed standings                           |
| PUT    | `/api/matches/{id}/result`    | Record a result (`{ homeScore, awayScore }`) |

When the last league match is recorded the playoff phase is created automatically: the **Finalissima**
between the 1st and 2nd (ida y vuelta), or the two cruces that open the bracket, with each following
round appearing as soon as the one feeding it is played (partido único). Recording the Finalissima sets
the **champion** and moves the edition to `FINISHED`.

A re-draw only re-shuffles the players of the edition's original draw, and it is blocked once any
result has been recorded.

## Design notes

- **Standings are computed, not persisted**: editing any result always recalculates correctly.
- **SQLite + dates**: `Instant` values are stored as epoch-millis (`InstantEpochMilliConverter`)
  to avoid the sqlite-jdbc driver's `TIMESTAMP` parsing.
- **Schema** lives in `backend/src/main/resources/schema.sql` (run at startup, idempotent).
  Flyway/Liquibase can be introduced later to evolve the schema.

## Possible extensions (the model already supports them)

- Historical champion roll and per-player stats across editions.
- Advanced tie-breaking rules (head-to-head).
- Live updates via SSE/WebSocket instead of the current periodic refresh.
