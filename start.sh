#!/usr/bin/env bash
# App ECP — arranque local.
#   ./start.sh           -> usa Docker si está disponible; si no, modo nativo.
#   ./start.sh native    -> fuerza modo nativo (Python + Node en la máquina).
set -e
cd "$(dirname "$0")"
MODE="${1:-auto}"

run_docker() {
  echo "▶ Levantando con Docker (http://localhost:8000) ..."
  docker compose up --build
}

run_native() {
  echo "▶ Modo nativo (sin Docker)"
  # Backend
  if [ ! -d backend/.venv ]; then
    echo "  · creando venv backend ..."
    python3 -m venv backend/.venv
  fi
  backend/.venv/bin/pip install -q --upgrade pip
  backend/.venv/bin/pip install -q -r backend/requirements.txt

  # Frontend (build estático servido por el backend)
  if command -v npm >/dev/null 2>&1; then
    echo "  · compilando frontend ..."
    (cd frontend && npm install --no-audit --no-fund && npm run build)
  else
    echo "  · npm no encontrado: se sirve solo la API (sin UI compilada)."
  fi

  echo "▶ Iniciando API + UI en http://localhost:8000 ..."
  cd backend
  exec .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
}

if [ "$MODE" = "native" ]; then
  run_native
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  run_docker
else
  echo "Docker no disponible; usando modo nativo."
  run_native
fi
