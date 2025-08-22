#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🐶 Setting up Husky pre-commit hooks...');

try {
  // Install husky
  console.log('Installing Husky...');
  execSync('npm install --save-dev husky', { stdio: 'inherit' });
  
  // Initialize husky
  console.log('Initializing Husky...');
  execSync('npx husky install', { stdio: 'inherit' });
  
  // Add pre-commit hook
  console.log('Adding pre-commit hook...');
  execSync('npx husky add .husky/pre-commit "npm run pre-commit"', { stdio: 'inherit' });
  
  // Make hooks executable
  const hooksDir = path.join(__dirname);
  const hooks = fs.readdirSync(hooksDir).filter(file => !file.includes('.'));
  
  hooks.forEach(hook => {
    const hookPath = path.join(hooksDir, hook);
    fs.chmodSync(hookPath, '755');
  });
  
  console.log('✅ Husky setup complete!');
} catch (error) {
  console.error('❌ Failed to setup Husky:', error.message);
  process.exit(1);
}