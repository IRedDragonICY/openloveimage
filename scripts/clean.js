#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Directories to clean
const BUILD_DIRS = [
  'out',
  '.next', 
  'src-tauri/target',
  'node_modules/.cache'
];

const ALL_DIRS = [
  ...BUILD_DIRS,
  'node_modules'
];

function removeDirectory(dirPath) {
  const fullPath = path.resolve(dirPath);
  
  if (fs.existsSync(fullPath)) {
    try {
      console.log(`🗑️  Removing: ${dirPath}`);
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`✅ Removed: ${dirPath}`);
    } catch (error) {
      if (error.code === 'EPERM') {
        console.warn(`⚠️  Permission denied: ${dirPath}`);
        console.warn(`   This is common on Windows when files are in use.`);
        console.warn(`   Try closing your IDE/editor and run the command again.`);
      } else {
        console.warn(`⚠️  Could not remove ${dirPath}: ${error.message}`);
      }
    }
  } else {
    console.log(`ℹ️  Not found: ${dirPath}`);
  }
}

function clean(includeNodeModules = false) {
  const dirsToClean = includeNodeModules ? ALL_DIRS : BUILD_DIRS;
  
  console.log(`🧹 Cleaning ${includeNodeModules ? 'all' : 'build'} directories...\n`);
  
  dirsToClean.forEach(removeDirectory);
  
  console.log(`\n✨ Clean completed!`);
  
  if (includeNodeModules) {
    console.log('💡 Run "npm install" to reinstall dependencies');
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const includeAll = args.includes('--all') || args.includes('-a');

clean(includeAll); 