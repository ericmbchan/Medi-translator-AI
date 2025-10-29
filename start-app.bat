@echo off
echo Starting Medical Translator Application...

echo.
echo Starting Backend Server...
cd /d "C:\Users\ericm\Desktop\FALL2025 STARTUP\translator-AI\Medi-translator-AI"
start "Backend Server" cmd /k "node server/server.js"

echo.
echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo.
echo Starting Frontend Client...
cd /d "C:\Users\ericm\Desktop\FALL2025 STARTUP\translator-AI\Medi-translator-AI\client"
start "Frontend Client" cmd /k "npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:3003
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit...
pause >nul