#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get current version
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const currentVersion = packageJson.version;

console.log(`📝 Generating changelog for version ${currentVersion}`);

// Get last tag
let lastTag;
try {
  lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
  console.log(`📋 Last tag found: ${lastTag}`);
} catch (error) {
  console.log('📋 No previous tag found, generating changelog from all commits');
  lastTag = null;
}

// Get commits since last tag
let commits;
try {
  if (lastTag) {
    commits = execSync(`git log ${lastTag}..HEAD --pretty=format:"%s (%h)" --no-merges`, { encoding: 'utf8' });
  } else {
    commits = execSync('git log --pretty=format:"%s (%h)" --no-merges', { encoding: 'utf8' });
  }
} catch (error) {
  console.error('❌ Error getting git commits:', error.message);
  process.exit(1);
}

if (!commits.trim()) {
  console.log('ℹ️ No new commits found since last tag');
  return;
}

// Categorize commits
const commitLines = commits.split('\n').filter(line => line.trim());
const categories = {
  breaking: [],
  features: [],
  fixes: [],
  improvements: [],
  docs: [],
  other: []
};

commitLines.forEach(commit => {
  const lower = commit.toLowerCase();
  
  if (lower.includes('breaking') || lower.includes('!:')) {
    categories.breaking.push(commit);
  } else if (lower.match(/^(feat|feature|add|implement)/)) {
    categories.features.push(commit);
  } else if (lower.match(/^(fix|bug|resolve|patch)/)) {
    categories.fixes.push(commit);
  } else if (lower.match(/^(improve|enhance|optimize|refactor|perf)/)) {
    categories.improvements.push(commit);
  } else if (lower.match(/^(docs|doc|readme)/)) {
    categories.docs.push(commit);
  } else {
    categories.other.push(commit);
  }
});

// Generate changelog content
let changelog = `# Changelog

## [${currentVersion}] - ${new Date().toISOString().split('T')[0]}

`;

if (categories.breaking.length > 0) {
  changelog += `### 🚨 Breaking Changes\n\n`;
  categories.breaking.forEach(commit => {
    changelog += `- ${commit}\n`;
  });
  changelog += '\n';
}

if (categories.features.length > 0) {
  changelog += `### ✨ New Features\n\n`;
  categories.features.forEach(commit => {
    changelog += `- ${commit}\n`;
  });
  changelog += '\n';
}

if (categories.fixes.length > 0) {
  changelog += `### 🐛 Bug Fixes\n\n`;
  categories.fixes.forEach(commit => {
    changelog += `- ${commit}\n`;
  });
  changelog += '\n';
}

if (categories.improvements.length > 0) {
  changelog += `### 🔧 Improvements\n\n`;
  categories.improvements.forEach(commit => {
    changelog += `- ${commit}\n`;
  });
  changelog += '\n';
}

if (categories.docs.length > 0) {
  changelog += `### 📚 Documentation\n\n`;
  categories.docs.forEach(commit => {
    changelog += `- ${commit}\n`;
  });
  changelog += '\n';
}

if (categories.other.length > 0) {
  changelog += `### 📦 Other Changes\n\n`;
  categories.other.forEach(commit => {
    changelog += `- ${commit}\n`;
  });
  changelog += '\n';
}

// Add technical details
changelog += `### 🔧 Technical Details

- **Platform Support**: Windows (x64), macOS (Universal), Linux (x64)
- **Built with**: Tauri v2, Next.js 15, React 19, TypeScript 5
- **Security**: All processing done locally, no data leaves your device
- **Performance**: Native desktop performance with web technologies

### 📦 Download Options

Choose the appropriate file for your operating system:

- **Windows**: 
  - \`.msi\` - Windows Installer (recommended)
  - \`.exe\` - NSIS Setup
- **macOS**: 
  - \`.dmg\` - Universal binary (Intel & Apple Silicon)
- **Linux**: 
  - \`.AppImage\` - Portable application
  - \`.deb\` - Debian/Ubuntu package

### 🚀 Installation Instructions

#### Windows
1. Download the \`.msi\` file
2. Double-click to run the installer
3. Follow the setup wizard
4. Launch from Start Menu or Desktop shortcut

#### macOS
1. Download the \`.dmg\` file
2. Open the DMG and drag the app to Applications
3. Launch from Applications folder
4. If prompted about security, go to System Preferences > Security & Privacy

#### Linux
1. **AppImage**: Make executable (\`chmod +x\`) and run
2. **DEB**: Install with \`sudo dpkg -i package.deb\`

---

**Full Changelog**: https://github.com/${packageJson.repository?.url?.match(/github\.com\/(.+)\.git/)?.[1] || 'ireddragonicy/openloveimage'}/compare/${lastTag || 'initial'}...v${currentVersion}

`;

// Read existing changelog and prepend new content
const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
let existingChangelog = '';

if (fs.existsSync(changelogPath)) {
  existingChangelog = fs.readFileSync(changelogPath, 'utf8');
  
  // Remove the main title if it exists to avoid duplication
  existingChangelog = existingChangelog.replace(/^# Changelog\s*\n+/, '');
}

// Write updated changelog
const fullChangelog = changelog + existingChangelog;
fs.writeFileSync(changelogPath, fullChangelog);

console.log(`✅ Changelog generated successfully!`);
console.log(`📄 Changelog saved to: ${changelogPath}`);
console.log(`📊 Categories: ${Object.keys(categories).filter(key => categories[key].length > 0).join(', ')}`);

// Also create a release notes file for this version
const releaseNotesPath = path.join(__dirname, '..', `RELEASE_NOTES_v${currentVersion}.md`);
const releaseNotes = changelog.replace('# Changelog\n\n', '');
fs.writeFileSync(releaseNotesPath, releaseNotes);

console.log(`📋 Release notes saved to: ${releaseNotesPath}`); 