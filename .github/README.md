# 🚀 GitHub Actions Workflows

This directory contains automated workflows for OpenLoveImage project.

## 📋 Available Workflows

### 1. 🚀 Auto Release & Multi-Platform Build (`release.yml`)

**Trigger**: Push to `main` branch or manual dispatch

**Features**:
- ✅ Automatic version bumping (patch increment)
- ✅ Multi-platform builds (Windows, macOS, Linux)
- ✅ Automatic changelog generation
- ✅ GitHub release creation with assets
- ✅ Modern release notes with emojis

**Platforms Built**:
- **Windows**: x64 MSI installer & NSIS executable
- **macOS**: Universal DMG (Intel + Apple Silicon)
- **Linux**: AppImage portable & DEB package

### 2. 🧪 Continuous Integration (`ci.yml`)

**Trigger**: Push/PR to `main` or `develop` branches

**Features**:
- ✅ Linting with ESLint
- ✅ Multi-platform test builds
- ✅ Security audits (npm + cargo)
- ✅ Dependency review for PRs
- ✅ Bundle size analysis
- ✅ Performance monitoring

### 3. 🌙 Nightly Build (`nightly.yml`)

**Trigger**: Daily at 2 AM UTC (9 AM WIB) or manual dispatch

**Features**:
- ✅ Automated nightly builds
- ✅ Change detection (only builds if new commits)
- ✅ Prerelease tagged builds
- ✅ Automatic cleanup (keeps 5 most recent)
- ✅ Flexible platform selection

## 🔧 Workflow Configuration

### Required Secrets

- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

### Manual Triggers

All workflows support manual triggering:

1. Go to **Actions** tab in GitHub
2. Select the workflow you want to run
3. Click **Run workflow**
4. Choose options (if available) and confirm

### Version Management

The release workflow automatically handles versioning:

1. **Auto-increment**: Automatically bumps patch version on every commit
2. **Manual version**: Update `package.json` version to trigger specific release
3. **Sync**: All version files are automatically synchronized

## 📦 Release Assets

Each release includes platform-specific installers:

### Windows
- `OpenLoveImage_v{version}_x64_en-US.msi` - Windows Installer
- `OpenLoveImage_v{version}_x64-setup.exe` - NSIS Setup

### macOS
- `OpenLoveImage_v{version}_universal.dmg` - Universal DMG

### Linux
- `openloveimage_v{version}_amd64.AppImage` - Portable AppImage
- `openloveimage_v{version}_amd64.deb` - Debian Package

## 🔄 Development Workflow

### Local Development Scripts

```bash
# Development
npm run dev                 # Start dev server with turbopack
npm run dev:clean          # Clean and start dev server

# Building
npm run build              # Build frontend only
npm run tauri:build        # Build complete Tauri app
npm run tauri:build:debug  # Build debug version

# Platform-specific builds
npm run release:windows    # Build for Windows
npm run release:macos      # Build for macOS  
npm run release:linux      # Build for Linux
npm run release:all        # Build for all platforms

# Version management
npm run version:patch      # Bump patch version
npm run version:minor      # Bump minor version
npm run version:major      # Bump major version

# Maintenance
npm run clean             # Clean build artifacts
npm run clean:all         # Clean everything including node_modules
npm run check             # Run linting and build verification
```

### Git Workflow

1. **Feature Development**:
   ```bash
   git checkout -b feature/your-feature
   # Make changes
   git commit -m "feat: add new feature"
   git push origin feature/your-feature
   # Create PR to main
   ```

2. **Release Process**:
   ```bash
   # Option 1: Automatic (recommended)
   git push origin main  # Triggers auto-release
   
   # Option 2: Manual version
   npm run version:minor  # or patch/major
   git commit -am "chore: bump version to x.y.z"
   git push origin main
   ```

## 🐛 Troubleshooting

### Common Issues

1. **Build fails on specific platform**:
   - Check platform-specific dependencies
   - Review error logs in Actions tab
   - Test locally with platform-specific scripts

2. **Version not updating**:
   - Ensure `package.json` version has changed
   - Check if commit message includes `[skip ci]`
   - Verify git tags are properly created

3. **Release assets missing**:
   - Check build job success status
   - Verify artifact upload/download steps
   - Review file paths in workflow

### Debug Commands

```bash
# Check current version
node -p "require('./package.json').version"

# Sync versions manually
npm run version:sync

# Generate changelog manually
npm run changelog

# Test build locally
npm run tauri:build:debug
```

## 📚 References

- [Tauri Actions Documentation](https://github.com/tauri-apps/tauri-action)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)

---

*This workflow setup is designed to be zero-maintenance and developer-friendly. Each push to main automatically creates a new release with proper versioning and changelog.* 