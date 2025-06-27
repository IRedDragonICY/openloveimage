# OpenLoveImage 🎨

**Free Online Image Converter** - Convert your images between different formats easily and securely in your browser.

[![Next.js](https://img.shields.io/badge/Next.js-15.3.4-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Material-UI](https://img.shields.io/badge/Material--UI-7.1.2-blue?logo=mui)](https://mui.com/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-orange?logo=tauri)](https://tauri.app/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 🖥️ Desktop Application

OpenLoveImage is now available as a **native Windows desktop application** built with [Tauri](https://tauri.app/)! 

### Why Desktop?
- **🚀 Better Performance**: Native performance without browser limitations
- **📁 Direct File Access**: Drag files directly from Windows Explorer
- **🔒 Enhanced Privacy**: No internet connection required
- **💾 System Integration**: Better file association and system tray support
- **⚡ Faster Processing**: Optimized for desktop hardware

### Quick Start (Desktop)
```bash
# Run in development mode
npm run tauri:dev

# Build for production (Windows)
npm run tauri:build

# Build for specific platforms
npm run release:windows  # Windows x64
npm run release:linux    # Linux x64
npm run release:macos    # macOS Universal

# Or use the build scripts
./build-desktop.ps1  # PowerShell
./build-desktop.bat  # Batch file
```

## ✨ Features

### 🚀 **Fast & Efficient**
- Process multiple images in batch with optimized conversion algorithms
- Real-time conversion progress tracking
- Instant preview and download

### 🔒 **Privacy First**
- All conversions happen locally in your browser
- Your images never leave your device
- No server uploads or data collection

### 🎛️ **Advanced Options**
- **Quality Control**: Adjust compression quality (10-100%)
- **Resize Options**: Set custom width/height with aspect ratio preservation
- **Compression Levels**: 9 levels of compression optimization
- **Metadata Removal**: Strip EXIF data for privacy

### 📱 **Format Support**
- **Input Formats**: HEIC, HEIF, JPEG, JPG, PNG, WebP, GIF, BMP, TIFF, SVG
- **Output Formats**: JPEG, PNG, WebP
- **Special Support**: HEIC to JPG conversion using advanced algorithms

### 💾 **Batch Processing**
- Drag and drop multiple files
- Batch conversion with progress tracking
- Download individual files or ZIP archive
- File size comparison and compression stats

### 🎨 **Modern UI**
- Material Design 3.0 components
- Dark mode by default
- Responsive design for all devices
- Smooth animations and transitions

## 🛠️ Technology Stack

- **Framework**: [Next.js 15.3.4](https://nextjs.org/) with App Router
- **Language**: [TypeScript 5.0](https://www.typescriptlang.org/)
- **UI Library**: [Material-UI 7.1.2](https://mui.com/)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **Image Processing**: [heic-to](https://www.npmjs.com/package/heic-to) library
- **File Handling**: [react-dropzone](https://react-dropzone.js.org/)
- **Archive Creation**: [JSZip](https://stuk.github.io/jszip/)
- **File Download**: [file-saver](https://github.com/eligrey/FileSaver.js/)

## 🚀 Getting Started

### Prerequisites

**For Web Application:**
- Node.js 18.0 or later
- npm or yarn package manager

**For Desktop Application (Additional):**
- [Rust](https://rustup.rs/) (latest stable version)
- Windows 10/11 (for Windows builds)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ireddragonicy/openloveimage.git
   cd openloveimage
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm run start
```

## 📖 Usage Guide

### Basic Conversion

1. **Upload Images**: Drag and drop files or click "Choose Files"
2. **Select Format**: Choose output format (JPEG, PNG, WebP)
3. **Adjust Settings**: Configure quality, compression, and resize options
4. **Convert**: Click "Convert All" to process your images
5. **Download**: Get individual files or download all as ZIP

### Advanced Features

#### Quality Control
- **Low (25%)**: Smallest file size, lower quality
- **Medium (50%)**: Balanced size and quality
- **High (75%)**: Better quality, larger size
- **Best (100%)**: Maximum quality, largest size

#### Resize Options
- Set maximum width and/or height in pixels
- Maintain aspect ratio to prevent distortion
- Leave empty to keep original dimensions

#### Compression Levels
- **Fast (1-3)**: Quick processing, larger files
- **Balanced (4-6)**: Good balance of speed and size
- **Best (7-9)**: Maximum compression, slower processing

### Desktop Application Usage

#### Development Mode
```bash
npm run tauri:dev
```
This starts both the Next.js development server and the Tauri desktop application.

#### Building for Production
```bash
# Method 1: Using npm scripts
npm run tauri:build

# Method 2: Using PowerShell script (recommended)
./build-desktop.ps1

# Method 3: Using batch file
./build-desktop.bat
```

#### Desktop-Specific Features
- **Native File Dialogs**: Use Windows file picker for better UX
- **Drag & Drop from Explorer**: Drag files directly from Windows Explorer
- **System Notifications**: Native Windows notifications for completion
- **Auto-Updater**: Automatic updates when new versions are available
- **No Browser Required**: Runs as a standalone application

## 🚀 Release Management

OpenLoveImage uses professional release management with automated changelog generation and semantic versioning.

### 📋 Changelog Generation
Our release process automatically generates changelogs from commit messages:

- **🚨 Breaking Changes**: Major API changes that require user attention
- **✨ New Features**: New functionality added to the application
- **🐛 Bug Fixes**: Issues resolved and bugs fixed  
- **🔧 Improvements**: Performance enhancements and code refactoring
- **📦 Other Changes**: Documentation, build, and maintenance updates

### 🛠️ Release Scripts

#### Create a Release

**Manual Release Process:**
```bash
# Bump patch version (0.1.0 -> 0.1.1) and build
./release.ps1 patch

# Bump minor version (0.1.0 -> 0.2.0) and build  
./release.ps1 minor

# Bump major version (0.1.0 -> 1.0.0) and build
./release.ps1 major

# Build without version bump
./release.ps1 -BuildOnly
```

**Automated Release Process (Recommended):**
```bash
# Full automated release with build, commit, tag, and push
./auto-release.ps1 patch

# Preview what would happen (dry run)
./auto-release.ps1 minor -DryRun

# Force release without confirmation prompts
./auto-release.ps1 major -Force

# Skip build process (version bump and git operations only)
./auto-release.ps1 patch -SkipBuild
```

#### Preview Changelog
```bash
# Preview changelog for next release
./changelog-preview.ps1

# Show all commits as changelog
./changelog-preview.ps1 -All

# Show changes since specific tag
./changelog-preview.ps1 -FromTag v0.1.0
```

#### Commit Helper
```bash
# Interactive commit helper for conventional commits
./commit-helper.ps1

# Quick commit with parameters
./commit-helper.ps1 -Type feat -Message "add new feature"
```

### 📝 Conventional Commits
For better changelog generation, use conventional commit format:

```bash
feat: add new image format support
fix(ui): resolve button alignment issue  
feat!: change API response format (breaking change)
docs: update installation instructions
refactor(converter): optimize image processing
```

**Commit Types:**
- `feat`: ✨ New features (appears in changelog)
- `fix`: 🐛 Bug fixes (appears in changelog) 
- `refactor`: 🔧 Code improvements (appears in changelog)
- `docs`: 📚 Documentation changes
- `style`: 💄 Code formatting
- `test`: 🧪 Testing changes
- `chore`: 🛠️ Build and maintenance

### 🔄 Auto-Release Process
1. **Changelog Generation**: Automatically categorizes commits since last release
2. **Version Bump**: Updates package.json and Tauri config
3. **Build**: Compiles for all platforms (Windows, Linux, macOS) 
4. **Documentation**: Updates CHANGELOG.md with formatted entries
5. **Release Notes**: Creates professional release notes file with download links
6. **Git Operations**: Commits changes, creates annotated tag with changelog
7. **Release**: Pushes to GitHub with changelog in tag message for auto-release

### 📝 Release Notes & Tag Messages
Each release automatically generates:
- **CHANGELOG.md**: Updated with categorized changes
- **RELEASE_NOTES_v{version}.md**: Professional release notes with download links
- **Annotated Git Tag**: Contains full changelog as tag message
- **GitHub Release**: Auto-created from tag with changelog as description

### 📦 Builds for Multiple Platforms
- **Windows x64**: MSI installer, NSIS setup, and portable ZIP
- **Linux x64**: AppImage, DEB package, and portable ZIP
- **macOS**: DMG package for both Intel and Apple Silicon

### 📥 Download Latest Release
Visit the [Releases page](https://github.com/ireddragonicy/openloveimage/releases) to download the latest version for your platform.

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Optional: Analytics or other services
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

### Customizing Conversion Settings

Edit `src/app/components/ConversionOptions.tsx` to modify:
- Default quality settings
- Available output formats
- Compression level options
- Maximum file size limits

## 📁 Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── ConversionOptions.tsx    # Settings and options
│   │   ├── FileProcessor.tsx        # File management and processing
│   │   ├── Header.tsx              # App header and navigation
│   │   ├── ImageConverter.tsx      # Main application component
│   │   ├── ImageUploader.tsx       # Drag & drop file upload
│   │   └── ThemeProvider.tsx       # Material-UI theme configuration
│   ├── utils/
│   │   └── imageConverter.ts       # Core conversion logic
│   ├── globals.css                 # Global styles
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Home page
├── public/                         # Static assets
└── ...config files
```

## 🌟 Key Components

### ImageConverter Class
Core utility class that handles:
- HEIC to JPEG/PNG conversion using `heic-to`
- Regular image format conversion using Canvas API
- Image resizing and quality adjustment
- Batch processing with progress tracking

### ConversionOptions Component
Provides UI for:
- Output format selection
- Quality and compression settings
- Resize options with aspect ratio control
- Metadata removal toggle

### FileProcessor Component
Manages:
- File list display and management
- Conversion progress tracking
- Individual and batch downloads
- Error handling and status display

## 🎯 Browser Support

- **Chrome**: ✅ Full support
- **Firefox**: ✅ Full support
- **Safari**: ✅ Full support (including HEIC)
- **Edge**: ✅ Full support

**Note**: HEIC output format is not supported in browsers due to licensing restrictions.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Guidelines

1. **Code Style**: Follow TypeScript and ESLint configurations
2. **Components**: Use Material-UI components with custom styling
3. **State Management**: Use React hooks for local state
4. **Type Safety**: Maintain strict TypeScript typing
5. **Testing**: Add tests for new features

### Reporting Issues

Please use the [GitHub Issues](https://github.com/ireddragonicy/openloveimage/issues) page to report bugs or request features.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [heic-to](https://github.com/jessicayang24/heic-to) - HEIC conversion library
- [Material-UI](https://mui.com/) - React UI framework
- [Next.js](https://nextjs.org/) - React framework
- [react-dropzone](https://react-dropzone.js.org/) - File upload component

## 📞 Support

- 📧 **Email**: support@openloveimage.com
- 💬 **Discord**: [Join our community](https://discord.gg/openloveimage)
- 📚 **Documentation**: [Full docs](https://docs.openloveimage.com)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/ireddragonicy/openloveimage/issues)

---

**Made with ❤️ for the open source community**

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ireddragonicy/openloveimage&type=Date)](https://star-history.com/#ireddragonicy/openloveimage&Date)
