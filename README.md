# 🏆 Churrasco's Cup

Web overview for the office's monthly table-football (futbolín) tournament. Each edition (month)
players sign up, get drawn into **2-player teams**, play a **double round-robin** (home and away),
and the **top 2** in the standings dispute the **Finalissima** to decide who wins the edition.

- **Player** management (add/edit; soft delete to keep history).
- **Team draw** per edition (if the number of players is odd, one sits out at random).
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
| POST   | `/api/editions/{id}/draw`     | Draw teams (`{ participantIds? }`)           |
| GET    | `/api/editions/{id}/standings`| Computed standings                           |
| PUT    | `/api/matches/{id}/result`    | Record a result (`{ homeScore, awayScore }`) |

When the last league match is recorded, the **Finalissima** is created automatically between the
1st and 2nd teams. Recording the Finalissima sets the **champion** and moves the edition to `FINISHED`.

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
