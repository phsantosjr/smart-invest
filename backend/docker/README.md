# Docker — desenvolvimento local

Execute os comandos a partir de **`backend/`** (mesma pasta do `compose.yaml` e do `.env`).

## Subir infraestrutura

```bash
cd backend
cp .env.example .env
docker compose up -d
```

| Serviço | Porta (host) | Uso |
|---------|--------------|-----|
| `db` | 25030 (host) → 5432 (container) | PostgreSQL 18 |
| `redis` | 6379 | Cache |

## Profile `tools`

```bash
docker compose --profile tools up -d
```

| Serviço | Porta | Uso |
|---------|-------|-----|
| `adminer` | 8080 | UI Postgres |
| `redisinsight` | 5540 | UI Redis |

```bash
docker compose down      # mantém volumes
docker compose down -v   # apaga dados locais (use após trocar major do Postgres)
```

Se o container `db` ficar em **Restarting** após atualizar para Postgres 18, recrie o volume:

```bash
docker compose down -v
docker compose up -d
```