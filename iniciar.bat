@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias (so na primeira vez)...
  call npm install --omit=dev
)
if not exist config.json (
  copy config.exemplo.json config.json >nul
  echo Criei o config.json a partir do config.exemplo.json.
)
node server.js
pause
