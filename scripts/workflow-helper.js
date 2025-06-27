#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GITHUB_REPO = 'ireddragonicy/openloveimage';

function showHelp() {
  console.log(`
🚀 OpenLoveImage Workflow Helper

Usage: node scripts/workflow-helper.js <command>

Commands:
  status          Show workflow status
  trigger         Trigger workflows manually
  release         Create a release
  nightly         Trigger nightly build
  version         Version management
  changelog       Generate changelog
  help            Show this help

Examples:
  node scripts/workflow-helper.js status
  node scripts/workflow-helper.js trigger release
  node scripts/workflow-helper.js version patch
  node scripts/workflow-helper.js changelog
`);
}

function checkGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      console.log('⚠️  Warning: You have uncommitted changes');
      console.log(status);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Error checking git status:', error.message);
    return false;
  }
}

function getCurrentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error('❌ Error getting current branch:', error.message);
    return null;
  }
}

function getWorkflowStatus() {
  console.log('📊 Workflow Status\n');
  
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    console.log(`📍 Current branch: ${branch}`);
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(`📦 Current version: ${packageJson.version}`);
    
    const lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null || echo "None"', { encoding: 'utf8' }).trim();
    console.log(`🏷️  Last tag: ${lastTag}`);
    
  } catch (error) {
    console.error('❌ Error getting status:', error.message);
  }
}

function triggerWorkflow(workflowType = 'release') {
  const branch = getCurrentBranch();
  
  if (branch !== 'main' && workflowType === 'release') {
    console.log('⚠️  Warning: Release workflow typically runs on main branch');
    console.log(`Current branch: ${branch}`);
  }
  
  switch (workflowType) {
    case 'release':
      console.log('🚀 Triggering release workflow...');
      console.log('💡 Tip: Push to main branch or use GitHub Actions web interface');
      console.log(`🔗 https://github.com/${GITHUB_REPO}/actions/workflows/release.yml`);
      break;
      
    case 'nightly':
      console.log('🌙 Triggering nightly build...');
      console.log(`🔗 https://github.com/${GITHUB_REPO}/actions/workflows/nightly.yml`);
      break;
      
    case 'ci':
      console.log('🧪 CI workflow will trigger on push/PR');
      console.log(`🔗 https://github.com/${GITHUB_REPO}/actions/workflows/ci.yml`);
      break;
      
    default:
      console.log('❌ Unknown workflow type. Available: release, nightly, ci');
  }
}

function manageVersion(action = 'patch') {
  if (!checkGitStatus()) {
    console.log('❌ Please commit your changes first');
    return;
  }
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const currentVersion = packageJson.version;
  
  console.log(`📦 Current version: ${currentVersion}`);
  
  try {
    switch (action) {
      case 'patch':
        execSync('npm run version:patch', { stdio: 'inherit' });
        break;
      case 'minor':
        execSync('npm run version:minor', { stdio: 'inherit' });
        break;
      case 'major':
        execSync('npm run version:major', { stdio: 'inherit' });
        break;
      default:
        console.log('❌ Invalid version action. Use: patch, minor, major');
        return;
    }
    
    const newPackageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const newVersion = newPackageJson.version;
    
    console.log(`✅ Version updated: ${currentVersion} → ${newVersion}`);
    console.log('💡 Commit and push to trigger release:');
    console.log(`git add -A`);
    console.log(`git commit -m "chore: bump version to ${newVersion}"`);
    console.log(`git push origin main`);
    
  } catch (error) {
    console.error('❌ Error updating version:', error.message);
  }
}

function generateChangelog() {
  console.log('📝 Generating changelog...');
  
  try {
    execSync('npm run changelog', { stdio: 'inherit' });
    console.log('✅ Changelog generated successfully!');
  } catch (error) {
    console.error('❌ Error generating changelog:', error.message);
  }
}

function createRelease() {
  console.log('🎯 Creating release...\n');
  
  if (!checkGitStatus()) {
    console.log('❌ Please commit your changes first');
    return;
  }
  
  const branch = getCurrentBranch();
  if (branch !== 'main') {
    console.log(`⚠️  Warning: Current branch is '${branch}', not 'main'`);
    console.log('Releases are typically created from main branch');
  }
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`📦 Current version: ${packageJson.version}`);
  
  console.log('\n🔄 Release process:');
  console.log('1. Update version (if needed)');
  console.log('2. Generate changelog');
  console.log('3. Commit changes');
  console.log('4. Push to main');
  console.log('5. Workflow will automatically create release');
  
  console.log('\n💡 Quick release commands:');
  console.log('npm run version:patch && git add -A && git commit -m "chore: prepare release" && git push origin main');
}

// Main command handler
const command = process.argv[2];
const subCommand = process.argv[3];

switch (command) {
  case 'status':
    getWorkflowStatus();
    break;
    
  case 'trigger':
    triggerWorkflow(subCommand);
    break;
    
  case 'release':
    createRelease();
    break;
    
  case 'nightly':
    triggerWorkflow('nightly');
    break;
    
  case 'version':
    manageVersion(subCommand);
    break;
    
  case 'changelog':
    generateChangelog();
    break;
    
  case 'help':
  case undefined:
    showHelp();
    break;
    
  default:
    console.log(`❌ Unknown command: ${command}`);
    showHelp();
} 