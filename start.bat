@echo off
REM App ECP - arranque local en Windows.
REM   start.bat          -> usa Docker si esta disponible.
REM   start.bat native   -> modo nativo (Python + Node en la maquina).
cd /d "%~dp0"

if "%1"=="native" goto native

where docker >nul 2>&1
if %errorlevel%==0 (
  echo Levantando con Docker en http://localhost:8000 ...
  docker compose up --build
  goto end
)

:native
echo Modo nativo (sin Docker)
if not exist backend\.venv (
  python -m venv backend\.venv
)
call backend\.venv\Scripts\python -m pip install -q --upgrade pip
call backend\.venv\Scripts\pip install -q -r backend\requirements.txt

where npm >nul 2>&1
if %errorlevel%==0 (
  echo Compilando frontend ...
  pushd frontend
  call npm install --no-audit --no-fund
  call npm run build
  popd
)

echo Iniciando API + UI en http://localhost:8000 ...
cd backend
call .venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000

:end
