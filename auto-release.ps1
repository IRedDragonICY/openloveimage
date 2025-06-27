#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Automated release process for OpenLoveImage
.DESCRIPTION
    This script automates the complete release process: build, commit, tag, and push.
    It handles all the manual steps from the release.ps1 script automatically.
.PARAMETER VersionType
    The type of version bump (patch, minor, major)
.PARAMETER SkipBuild
    Skip the build process (only do version bump and git operations)
.PARAMETER DryRun
    Preview what would be done without actually executing
.PARAMETER Force
    Skip confirmation prompts
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("patch", "minor", "major")]
    [string]$VersionType,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Help = $false
)

if ($Help) {
    Write-Host "🤖 OpenLoveImage Automated Release" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This script automates the complete release process."
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  ./auto-release.ps1 <patch|minor|major> [-SkipBuild] [-DryRun] [-Force]"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  patch      - Increment patch version (0.1.0 -> 0.1.1)"
    Write-Host "  minor      - Increment minor version (0.1.0 -> 0.2.0)"
    Write-Host "  major      - Increment major version (0.1.0 -> 1.0.0)"
    Write-Host "  -SkipBuild - Skip build process (version bump and git only)"
    Write-Host "  -DryRun    - Preview what would be done without executing"
    Write-Host "  -Force     - Skip confirmation prompts"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  ./auto-release.ps1 patch           # Full automated patch release"
    Write-Host "  ./auto-release.ps1 minor -DryRun   # Preview minor release"
    Write-Host "  ./auto-release.ps1 major -Force    # Force major release without prompts"
    Write-Host ""
    Write-Host "⚠️ This script will:"
    Write-Host "  1. Generate changelog from commits"
    Write-Host "  2. Bump version in package.json and Tauri config"
    Write-Host "  3. Build the application (unless -SkipBuild)"
    Write-Host "  4. Update CHANGELOG.md"
    Write-Host "  5. Create release notes file"
    Write-Host "  6. Commit all changes"
    Write-Host "  7. Create annotated git tag with changelog"
    Write-Host "  8. Push to origin with tags"
    Write-Host ""
    exit 0
}

function Write-DryRun {
    param([string]$Message)
    if ($DryRun) {
        Write-Host "[DRY RUN] $Message" -ForegroundColor Yellow
    }
}

function Invoke-Command {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-Host "🔄 $Description..." -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-DryRun $Command
        return $true
    } else {
        Invoke-Expression $Command
        return $LASTEXITCODE -eq 0
    }
}

function Confirm-Action {
    param([string]$Message)
    
    if ($Force -or $DryRun) {
        return $true
    }
    
    $response = Read-Host "$Message (y/N)"
    return $response.ToLower() -eq "y" -or $response.ToLower() -eq "yes"
}

Write-Host "🤖 OpenLoveImage Automated Release" -ForegroundColor Cyan
Write-Host ""

try {
    # Check if we're in a clean git state
    $gitStatus = git status --porcelain
    if ($gitStatus -and -not $DryRun) {
        Write-Host "⚠️ Warning: Working directory has uncommitted changes:" -ForegroundColor Yellow
        git status --short
        Write-Host ""
        
        if (-not (Confirm-Action "Continue anyway?")) {
            Write-Host "❌ Release cancelled. Please commit or stash your changes first." -ForegroundColor Red
            exit 1
        }
    }
    
    # Get current version
    $currentVersion = node -p "require('./package.json').version"
    Write-Host "📋 Current version: $currentVersion" -ForegroundColor White
    
    # Preview what the new version will be
    if ($DryRun) {
        Write-Host "📈 Would bump $VersionType version" -ForegroundColor Yellow
        Write-DryRun "npm version $VersionType --no-git-tag-version"
    } else {
        Write-Host "📈 Will bump $VersionType version" -ForegroundColor Yellow
    }
    
    # Show release plan
    Write-Host ""
    Write-Host "📋 Release Plan:" -ForegroundColor Cyan
    Write-Host "  • Type: $VersionType version bump" -ForegroundColor White
    Write-Host "  • Build: $(if ($SkipBuild) { 'SKIPPED' } else { 'INCLUDED' })" -ForegroundColor White
    Write-Host "  • Mode: $(if ($DryRun) { 'DRY RUN' } else { 'EXECUTE' })" -ForegroundColor White
    Write-Host ""
    
    if (-not (Confirm-Action "🚀 Proceed with automated release?")) {
        Write-Host "❌ Release cancelled." -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "🚀 Starting automated release process..." -ForegroundColor Green
    Write-Host ""
    
    # Step 1: Run release script
    $releaseArgs = @($VersionType)
    if ($SkipBuild) {
        $releaseArgs += "-BuildOnly"
    }
    
    $releaseCommand = "./release.ps1 " + ($releaseArgs -join " ")
    
    if (-not (Invoke-Command $releaseCommand "Running release script")) {
        throw "Release script failed"
    }
    
    if (-not $DryRun) {
        # Get the new version after bump
        $newVersion = node -p "require('./package.json').version"
        Write-Host "✅ New version: $newVersion" -ForegroundColor Green
        
        # Step 2: Git add all changes
        if (-not (Invoke-Command "git add ." "Adding all changes to git")) {
            throw "Failed to add changes to git"
        }
        
        # Step 3: Commit changes
        $commitMessage = "chore(release): release v$newVersion"
        if (-not (Invoke-Command "git commit -m '$commitMessage'" "Committing release changes")) {
            throw "Failed to commit changes"
        }
        
        # Step 4: Create annotated tag with release notes
        $releaseNotesFile = "RELEASE_NOTES_v$newVersion.md"
        if (Test-Path $releaseNotesFile) {
            if (-not (Invoke-Command "git tag -a v$newVersion -F $releaseNotesFile" "Creating annotated tag with changelog")) {
                throw "Failed to create git tag"
            }
        } else {
            if (-not (Invoke-Command "git tag v$newVersion" "Creating simple git tag")) {
                throw "Failed to create git tag"
            }
        }
        
        # Step 5: Push to origin
        if (-not (Invoke-Command "git push origin main" "Pushing changes to origin")) {
            throw "Failed to push changes"
        }
        
        # Step 6: Push tags
        if (-not (Invoke-Command "git push origin --tags" "Pushing tags to origin")) {
            throw "Failed to push tags"
        }
        
        Write-Host ""
        Write-Host "🎉 Automated release completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Release Summary:" -ForegroundColor Cyan
        Write-Host "  • Version: $newVersion" -ForegroundColor White
        Write-Host "  • Tag: v$newVersion" -ForegroundColor White
        Write-Host "  • Changelog: Updated and committed" -ForegroundColor White
        Write-Host "  • Release Notes: $releaseNotesFile" -ForegroundColor White
        Write-Host ""
        Write-Host "🔗 Next steps:" -ForegroundColor Cyan
        Write-Host "  • Check GitHub Actions for build status" -ForegroundColor White
        Write-Host "  • Monitor release creation at: https://github.com/ireddragonicy/openloveimage/releases" -ForegroundColor White
        Write-Host "  • Test the release builds when ready" -ForegroundColor White
        
        # Cleanup old release notes (keep only last 3)
        $oldReleaseNotes = Get-ChildItem "RELEASE_NOTES_v*.md" | Sort-Object Name -Descending | Select-Object -Skip 3
        if ($oldReleaseNotes) {
            Write-Host ""
            Write-Host "🧹 Cleaning up old release notes..." -ForegroundColor Yellow
            foreach ($file in $oldReleaseNotes) {
                Remove-Item $file.FullName
                Write-Host "  Removed: $($file.Name)" -ForegroundColor Gray
            }
        }
        
    } else {
        Write-Host ""
        Write-Host "✅ Dry run completed successfully!" -ForegroundColor Green
        Write-Host "Run without -DryRun to execute the actual release." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Automated release failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Manual recovery options:" -ForegroundColor Yellow
    Write-Host "  • Check git status: git status" -ForegroundColor White
    Write-Host "  • Reset if needed: git reset --soft HEAD~1" -ForegroundColor White
    Write-Host "  • Remove bad tag: git tag -d v<version>" -ForegroundColor White
    Write-Host "  • Try manual release: ./release.ps1 $VersionType" -ForegroundColor White
    exit 1
} 