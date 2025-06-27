#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read version from package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

console.log(`🔄 Syncing version: ${version}`);

// Update tauri.conf.json
const tauriConfPath = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));

tauriConf.version = version;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');

console.log(`✅ Updated tauri.conf.json version to ${version}`);

// Update Cargo.toml
const cargoTomlPath = path.join(__dirname, '..', 'src-tauri', 'Cargo.toml');
let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');

// Replace version in [package] section
cargoToml = cargoToml.replace(
  /(\[package\][\s\S]*?version\s*=\s*")[^"]*(")/,
  `$1${version}$2`
);

fs.writeFileSync(cargoTomlPath, cargoToml);
console.log(`✅ Updated Cargo.toml version to ${version}`);

console.log('🎉 Version sync completed!'); 