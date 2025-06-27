# 🤝 Contributing to OpenLoveImage

Thank you for considering contributing to OpenLoveImage! This document provides guidelines and information for contributors.

## 🚀 Quick Start

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/openloveimage.git
   cd openloveimage
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Start development**:
   ```bash
   npm run dev
   ```

## 🏗️ Development Setup

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **Rust** (latest stable)
- **Git**

### Platform-Specific Setup

#### Windows
- Visual Studio Build Tools or Visual Studio Community
- Windows 10 SDK

#### macOS
- Xcode Command Line Tools: `xcode-select --install`

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev
```

### Development Commands

```bash
# Development
npm run dev                # Start dev server with hot reload
npm run dev:clean         # Clean build artifacts and start dev

# Building & Testing
npm run build             # Build frontend only
npm run tauri:dev         # Start Tauri development mode
npm run tauri:build       # Build production Tauri app
npm run tauri:build:debug # Build debug version

# Code Quality
npm run lint              # Run ESLint
npm run lint:fix          # Fix ESLint issues automatically
npm run check             # Run all quality checks

# Version Management
npm run version:patch     # Bump patch version (0.0.X)
npm run version:minor     # Bump minor version (0.X.0)
npm run version:major     # Bump major version (X.0.0)
npm run version:sync      # Sync versions across files

# Maintenance
npm run clean             # Clean build artifacts only
npm run clean:all         # Clean everything including node_modules
npm run changelog         # Generate changelog from git history
```

## 📋 Contributing Guidelines

### 1. 🎯 Types of Contributions

We welcome:
- 🐛 **Bug fixes**
- ✨ **New features**
- 📚 **Documentation improvements**
- 🎨 **UI/UX enhancements**
- ⚡ **Performance optimizations**
- 🧪 **Tests**
- 🌐 **Translations/Localization**

### 2. 📝 Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

**Examples**:
```bash
feat: add support for WebP format conversion
fix: resolve memory leak in batch processing
docs: update installation instructions
style: format code with prettier
refactor: simplify image processing pipeline
perf: optimize large file handling
test: add unit tests for image converter
chore: update dependencies
ci: add automated security scanning
```

### 3. 🌿 Branch Naming

Use descriptive branch names:
```
feat/webp-support
fix/memory-leak-batch-processing
docs/update-readme
refactor/image-processing
```

### 4. 🔄 Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes**:
   - Follow the coding standards
   - Add tests if applicable
   - Update documentation

3. **Test your changes**:
   ```bash
   npm run check
   npm run tauri:build:debug
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and create PR**:
   ```bash
   git push origin feat/your-feature-name
   ```

6. **Create Pull Request** on GitHub with:
   - Clear title and description
   - Link to related issues
   - Screenshots/videos for UI changes
   - Testing instructions

### 5. 📏 Code Standards

#### Frontend (React/TypeScript)
- Use TypeScript for type safety
- Follow React best practices
- Use Material-UI components consistently
- Implement responsive design
- Add proper error handling

#### Backend (Rust/Tauri)
- Follow Rust conventions
- Use proper error handling with `Result<T, E>`
- Add documentation comments
- Implement proper logging

#### General
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused
- Follow DRY (Don't Repeat Yourself) principle

## 🧪 Testing

### Running Tests

```bash
# Frontend tests (if available)
npm test

# Rust tests
cd src-tauri
cargo test

# Integration tests
npm run test:integration
```

### Test Guidelines

- Write tests for new features
- Update tests when modifying existing code
- Include edge cases and error scenarios
- Test on multiple platforms when possible

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to reproduce**: Detailed steps
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Environment**:
   - OS and version
   - App version
   - Node.js version (for development)
6. **Screenshots/Videos**: If applicable
7. **Console logs**: Any error messages

**Use the bug report template** when creating issues.

## ✨ Feature Requests

When requesting features:

1. **Use case**: Describe why you need this feature
2. **Description**: Detailed description of the feature
3. **Mockups**: UI mockups if applicable
4. **Alternatives**: Any alternative solutions considered

## 🏆 Recognition

Contributors will be:
- 📝 Listed in the CONTRIBUTORS file
- 🎉 Mentioned in release notes
- 🌟 Credited in the app's about section

## 📞 Getting Help

- 💬 **Discussions**: Use GitHub Discussions for questions
- 🐛 **Issues**: Use GitHub Issues for bugs and feature requests
- 📧 **Direct Contact**: Reach out to maintainers for private matters

## 📜 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of:
- Age, body size, disability, ethnicity
- Gender identity and expression
- Level of experience, education, socio-economic status
- Nationality, personal appearance, race, religion
- Sexual identity and orientation

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, trolling, or insulting comments
- Public or private harassment
- Publishing others' private information
- Other conduct inappropriate in a professional setting

## 🎉 Thank You!

Your contributions make OpenLoveImage better for everyone. We appreciate your time and effort in helping improve this project!

---

**Happy coding! 🚀** 