@echo off
echo Starting Medical Translator Backend Server...
echo.
cd /d "C:\Users\ericm\Desktop\FALL2025 STARTUP\translator-AI\Medi-translator-AI"

echo Checking Node.js version...
node --version

echo.
echo Checking npm version...
npm --version

echo.
echo Checking environment variables...
echo OPENAI_API_KEY: %OPENAI_API_KEY%
echo GOOGLE_APPLICATION_CREDENTIALS: %GOOGLE_APPLICATION_CREDENTIALS%

echo.
echo Starting server...
node server/server.js

pause