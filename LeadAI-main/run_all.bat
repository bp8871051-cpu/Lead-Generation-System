@echo off
echo ===================================================
echo Starting LeadAI Full Stack Environment
echo ===================================================

echo Stopping any previous hung server processes...
taskkill /FI "IMAGENAME eq node.exe" /F >nul 2>&1

echo [1/2] Starting FastAPI Backend...
start cmd /k "cd /d %~dp0backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo [2/2] Starting Next.js Frontend...
start cmd /k "cd /d %~dp0frontend && npm run dev"


echo LeadAI is starting up! 
echo Backend will be available at http://127.0.0.1:8000
echo Frontend will be available at http://localhost:3002
echo.
echo Press any key to exit this launcher window...
pause > nul
