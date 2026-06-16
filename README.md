# 🏆 Churrasco's Cup

Overview web del torneo mensual de futbolín de la oficina. Cada edición (mes) se presentan
jugadores que se sortean en **equipos de 2**, juegan un **round-robin doble** (ida y vuelta) y los
**2 primeros** de la clasificación disputan la **Finalissima** para decidir quién gana la edición.

- Gestión de **jugadores** (alta/edición; baja lógica para no perder historial).
- **Sorteo** de equipos por edición (si el nº de jugadores es impar, uno se queda fuera al azar).
- Generación automática del **calendario** y registro de **resultados**.
- **Cuadro interactivo** (clasificación + partidos + Finalissima) que se actualiza al anotar.

## Stack

| Capa     | Tecnología                                                        |
|----------|-------------------------------------------------------------------|
| Backend  | Java 21 · Spring Boot 3 (Web, Data JPA, Validation)               |
| BD       | SQLite (fichero, sin servidor) · esquema en `schema.sql`          |
| Frontend | React + TypeScript + Vite · TanStack Query · Tailwind CSS         |
| Deploy   | Docker Compose (backend + nginx) con volumen para la BD           |

## Estructura

```
churrasco-project/
├── backend/        # API REST Spring Boot + lógica de torneo
├── frontend/       # SPA React (Vite)
└── docker-compose.yml
```

## Arranque con Docker (sin instalar nada más)

```bash
docker compose up --build
# o, con el binario clásico:
docker-compose up --build
```

App disponible en **http://localhost:8080**. La BD persiste en el volumen `churrasco-data`.

## Desarrollo en local

Requisitos: **JDK 21** y **Node 20+**.

**Backend** (puerto 8080):

```bash
cd backend
./mvnw spring-boot:run
```

**Frontend** (puerto 5173, con proxy de `/api` al backend):

```bash
cd frontend
npm install
npm run dev
```

Tests del backend:

```bash
cd backend
./mvnw test
```

## API REST (resumen)

| Método | Ruta                          | Descripción                                  |
|--------|-------------------------------|----------------------------------------------|
| GET    | `/api/players`                | Lista jugadores (`?activeOnly=true`)         |
| POST   | `/api/players`                | Alta de jugador                              |
| PATCH  | `/api/players/{id}`           | Editar nombre / activar                      |
| DELETE | `/api/players/{id}`           | Baja lógica (inactivo)                       |
| GET    | `/api/editions`               | Lista de ediciones                           |
| POST   | `/api/editions`               | Crear edición                                |
| GET    | `/api/editions/{id}`          | Detalle completo (cuadro)                    |
| POST   | `/api/editions/{id}/draw`     | Sortear equipos (`{ participantIds? }`)      |
| GET    | `/api/editions/{id}/standings`| Clasificación calculada                      |
| PUT    | `/api/matches/{id}/result`    | Anotar resultado (`{ homeScore, awayScore }`)|

Al anotar el último partido de liga, la **Finalissima** se crea automáticamente entre el 1º y el 2º.
Al anotar la Finalissima, se fija el **campeón** y la edición pasa a `FINISHED`.

## Notas de diseño

- **Clasificación calculada, no persistida**: editar cualquier resultado siempre recalcula bien.
- **SQLite + fechas**: los `Instant` se guardan como epoch-millis (`InstantEpochMilliConverter`)
  para evitar el parseo de `TIMESTAMP` del driver sqlite-jdbc.
- **Esquema** en `backend/src/main/resources/schema.sql` (ejecutado al arrancar, idempotente).
  Para evolucionar el esquema más adelante se puede introducir Flyway/Liquibase.

## Próximas extensiones (el modelo ya lo soporta)

- Palmarés histórico de campeones y estadísticas por jugador entre ediciones.
- Reglas de desempate avanzadas (head-to-head).
- Live updates con SSE/WebSocket en lugar del refresco periódico actual.
