@echo off
REM WhatsApp-like Chat App - Quick Setup Script (Windows)
REM This script will install all dependencies and help you get started

echo ==========================================
echo    Welcome to Chat App Setup!
echo ==========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js version:
node -v
echo [OK] npm version:
npm -v
echo.

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install backend dependencies!
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed!
echo.

REM Install frontend dependencies
echo Installing frontend dependencies...
cd ..\frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install frontend dependencies!
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed!
echo.

REM Check for .env file
cd ..\backend
if not exist .env (
    echo WARNING: No .env file found in backend\
    echo Creating .env template...
    (
        echo MONGODB_URI=your_mongodb_connection_string_here
        echo PORT=5002
        echo JWT_SECRET=your_jwt_secret_key_here
        echo NODE_ENV=development
        echo CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
        echo CLOUDINARY_API_KEY=your_cloudinary_api_key
        echo CLOUDINARY_API_SECRET=your_cloudinary_api_secret
    ) > .env
    echo [OK] .env template created!
    echo WARNING: Please edit backend\.env with your actual credentials
    echo.
) else (
    echo [OK] .env file already exists
    echo.
)

cd ..

echo ==========================================
echo    Installation Complete!
echo ==========================================
echo.
echo Next Steps:
echo.
echo 1. Edit backend\.env with your credentials:
echo    - MongoDB connection string
echo    - JWT secret key
echo    - Cloudinary credentials
echo.
echo 2. Start the backend:
echo    cd backend
echo    npm start
echo.
echo 3. In a new terminal, start the frontend:
echo    cd frontend
echo    npm run dev
echo.
echo 4. Open http://localhost:5173 in your browser
echo.
echo Documentation:
echo    - README.md           - Full documentation
echo    - SETUP_GUIDE.md      - Testing guide
echo    - WHATSAPP_FEATURES.md - Feature list
echo    - COMPARISON.md       - Before/After comparison
echo.
echo Happy chatting!
echo.
pause
