@echo off
REM Inicia o servidor do Linkia (sinalização + chat)
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
