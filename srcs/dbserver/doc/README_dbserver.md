# DBServer Container

## Executive Summary

The `dbserver` container provides the persistent relational data layer for the entire Transcendence platform. Built on **PostgreSQL**, it is the single source of truth for all application state: player profiles, match history, statistics, friendships, chat, and organisational data.

The container is deliberately isolated — it exposes port `5432` only for direct development access and communicates with the rest of the stack exclusively through Docker-managed networks. On first boot, PostgreSQL auto-executes a numbered sequence of SQL initialisation scripts that build the schema, load reference data, and register stored procedures, leaving the database in a fully operational state before any dependent service is allowed to connect.

---

### System Architecture Diagram

The following diagram shows how `dbserver` sits within the broader Transcendence stack and which containers are permitted to communicate with it.

```mermaid
graph TD
    subgraph "transcendence_net (bridge)"
        FE[frontend\n:5173]
        BE[backend\n:3000]
        AD[adminer\n:8080]
        GR[grafana\n:3500]
        PR[prometheus\n:9090]
        TOTP[totp\n:8070]
    end

    subgraph "db_net (internal bridge · 192.168.3.0/28)"
        DB[(dbserver\nPostgreSQL :5432)]
    end

    BE -->|SQL queries via Drizzle ORM| DB
    AD -->|Direct DB inspection| DB
    BE --- TOTP

    style DB fill:#dde8ff,stroke:#3355aa,stroke-width:2px
    style BE fill:#dfd,stroke:#333,stroke-width:1px
```

The `db_net` network is declared `internal: true`, which means **no container on that network can reach the public internet**. Only services explicitly attached to `db_net` can open connections to `dbserver`.

---

### Initialisation Sequence Diagram

When the container starts for the first time (empty volume), PostgreSQL executes every file placed in `/docker-entrypoint-initdb.d/` in **lexicographic order**. The project maps `./scripts_init` into that directory.

```mermaid
sequenceDiagram
    participant Docker as Docker Engine
    participant PG as PostgreSQL Process
    participant Vol as db_data Volume

    Docker->>PG: Start container (empty volume detected)
    PG->>PG: 00_schema.sql — CREATE TABLE, extensions
    PG->>PG: 01_data.sql  — COPY reference CSVs, INSERT seed rows
    PG->>PG: 02_data_syntetic.sql — INSERT synthetic player/match data
    PG->>PG: 10_functions.sql — CREATE FUNCTION / CREATE TYPE
    PG->>Vol: Persist initialised data directory
    PG-->>Docker: Healthcheck passes → dependant services start
```

> ⚠️ The init scripts only run **once**, when the volume is empty. Restarting the container with an existing volume skips them entirely.

---

## Container Configuration

### `docker-compose-dbserver.yml`

```yaml
services:
  dbserver:
    image: postgres:${DB_POSTGRES_VERSION}   # e.g. postgres:18
    restart: always
    container_name: dbserver
    ports:
      - "5432:5432"        # Exposed for direct dev access (psql, Adminer, Drizzle Studio)
    env_file:
      - ../.env
    environment:
      - PGPASSWORD=${POSTGRES_PASSWORD}      # Used internally by the healthcheck
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d transcendence && psql -U postgres -d transcendence -c \"SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';\" | grep -q '[1-9]'"]
      interval: 5s
      timeout: 5s
      retries: 10
    volumes:
      - db_data:/var/lib/postgresql/${DB_POSTGRES_VERSION}/docker
      - ./scripts_init:/docker-entrypoint-initdb.d/
    networks:
      transcendence_net:
        aliases:
          - dbserver_alias
    logging:
      driver: "json-file"
      options:
        max-size: "30k"
        max-file: "3"
```

### Key Configuration Decisions

| Setting | Value | Rationale |
|---------|-------|-----------|
| `restart: always` | Always | Ensures the DB recovers automatically after host reboots or crashes |
| `healthcheck` | Two-step check | First verifies the process is accepting connections (`pg_isready`), then confirms at least one public table exists — guaranteeing init scripts have finished |
| `interval / retries` | 5 s / 10 attempts | Gives init scripts up to 50 s to complete before dependent containers are marked unhealthy |
| `volumes` (bind mount) | `./scripts_init → /docker-entrypoint-initdb.d/` | PostgreSQL executes all `.sql` files here on first boot, in alphabetical order |
| `logging` | json-file, 30 KB × 3 | Prevents log accumulation from filling the disk in long-running development environments |
| `aliases: dbserver_alias` | Network alias | Services can resolve the container by either `dbserver` or `dbserver_alias` within `transcendence_net` |

---

## Volume & Persistence

```yaml
# Declared in docker-compose.yml (root level)
volumes:
  db_data:
    driver: local
    driver_opts:
      type: none
      device: "${TRANSCENDENCE_HOME}/data/dbserver"   # Host path
      o: bind
```

The `db_data` volume is a **bind mount** to a host directory defined by `$TRANSCENDENCE_HOME`. This means:

- Data survives `docker compose down` and restarts.
- The host path must exist before starting the stack (`mkdir -p $TRANSCENDENCE_HOME/data/dbserver`).
- To reset the database completely, stop the stack, delete the host directory contents, and restart.

---

## Network Topology

Two networks are defined in `docker-compose.yml`:

```mermaid
graph LR
    subgraph "transcendence_net · bridge"
        BE[backend] --- DB[(dbserver)]
        AD[adminer] --- DB
    end
    subgraph "db_net · internal · 192.168.3.0/28"
        DB2[(dbserver)]
    end

    Internet((Internet)) -. blocked .-> DB2
```

| Network | Driver | Internal | Purpose |
|---------|--------|----------|---------|
| `transcendence_net` | bridge | No | General service-to-service communication |
| `db_net` | bridge | **Yes** | Isolated DB channel — no external routing |

> The current `docker-compose-dbserver.yml` attaches `dbserver` to `transcendence_net`. Migrating it exclusively to `db_net` would provide the strongest isolation, limiting DB access to only services explicitly listed in that network.

---

## Environment Variables

All variables are loaded from `.env` via `env_file`. Reference `.env.example`:

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `DB_POSTGRES_VERSION` | `18` | PostgreSQL image tag |
| `POSTGRES_DB` | `transcendence` | Database name created on first boot |
| `POSTGRES_USER` | `postgres` | Superuser account |
| `POSTGRES_PASSWORD` | `example` | Superuser password (also used by healthcheck via `PGPASSWORD`) |
| `DB_HOST` | `dbserver` | Hostname used by backend/Drizzle to reach the container |
| `DB_PORT` | `5432` | Standard PostgreSQL port |
| `DATABASE_URL` | `postgres://postgres:example@dbserver:5432/transcendence` | Full connection string consumed by Drizzle ORM |
| `TRANSCENDENCE_HOME` | `/home/user/transcendence` | Host base path for bind-mount volumes |

> 🔐 Never commit real credentials to version control. Use `.env.example` as a template and keep `.env` in `.gitignore`.

---

## Initialisation Scripts

### `00_schema.sql` — Schema Definition

Creates the `citext` extension and all tables in dependency order (reference tables first, then entity tables, then junction tables).

```mermaid
erDiagram
    COUNTRY ||--o{ PLAYER : "p_country"
    P_LANGUAGE ||--o{ PLAYER : "p_lang"
    P_ROLE ||--o{ PLAYER : "p_role"
    STATUS ||--o{ PLAYER : "p_status"
    PLAYER ||--o{ MATCH : "m_winner_fk"
    MATCH_MODE ||--o{ MATCH : "m_mode_fk"
    MATCH ||--o{ COMPETITOR : "mc_match_fk"
    PLAYER ||--o{ COMPETITOR : "mc_player_fk"
    MATCH ||--o{ MATCHMETRIC : "mm_match_fk"
    METRIC ||--o{ MATCHMETRIC : "mm_code_fk"
    METRIC_CATEGORY ||--o{ METRIC : "metric_cat_fk"
    COMPETITOR ||--o{ COMPETITORMETRIC : "fk_mcm_match_player"
    METRIC ||--o{ COMPETITORMETRIC : "mcm_metric_fk"
    PLAYER ||--o{ PLAYER_FRIEND : "f_1 / f_2"
    FRIEND_STATUS ||--o{ PLAYER_FRIEND : "f_status_fk"
    PLAYER ||--o{ PLAYER_ORGANIZATION : "po_p_fk"
    ORGANIZATION ||--o{ PLAYER_ORGANIZATION : "po_org_fk"
    PLAYER ||--o{ direct_message : "sender / receiver"
    PLAYER ||--o{ channel : "owner_id"
    channel ||--o{ channel_member : "channel_id"
    PLAYER ||--o{ channel_member : "user_id"
```

Notable schema decisions:

| Feature | Implementation |
|---------|---------------|
| **Case-insensitive email** | `p_mail CITEXT` — the `citext` extension makes `UNIQUE` and comparisons case-insensitive without application-level normalisation |
| **Encrypted 2FA secret** | `p_totp_secret BYTEA` — stores the TOTP secret as binary ciphertext (encrypted by the TOTP container before storage) |
| **Nullable password** | `p_pass TEXT NULL` — OAuth users have no local password; this column is intentionally nullable |
| **OAuth uniqueness** | `CONSTRAINT unique_oauth_user UNIQUE(p_oauth_provider, p_oauth_id)` — PostgreSQL's NULL semantics mean multiple rows with `(NULL, NULL)` are permitted, so local-password users don't conflict |
| **i18n via JSONB** | Roles, statuses, metrics, and friend-statuses store their names as `{"en": "...", "es": "...", "fr": "..."}` JSONB, eliminating a separate translations table |
| **Auto-identity PKs** | `GENERATED ALWAYS AS IDENTITY` used throughout — avoids sequence management overhead |

### `01_data.sql` — Reference & Seed Data

Loads static reference data required before the application can function:

| Action | Target | Source |
|--------|--------|--------|
| `COPY` | `COUNTRY` | `countries.csv` (ISO 3166 data) |
| `COPY` | `P_LANGUAGE` | `languages.csv` (ISO 639 data) |
| `INSERT` | `MATCH_MODE` | 4 modes: `1v1_local`, `1v1_remote`, `1v1_ia`, `Tournement` |
| `INSERT` | `STATUS` | 5 statuses in 5 languages (en, es, fr, pt, ca) |
| `INSERT` | `P_ROLE` | 6 roles: Moderator, Administrator, User, Guest, Organisation Admin, Banned |
| `INSERT` | `ORGANIZATION` | 5 placeholder organisations |
| `INSERT` | `METRIC_CATEGORY` | 5 categories in 5 languages |
| `INSERT` | `METRIC` | 23 metrics (IDs 1–23) covering competitor, match, organisation, tournament, and system stats |
| `INSERT` | `FRIEND_STATUS` | 4 states: Pending, Accepted, Blocked, Rejected |

> The `METRIC` inserts use `OVERRIDING SYSTEM VALUE` to force specific PKs, ensuring that stored functions and application code that reference metric IDs by number (e.g., metric 1 = Points Scored) remain stable.

### `02_data_syntetic.sql` — Synthetic Data

Populates the database with synthetic players, matches, competitor records, and metrics to allow development and testing without real user data. This script has no effect on production deployments where the volume is pre-populated from a backup.

### `10_functions.sql` — Stored Functions

Registers all PostgreSQL server-side functions. Functions run inside a single database transaction and benefit from the query planner, making them preferable to equivalent multi-query sequences from the application layer.

| Function | Signature | Returns | Description |
|----------|-----------|---------|-------------|
| `get_player_friends` | `(target_p_pk INTEGER)` | `TABLE(friend_id, friend_nick, friend_lang, friendship_since)` | Returns all active friends of a player. Uses a window function (`ROW_NUMBER`) to select only the most recent event per pair, then filters to `STATUS_ACCEPTED = 2` |
| `insert_full_match_result` | `(mode, date, duration_ms, winner, p1, score_p1, p2, score_p2, total_hits)` | `INTEGER` (new match PK) | Atomically inserts a complete match: `MATCH` record, two `COMPETITOR` rows, per-player `COMPETITORMETRIC` scores, and a `MATCHMETRIC` for total hits |
| `get_victories_count` | `(p_pk INTEGER)` | `INTEGER` | Counts matches where the player is the recorded winner |
| `get_matches_played` | `(p_player_id INTEGER)` | `INTEGER` | Counts distinct matches in `COMPETITORMETRIC` for the given player |
| `get_player_record` | `(p_player_id INTEGER)` | `player_record` (custom type) | Returns `wins`, `losses`, `draws`, and `total_matches` in a single call using a CTE self-join on `COMPETITORMETRIC` |
| `anonymize_player_by_id` | `(player_id INTEGER)` | `void` | GDPR right-to-erasure implementation: overwrites all PII with deterministic placeholders (`Legacy_<unix_ts>`, `deleted_<pk>@legacy.local`) and deletes friendship records |

#### Custom Type

```sql
CREATE TYPE player_record AS (
    wins          INTEGER,
    losses        INTEGER,
    draws         INTEGER,
    total_matches INTEGER
);
```

Used as the return type of `get_player_record` to avoid multiple round-trips.

---

## Healthcheck Detail

```bash
pg_isready -U postgres -d transcendence \
  && psql -U postgres -d transcendence \
       -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" \
     | grep -q '[1-9]'
```

The healthcheck is a **two-phase gate**:

1. `pg_isready` — confirms the postmaster process is accepting TCP connections.
2. `psql … COUNT(*)` — confirms at least one table in the `public` schema exists, meaning `00_schema.sql` has completed successfully.

Only when both phases pass does Docker mark the container `healthy`, allowing dependent services (backend, Adminer) to start via `depends_on: condition: service_healthy`.

---

## Logging

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "30k"
    max-file: "3"
```

Log rotation keeps at most **3 files of 30 KB each** (≈ 90 KB total). This is intentionally conservative for a development environment. For production or Prometheus log-scraping, switch to the `local` driver or configure a log aggregator.

---

## Usage Examples

```bash
# Start only the database (useful during schema development)
docker compose up dbserver -d

# Connect interactively with psql
docker exec -it dbserver psql -U postgres -d transcendence

# Run a stored function
psql -U postgres -d transcendence -c "SELECT * FROM get_player_record(1);"

# Force a full reset (destroys all data)
docker compose down
rm -rf $TRANSCENDENCE_HOME/data/dbserver/*
docker compose up dbserver -d

# Tail logs
docker logs -f dbserver
```

---

## References

- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [PostgreSQL CITEXT Extension](https://www.postgresql.org/docs/current/citext.html)
- [Docker Healthcheck Reference](https://docs.docker.com/compose/compose-file/05-services/#healthcheck)
- [ISO 3166 Country Codes](https://github.com/lukes/ISO-3166-Countries-with-Regional-Codes)
- [ISO 639 Language Codes](https://github.com/datasets/language-codes/tree/main)
