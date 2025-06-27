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

# Function to generate changelog from commits
function Generate-Changelog {
    param(
        [string]$FromTag,
        [string]$ToTag = "HEAD"
    )
    
    Write-Host "📝 Generating changelog..." -ForegroundColor Yellow
    
    # Get commit range
    $commitRange = if ($FromTag) { "$FromTag..$ToTag" } else { $ToTag }
    
    # Get commits with format: hash|subject|body
    $commits = git log $commitRange --pretty=format:"%h|%s|%b" --no-merges
    
    if (-not $commits) {
        return "No changes since last release."
    }
    
    # Initialize categories
    $features = @()
    $fixes = @()
    $improvements = @()
    $breaking = @()
    $other = @()
    
    # Process each commit
    foreach ($commit in $commits) {
        if (-not $commit) { continue }
        
        $parts = $commit -split '\|', 3
        $hash = $parts[0]
        $subject = $parts[1]
        $body = if ($parts.Length -gt 2) { $parts[2] } else { "" }
        
        # Categorize based on conventional commits and keywords
        if ($subject -match '^feat(\(.+\))?!?:' -or $subject -match '^add|^implement') {
            $features += "- $($subject -replace '^feat(\(.+\))?!?:\s*', '') ($hash)"
        }
        elseif ($subject -match '^fix(\(.+\))?:' -or $subject -match '^bug|^resolve|^correct') {
            $fixes += "- $($subject -replace '^fix(\(.+\))?:\s*', '') ($hash)"
        }
        elseif ($subject -match '^refactor|^improve|^enhance|^optimize|^update') {
            $improvements += "- $($subject -replace '^(refactor|improve|enhance|optimize|update)(\(.+\))?:?\s*', '') ($hash)"
        }
        elseif ($subject -match '!' -or $body -match 'BREAKING CHANGE') {
            $breaking += "- $subject ($hash)"
        }
        else {
            $other += "- $subject ($hash)"
        }
    }
    
    # Build changelog
    $changelog = @()
    
    if ($breaking.Count -gt 0) {
        $changelog += "### 🚨 Breaking Changes"
        $changelog += $breaking
        $changelog += ""
    }
    
    if ($features.Count -gt 0) {
        $changelog += "### ✨ New Features"
        $changelog += $features
        $changelog += ""
    }
    
    if ($fixes.Count -gt 0) {
        $changelog += "### 🐛 Bug Fixes"
        $changelog += $fixes
        $changelog += ""
    }
    
    if ($improvements.Count -gt 0) {
        $changelog += "### 🔧 Improvements"
        $changelog += $improvements
        $changelog += ""
    }
    
    if ($other.Count -gt 0) {
        $changelog += "### 📦 Other Changes"
        $changelog += $other
        $changelog += ""
    }
    
    return ($changelog -join "`n").Trim()
}

# Function to update CHANGELOG.md
function Update-ChangelogFile {
    param(
        [string]$Version,
        [string]$ChangelogContent
    )
    
    $changelogFile = "CHANGELOG.md"
    $date = Get-Date -Format "yyyy-MM-dd"
    
    # Create new entry
    $newEntry = @(
        "## [$Version] - $date",
        "",
        $ChangelogContent,
        ""
    ) -join "`n"
    
    if (Test-Path $changelogFile) {
        # Read existing changelog
        $existingContent = Get-Content $changelogFile -Raw
        
        # Find insertion point (after header, before first release)
        if ($existingContent -match '(?s)(# Changelog.*?\n\n)(.*)') {
            $header = $matches[1]
            $releases = $matches[2]
            $updatedContent = $header + $newEntry + "`n" + $releases
        } else {
            # Fallback: prepend to file
            $updatedContent = $newEntry + "`n" + $existingContent
        }
    } else {
        # Create new changelog
        $updatedContent = @(
            "# Changelog",
            "",
            "All notable changes to this project will be documented in this file.",
            "",
            "The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),",
            "and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).",
            "",
            $newEntry
        ) -join "`n"
    }
    
    # Write updated changelog
    $updatedContent | Set-Content $changelogFile -Encoding UTF8
    Write-Host "✅ Updated $changelogFile" -ForegroundColor Green
}

Write-Host "🚀 OpenLoveImage Release Process" -ForegroundColor Cyan
Write-Host ""

try {
    # Get current version
    $currentVersion = node -p "require('./package.json').version"
    Write-Host "📋 Current version: $currentVersion" -ForegroundColor Yellow
    
    if (-not $BuildOnly) {
        # Get the latest tag for changelog generation
        $latestTag = git describe --tags --abbrev=0 2>$null
        if (-not $latestTag) {
            $latestTag = $null
            Write-Host "📝 No previous tags found, generating changelog from all commits" -ForegroundColor Yellow
        } else {
            Write-Host "📝 Generating changelog since tag: $latestTag" -ForegroundColor Yellow
        }
        
        # Generate changelog
        $changelogContent = Generate-Changelog -FromTag $latestTag
        Write-Host "📄 Changelog preview:" -ForegroundColor Cyan
        Write-Host $changelogContent -ForegroundColor White
        Write-Host ""
        
        # Bump version
        Write-Host "📈 Bumping $VersionType version..." -ForegroundColor Yellow
        npm version $VersionType --no-git-tag-version
        if ($LASTEXITCODE -ne 0) { throw "Failed to bump version" }
        
        $newVersion = node -p "require('./package.json').version"
        Write-Host "✅ New version: $newVersion" -ForegroundColor Green
        
        # Update changelog file
        Update-ChangelogFile -Version $newVersion -ChangelogContent $changelogContent
        
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
        Write-Host "📋 Release Summary:" -ForegroundColor Cyan
        Write-Host "   Version: $newVersion" -ForegroundColor White
        Write-Host "   Changelog: CHANGELOG.md updated" -ForegroundColor White
        Write-Host ""
        Write-Host "🎯 Next steps:" -ForegroundColor Cyan
        Write-Host "   1. Test the built application" -ForegroundColor White
        Write-Host "   2. Review CHANGELOG.md" -ForegroundColor White
        Write-Host "   3. Commit changes: git add . && git commit -m 'chore(release): release v$newVersion'" -ForegroundColor White
        Write-Host "   4. Create tag: git tag v$newVersion" -ForegroundColor White
        Write-Host "   5. Push to trigger auto-release: git push origin main --tags" -ForegroundColor White
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
