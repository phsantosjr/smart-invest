# Smart Invest API

## Setup

```bash
cd backend
cp .env.example .env
docker compose up -d

python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

alembic upgrade head
python scripts/seed_dev_user.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Credenciais após o seed: `admin@local.test` / `changeme123`.

Frontend: em `frontend/`, use `frontend/.env` (`VITE_API_BASE_URL`); variáveis de banco/JWT ficam só aqui em `backend/.env`.

## Testes

```bash
pytest
```

Ver também `docker/README.md`.