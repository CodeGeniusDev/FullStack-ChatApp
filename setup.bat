@echo off
REM Chat App - Quick Setup Script for Windows
REM This script installs all dependencies and prepares the app for running

echo.
echo ================================
echo Chat App - Quick Setup
echo ================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo [OK] Node.js found
node --version
echo.

REM Install backend dependencies
echo Installing backend dependencies...
cd backend

if not exist ".env" (
    echo [WARNING] .env file not found in backend directory
    echo Please create a .env file with required environment variables
    echo See OPTIMIZATION_GUIDE.md for details
)

call npm install

if %errorlevel% neq 0 (
    echo [ERROR] Backend installation failed
    pause
    exit /b 1
)

echo [OK] Backend dependencies installed
cd ..
echo.

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend

if not exist ".env" (
    echo [WARNING] .env file not found in frontend directory
    echo Please create a .env file with required environment variables
    echo See OPTIMIZATION_GUIDE.md for details
)

call npm install

if %errorlevel% neq 0 (
    echo [ERROR] Frontend installation failed
    pause
    exit /b 1
)

echo [OK] Frontend dependencies installed
cd ..
echo.

REM Setup complete
echo ================================
echo Setup Complete!
echo ================================
echo.
echo Next steps:
echo 1. Configure .env files in both backend and frontend directories
echo 2. Start the backend: cd backend ^&^& npm run dev
echo 3. Start the frontend: cd frontend ^&^& npm run dev
echo.
echo For detailed instructions, see OPTIMIZATION_GUIDE.md
echo.
echo Happy coding!
echo.
pause
