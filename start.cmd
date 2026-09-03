@echo off
REM ============================================================
REM  Linkia - Inicializador
REM  Mata processos antigos presos nas portas e sobe instancias
REM  novas e limpas do servidor e do cliente (evita EADDRINUSE).
REM ============================================================

REM --- Libera as portas antes de subir (evita "address already in use") ---
call :killport 4000
call :killport 3001

cd /d "%~dp0server"
set PATH=C:\Program Files\nodejs;%PATH%
start "Linkia Server" cmd /k node src\index.js
cd /d "%~dp0client"
start "Linkia Client" cmd /k "set PATH=C:\Program Files\nodejs;%PATH% && node node_modules\vite\bin\vite.js --port 3001"

echo.
echo Linkia iniciado!
echo   - Frontend: http://localhost:3001
echo   - Backend : http://localhost:4000
echo.
exit /b

REM --- Mata o processo que estiver escutando na porta passada (%1) ---
:killport
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%1 ^| findstr LISTENING') do (
  taskkill /f /pid %%a >nul 2>&1
)
exit /b
