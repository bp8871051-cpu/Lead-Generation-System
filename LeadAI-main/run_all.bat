@echo off
echo ===================================================
echo Starting LeadAI Production Full Stack Environment
echo Frontend: React.js + Vite (Port 5173 / 3000)
echo Backend: PHP 8.2+ Laravel 11 REST API (Port 8000)
echo Database: MySQL 8+ (leadai)
echo ===================================================

echo [1/2] Starting Laravel 11 REST API Backend...
start cmd /k "cd /d %~dp0backend && php artisan serve --port 8000"

echo [2/2] Starting React.js + Vite Frontend...
start cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo LeadAI Environment Started!
echo Backend REST API: http://127.0.0.1:8000/api
echo Frontend Application: http://localhost:5173
echo.
echo Press any key to close this launcher...
pause > nul
