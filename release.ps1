#!/usr/bin/env pwsh

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("patch", "minor", "major")]
    [string]$VersionType = "patch",
    
    [Parameter(Mandatory=$false)]
    [switch]$BuildOnly = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Help = $false
)

if ($Help) {
    Write-Host "🚀 OpenLoveImage Release Helper" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  ./release.ps1 [patch|minor|major] [-BuildOnly] [-Help]"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  patch    - Increment patch version (0.1.0 -> 0.1.1)"
    Write-Host "  minor    - Increment minor version (0.1.0 -> 0.2.0)"
    Write-Host "  major    - Increment major version (0.1.0 -> 1.0.0)"
    Write-Host "  -BuildOnly - Only build, don't bump version or create tag"
    Write-Host "  -Help    - Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  ./release.ps1 patch          # Bump patch version and build"
    Write-Host "  ./release.ps1 minor          # Bump minor version and build"
    Write-Host "  ./release.ps1 -BuildOnly     # Just build current version"
    Write-Host ""
    exit 0
}

Write-Host "🚀 OpenLoveImage Release Process" -ForegroundColor Cyan
Write-Host ""

try {
    # Get current version
    $currentVersion = node -p "require('./package.json').version"
    Write-Host "📋 Current version: $currentVersion" -ForegroundColor Yellow
    
    if (-not $BuildOnly) {
        # Bump version
        Write-Host "📈 Bumping $VersionType version..." -ForegroundColor Yellow
        npm version $VersionType --no-git-tag-version
        if ($LASTEXITCODE -ne 0) { throw "Failed to bump version" }
        
        $newVersion = node -p "require('./package.json').version"
        Write-Host "✅ New version: $newVersion" -ForegroundColor Green
        
        # Update Tauri config version
        Write-Host "🔧 Updating Tauri config..." -ForegroundColor Yellow
        $tauriConfig = Get-Content "src-tauri/tauri.conf.json" | ConvertFrom-Json
        $tauriConfig.version = $newVersion
        $tauriConfig | ConvertTo-Json -Depth 10 | Set-Content "src-tauri/tauri.conf.json"
    } else {
        $newVersion = $currentVersion
        Write-Host "🏗️ Building current version: $newVersion" -ForegroundColor Yellow
    }

    # Install dependencies
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { throw "Failed to install dependencies" }

    # Build Next.js
    Write-Host "🏗️ Building Next.js application..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Failed to build Next.js application" }

    # Build Tauri
    Write-Host "🖥️ Building Tauri desktop application..." -ForegroundColor Yellow
    npm run tauri:build
    if ($LASTEXITCODE -ne 0) { throw "Failed to build Tauri application" }

    Write-Host ""
    Write-Host "✅ Release build completed successfully!" -ForegroundColor Green
    Write-Host "📁 Files created:" -ForegroundColor Green
    Write-Host "   • Executable: src-tauri/target/release/app.exe" -ForegroundColor White
    Write-Host "   • MSI Installer: src-tauri/target/release/bundle/msi/OpenLoveImage_${newVersion}_x64_en-US.msi" -ForegroundColor White
    Write-Host "   • NSIS Setup: src-tauri/target/release/bundle/nsis/OpenLoveImage_${newVersion}_x64-setup.exe" -ForegroundColor White
    
    if (-not $BuildOnly) {
        Write-Host ""
        Write-Host "🎯 Next steps:" -ForegroundColor Cyan
        Write-Host "   1. Test the built application" -ForegroundColor White
        Write-Host "   2. Commit changes: git add . && git commit -m 'Release v$newVersion'" -ForegroundColor White
        Write-Host "   3. Create tag: git tag v$newVersion" -ForegroundColor White
        Write-Host "   4. Push to trigger auto-release: git push origin main --tags" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "🎯 Build completed for version $newVersion" -ForegroundColor Cyan
        Write-Host "   Test the executable: ./src-tauri/target/release/app.exe" -ForegroundColor White
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host "Please check the error messages above and try again." -ForegroundColor Red
    exit 1
}

Read-Host "Press Enter to continue..."
