@echo off
title Launching Anomaly Detector
color 0A

echo ====================================================
echo              Starting Anomaly Detector Full Stack
echo ====================================================

:: Go to root of project (where this .bat file is located)
cd /d "%~dp0"

:: --- Step 1: Ensure Ollama service is running ---
echo.
echo Checking Ollama service...
netstat -ano | find "11434" >nul 2>&1

if %errorlevel%==0 (
    echo Ollama service is already running.
) else (
    echo Ollama is not running. Starting Ollama service...
    start "Ollama Service" cmd /k "ollama serve"
    echo Waiting for Ollama service to initialize...
    timeout /t 5 >nul
)

:: --- Step 2: Ensure LLaMA3 model is active ---
echo.
echo Checking if LLaMA3 model is running...
tasklist | find /i "ollama.exe" >nul 2>&1

if %errorlevel%==0 (
    echo LLaMA3 model is already active.
) else (
    echo Starting LLaMA3 model in a new terminal...
    start "LLaMA3 Model" cmd /k "ollama run llama3"
    echo Waiting for LLaMA3 model to initialize...
    timeout /t 5 >nul
)

:: --- Step 3: Start Backend Server ---
echo.
echo Starting Node.js Backend...
start "Anomaly Detector Backend" cmd /k "cd backend && node server.js"

:: --- Step 4: Start Frontend (React + Vite) ---
echo.
echo Starting Frontend (Vite React)...
start "Anomaly Detector Frontend" cmd /k "cd frontend && npm run dev"

:: --- Done ---
echo.
echo ====================================================
echo ✅ Backend running at:  http://localhost:5000
echo ✅ Frontend running at: http://localhost:5173
echo ====================================================
echo.
pause
