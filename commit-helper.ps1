#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Interactive commit helper for OpenLoveImage
.DESCRIPTION
    This script helps create conventional commits that will generate better changelogs.
    It provides an interactive interface to create properly formatted commit messages.
.PARAMETER Type
    The type of commit (feat, fix, docs, style, refactor, test, chore)
.PARAMETER Scope
    The scope of the commit (optional)
.PARAMETER Message
    The commit message
.PARAMETER BreakingChange
    Whether this is a breaking change
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("feat", "fix", "docs", "style", "refactor", "perf", "test", "chore")]
    [string]$Type = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Scope = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Message = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$BreakingChange = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Help = $false
)

if ($Help) {
    Write-Host "💬 OpenLoveImage Commit Helper" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This script helps create conventional commits for better changelog generation."
    Write-Host ""
    Write-Host "Commit Types:" -ForegroundColor Yellow
    Write-Host "  feat     - New feature" -ForegroundColor Green
    Write-Host "  fix      - Bug fix" -ForegroundColor Red
    Write-Host "  docs     - Documentation changes" -ForegroundColor Blue
    Write-Host "  style    - Code style changes (formatting, etc.)" -ForegroundColor Magenta
    Write-Host "  refactor - Code refactoring" -ForegroundColor Cyan
    Write-Host "  perf     - Performance improvements" -ForegroundColor Yellow
    Write-Host "  test     - Test additions or modifications" -ForegroundColor Gray
    Write-Host "  chore    - Build process or auxiliary tool changes" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  ./commit-helper.ps1                    # Interactive mode"
    Write-Host "  ./commit-helper.ps1 -Type feat -Message 'add new feature'"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  feat: add image compression feature"
    Write-Host "  fix(ui): resolve button alignment issue"
    Write-Host "  feat!: change API response format (breaking change)"
    Write-Host "  docs: update installation instructions"
    Write-Host ""
    exit 0
}

function Show-CommitTypes {
    Write-Host ""
    Write-Host "📝 Commit Types:" -ForegroundColor Cyan
    Write-Host "  1. feat     - ✨ New feature (appears in changelog)" -ForegroundColor Green
    Write-Host "  2. fix      - 🐛 Bug fix (appears in changelog)" -ForegroundColor Red
    Write-Host "  3. docs     - 📚 Documentation changes" -ForegroundColor Blue
    Write-Host "  4. style    - 💄 Code style changes (formatting, etc.)" -ForegroundColor Magenta
    Write-Host "  5. refactor - 🔧 Code refactoring (appears as improvement)" -ForegroundColor Cyan
    Write-Host "  6. perf     - ⚡ Performance improvements" -ForegroundColor Yellow
    Write-Host "  7. test     - 🧪 Test additions or modifications" -ForegroundColor Gray
    Write-Host "  8. chore    - 🛠️ Build process or auxiliary tool changes" -ForegroundColor DarkGray
    Write-Host ""
}

function Get-CommitType {
    Show-CommitTypes
    do {
        $choice = Read-Host "Select commit type (1-8)"
        switch ($choice) {
            "1" { return "feat" }
            "2" { return "fix" }
            "3" { return "docs" }
            "4" { return "style" }
            "5" { return "refactor" }
            "6" { return "perf" }
            "7" { return "test" }
            "8" { return "chore" }
            default { Write-Host "❌ Invalid choice. Please select 1-8." -ForegroundColor Red }
        }
    } while ($true)
}

function Get-CommitScope {
    Write-Host ""
    Write-Host "🎯 Common scopes for this project:" -ForegroundColor Cyan
    Write-Host "  • ui        - User interface changes"
    Write-Host "  • api       - API changes"
    Write-Host "  • build     - Build system changes"
    Write-Host "  • config    - Configuration changes"
    Write-Host "  • deps      - Dependency changes"
    Write-Host "  • converter - Image conversion logic"
    Write-Host "  • preview   - Preview functionality"
    Write-Host ""
    $scope = Read-Host "Enter scope (optional, press Enter to skip)"
    return $scope.Trim()
}

function Get-CommitMessage {
    Write-Host ""
    Write-Host "💬 Write a clear, concise commit message:" -ForegroundColor Cyan
    Write-Host "  • Use imperative mood ('add' not 'added')"
    Write-Host "  • Start with lowercase"
    Write-Host "  • No period at the end"
    Write-Host "  • Keep it under 50 characters for the title"
    Write-Host ""
    do {
        $message = Read-Host "Commit message"
        if ($message.Trim().Length -eq 0) {
            Write-Host "❌ Commit message cannot be empty." -ForegroundColor Red
        } else {
            return $message.Trim()
        }
    } while ($true)
}

function Get-BreakingChange {
    Write-Host ""
    $response = Read-Host "Is this a breaking change? (y/N)"
    return $response.ToLower() -eq "y" -or $response.ToLower() -eq "yes"
}

function Build-CommitMessage {
    param(
        [string]$Type,
        [string]$Scope,
        [string]$Message,
        [bool]$IsBreaking
    )
    
    $commitMsg = $Type
    
    if ($Scope) {
        $commitMsg += "($Scope)"
    }
    
    if ($IsBreaking) {
        $commitMsg += "!"
    }
    
    $commitMsg += ": $Message"
    
    return $commitMsg
}

function Preview-ChangelogImpact {
    param(
        [string]$Type,
        [bool]$IsBreaking
    )
    
    Write-Host ""
    Write-Host "📊 Changelog Impact:" -ForegroundColor Cyan
    
    if ($IsBreaking) {
        Write-Host "  Will appear in: 🚨 Breaking Changes" -ForegroundColor Red
    } elseif ($Type -eq "feat") {
        Write-Host "  Will appear in: ✨ New Features" -ForegroundColor Green
    } elseif ($Type -eq "fix") {
        Write-Host "  Will appear in: 🐛 Bug Fixes" -ForegroundColor Red
    } elseif ($Type -eq "refactor" -or $Type -eq "perf") {
        Write-Host "  Will appear in: 🔧 Improvements" -ForegroundColor Cyan
    } else {
        Write-Host "  Will appear in: 📦 Other Changes" -ForegroundColor Gray
    }
}

Write-Host "💬 OpenLoveImage Commit Helper" -ForegroundColor Cyan
Write-Host "Create conventional commits for better changelog generation" -ForegroundColor Gray
Write-Host ""

try {
    # Interactive mode if no parameters provided
    if (-not $Type) {
        $Type = Get-CommitType
    }
    
    if (-not $Scope) {
        $Scope = Get-CommitScope
    }
    
    if (-not $Message) {
        $Message = Get-CommitMessage
    }
    
    if (-not $BreakingChange) {
        $BreakingChange = Get-BreakingChange
    }
    
    # Build the commit message
    $commitMessage = Build-CommitMessage -Type $Type -Scope $Scope -Message $Message -IsBreaking $BreakingChange
    
    # Show preview
    Write-Host ""
    Write-Host "📋 Commit Preview:" -ForegroundColor Cyan
    Write-Host "─" * 50 -ForegroundColor Gray
    Write-Host $commitMessage -ForegroundColor White
    Write-Host "─" * 50 -ForegroundColor Gray
    
    # Show changelog impact
    Preview-ChangelogImpact -Type $Type -IsBreaking $BreakingChange
    
    # Confirm and commit
    Write-Host ""
    $confirm = Read-Host "Create this commit? (Y/n)"
    
    if ($confirm.ToLower() -ne "n" -and $confirm.ToLower() -ne "no") {
        git add .
        git commit -m $commitMessage
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Commit created successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "💡 Tips:" -ForegroundColor Cyan
            Write-Host "  • Use './changelog-preview.ps1' to see how this will appear in the changelog"
            Write-Host "  • Use './release.ps1' when ready to create a release"
        } else {
            Write-Host ""
            Write-Host "❌ Failed to create commit. Please check git status." -ForegroundColor Red
        }
    } else {
        Write-Host ""
        Write-Host "❌ Commit cancelled." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
} 