# 🛠️ Helper Scripts

This directory contains utility scripts to help with development and workflow management.

## 📋 Available Scripts

### 🔄 Version Management (`sync-version.js`)

Synchronizes version numbers across all project files:
- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

```bash
npm run version:sync
# or
node scripts/sync-version.js
```

### 📝 Changelog Generation (`generate-changelog.js`)

Automatically generates changelog from git commit history:

```bash
npm run changelog
# or
node scripts/generate-changelog.js
```

**Features:**
- Categorizes commits by type (features, fixes, improvements, etc.)
- Generates release notes with technical details
- Updates existing `CHANGELOG.md`
- Creates version-specific release notes file

### 🚀 Workflow Helper (`workflow-helper.js`)

Helps manage GitHub Actions workflows:

```bash
node scripts/workflow-helper.js status    # Show workflow status
node scripts/workflow-helper.js help      # Show help
```

## 🔧 Usage in Package.json

These scripts are integrated into the main package.json:

```json
{
  "scripts": {
    "version:patch": "npm version patch --no-git-tag-version && npm run version:sync",
    "version:minor": "npm version minor --no-git-tag-version && npm run version:sync", 
    "version:major": "npm version major --no-git-tag-version && npm run version:sync",
    "version:sync": "node scripts/sync-version.js",
    "changelog": "node scripts/generate-changelog.js"
  }
}
```

## 🔄 Typical Workflow

### 1. Version Bump & Release

```bash
# Bump version and sync all files
npm run version:patch  # or minor/major

# Generate changelog
npm run changelog

# Commit and push (triggers auto-release)
git add -A
git commit -m "chore: prepare release v1.2.3"
git push origin main
```

### 2. Manual Changelog Update

```bash
# Generate changelog from recent commits
npm run changelog

# Review the generated CHANGELOG.md
# Edit if needed, then commit
git add CHANGELOG.md
git commit -m "docs: update changelog"
```

### 3. Check Workflow Status

```bash
# See current project status
node scripts/workflow-helper.js status
```

## 🐛 Troubleshooting

### Version Sync Issues

If versions get out of sync:

```bash
# Force sync all version files
npm run version:sync
```

### Changelog Issues

If changelog generation fails:

1. Ensure you're in a git repository
2. Check if there are recent commits
3. Verify git tags exist (for comparison)

### Script Permissions

On Unix systems, make scripts executable:

```bash
chmod +x scripts/*.js
```

## 📚 Technical Details

### Dependencies

These scripts use only Node.js built-ins:
- `fs` - File system operations
- `child_process` - Git command execution
- `path` - Path manipulations

### Git Integration

Scripts rely on git commands:
- `git describe --tags` - Get last tag
- `git log` - Get commit history
- `git status` - Check working tree status

### Error Handling

All scripts include proper error handling and user-friendly messages. 