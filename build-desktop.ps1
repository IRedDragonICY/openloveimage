#!/usr/bin/env pwsh

Write-Host "🚀 Building OpenLoveImage Desktop Application..." -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "📦 Step 1: Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { throw "Failed to install dependencies" }

    Write-Host ""
    Write-Host "🏗️  Step 2: Building Next.js application..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Failed to build Next.js application" }

    Write-Host ""
    Write-Host "🖥️  Step 3: Building Tauri desktop application..." -ForegroundColor Yellow
    npm run tauri:build
    if ($LASTEXITCODE -ne 0) { throw "Failed to build Tauri application" }

    Write-Host ""
    Write-Host "✅ Build completed successfully!" -ForegroundColor Green
    Write-Host "📁 The desktop application executable can be found in:" -ForegroundColor Green
    Write-Host "   src-tauri/target/release/" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 You can now run your desktop image converter!" -ForegroundColor Magenta
    
} catch {
    Write-Host ""
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host "Please check the error messages above and try again." -ForegroundColor Red
    exit 1
}

Read-Host "Press Enter to continue..." 