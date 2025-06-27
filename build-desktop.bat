@echo off
echo Building OpenLoveImage Desktop Application...
echo.

echo Step 1: Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 2: Building Next.js application...
call npm run build
if %errorlevel% neq 0 (
    echo Error: Failed to build Next.js application
    pause
    exit /b 1
)

echo.
echo Step 3: Building Tauri desktop application...
call npm run tauri:build
if %errorlevel% neq 0 (
    echo Error: Failed to build Tauri application
    pause
    exit /b 1
)

echo.
echo ✅ Build completed successfully!
echo The desktop application executable can be found in:
echo src-tauri\target\release\
echo.
pause 