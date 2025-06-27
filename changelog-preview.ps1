#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Preview changelog generation for OpenLoveImage
.DESCRIPTION
    This script generates a preview of the changelog that would be created for the next release,
    based on commits since the last tag.
.PARAMETER FromTag
    Generate changelog from specific tag (optional)
.PARAMETER All
    Show changelog for all commits (ignore tags)
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$FromTag = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$All = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Help = $false
)

if ($Help) {
    Write-Host "📄 OpenLoveImage Changelog Preview" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  ./changelog-preview.ps1 [-FromTag <tag>] [-All] [-Help]"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  -FromTag <tag>  - Generate changelog from specific tag"
    Write-Host "  -All           - Show changelog for all commits (ignore tags)"
    Write-Host "  -Help          - Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  ./changelog-preview.ps1           # Preview next release changelog"
    Write-Host "  ./changelog-preview.ps1 -All      # Show all commits as changelog"
    Write-Host "  ./changelog-preview.ps1 -FromTag v0.1.0  # Show changes since v0.1.0"
    Write-Host ""
    exit 0
}

# Function to generate changelog from commits
function Generate-Changelog {
    param(
        [string]$FromTag,
        [string]$ToTag = "HEAD"
    )
    
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
    $commitCount = 0
    
    if ($breaking.Count -gt 0) {
        $changelog += "### 🚨 Breaking Changes"
        $changelog += $breaking
        $changelog += ""
        $commitCount += $breaking.Count
    }
    
    if ($features.Count -gt 0) {
        $changelog += "### ✨ New Features"
        $changelog += $features
        $changelog += ""
        $commitCount += $features.Count
    }
    
    if ($fixes.Count -gt 0) {
        $changelog += "### 🐛 Bug Fixes"
        $changelog += $fixes
        $changelog += ""
        $commitCount += $fixes.Count
    }
    
    if ($improvements.Count -gt 0) {
        $changelog += "### 🔧 Improvements"
        $changelog += $improvements
        $changelog += ""
        $commitCount += $improvements.Count
    }
    
    if ($other.Count -gt 0) {
        $changelog += "### 📦 Other Changes"
        $changelog += $other
        $changelog += ""
        $commitCount += $other.Count
    }
    
    return @{
        Content = ($changelog -join "`n").Trim()
        CommitCount = $commitCount
    }
}

Write-Host "📄 OpenLoveImage Changelog Preview" -ForegroundColor Cyan
Write-Host ""

try {
    # Determine tag range
    if ($All) {
        $fromTag = $null
        $rangeDescription = "all commits"
    } elseif ($FromTag) {
        $fromTag = $FromTag
        $rangeDescription = "commits since $FromTag"
    } else {
        # Get the latest tag
        $fromTag = git describe --tags --abbrev=0 2>$null
        if (-not $fromTag) {
            $fromTag = $null
            $rangeDescription = "all commits (no previous tags found)"
        } else {
            $rangeDescription = "commits since last tag ($fromTag)"
        }
    }
    
    Write-Host "🔍 Analyzing $rangeDescription..." -ForegroundColor Yellow
    Write-Host ""
    
    # Generate changelog
    $result = Generate-Changelog -FromTag $fromTag
    
    if ($result.CommitCount -eq 0) {
        Write-Host "📭 No commits found for changelog generation." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "This could mean:" -ForegroundColor Gray
        Write-Host "  • All commits are already included in the latest tag" -ForegroundColor Gray
        Write-Host "  • There are only merge commits (which are excluded)" -ForegroundColor Gray
        Write-Host "  • The specified tag range is empty" -ForegroundColor Gray
    } else {
        Write-Host "📊 Found $($result.CommitCount) commits to include in changelog" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Changelog Preview:" -ForegroundColor Cyan
        Write-Host "─" * 60 -ForegroundColor Gray
        Write-Host $result.Content -ForegroundColor White
        Write-Host "─" * 60 -ForegroundColor Gray
        Write-Host ""
        
        # Show current version for context
        $currentVersion = node -p "require('./package.json').version" 2>$null
        if ($currentVersion) {
            Write-Host "📦 Current version: $currentVersion" -ForegroundColor Yellow
            Write-Host "🎯 This changelog would be for the next release" -ForegroundColor Cyan
        }
    }
    
    Write-Host ""
    Write-Host "💡 Tips:" -ForegroundColor Cyan
    Write-Host "  • Use './release.ps1' to create a release with this changelog" -ForegroundColor White
    Write-Host "  • Use './changelog-preview.ps1 -All' to see all commits" -ForegroundColor White
    Write-Host "  • Use './changelog-preview.ps1 -FromTag v1.0.0' for specific ranges" -ForegroundColor White
    
} catch {
    Write-Host ""
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host "Please ensure you're in a git repository and try again." -ForegroundColor Red
    exit 1
} 