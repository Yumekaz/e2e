#!/usr/bin/env node
/**
 * Verification Script for E2E Messenger
 * Checks all dependencies and configurations
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 E2E Messenger Verification\n');

let errors = 0;
let warnings = 0;

function check(condition, message, isWarning = false) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    return true;
  } else {
    if (isWarning) {
      console.log(`  ⚠️  ${message}`);
      warnings++;
    } else {
      console.log(`  ❌ ${message}`);
      errors++;
    }
    return false;
  }
}

// Check Node.js version
console.log('📦 Environment Checks:');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
check(majorVersion >= 18, `Node.js version ${nodeVersion} (>= 18 required)`);

// Check package.json exists
check(fs.existsSync('package.json'), 'package.json exists');
check(fs.existsSync('client/package.json'), 'client/package.json exists');

// Check node_modules
console.log('\n📁 Dependencies:');
check(fs.existsSync('node_modules'), 'Server node_modules installed');
check(fs.existsSync('client/node_modules'), 'Client node_modules installed');

// Check critical server dependencies
const serverDeps = ['express', 'socket.io', 'sql.js', 'bcryptjs', 'jsonwebtoken'];
serverDeps.forEach(dep => {
  check(fs.existsSync(`node_modules/${dep}`), `${dep} installed`);
});

// Check critical client dependencies
const clientDeps = ['react', 'react-dom', 'socket.io-client', 'qrcode.react'];
clientDeps.forEach(dep => {
  check(fs.existsSync(`client/node_modules/${dep}`), `${dep} installed`, true);
});

// Check source files
console.log('\n📄 Source Files:');
check(fs.existsSync('server-enhanced.js'), 'server-enhanced.js exists');
check(fs.existsSync('backend/socket/index.js'), 'Socket handler exists');
check(fs.existsSync('backend/socket/handlers/messageHandler.js'), 'Message handler exists');
check(fs.existsSync('backend/database/db.js'), 'Database module exists');

// Check client source files
const clientFiles = [
  'client/src/App.tsx',
  'client/src/socket.ts',
  'client/src/pages/RoomPage.tsx',
  'client/src/pages/AuthPage.tsx',
  'client/src/pages/HomePage.tsx',
  'client/src/hooks/useScreenshotDetection.ts',
  'client/src/hooks/useBlurOnUnfocus.ts',
  'client/src/components/ConfirmModal.tsx',
  'client/src/components/FileUpload.tsx',
  'client/src/components/Toast.tsx',
];

clientFiles.forEach(file => {
  check(fs.existsSync(file), `${file} exists`);
});

// Check build output
console.log('\n🏗️  Build Status:');
check(fs.existsSync('public_build/index.html'), 'Client built (public_build/index.html)');

// Check SSL certificates (optional)
console.log('\n🔒 SSL Certificates (Optional):');
check(fs.existsSync('ssl/key.pem'), 'SSL key exists', true);
check(fs.existsSync('ssl/cert.pem'), 'SSL certificate exists', true);

// Check database
console.log('\n💾 Database:');
check(fs.existsSync('data') || fs.existsSync('chat.db'), 'Database directory or file exists', true);

// Summary
console.log('\n' + '='.repeat(50));
if (errors === 0 && warnings === 0) {
  console.log('🎉 All checks passed! Ready to run offline.');
  console.log('\nNext steps:');
  console.log('  1. npm start');
  console.log('  2. Open http://localhost:3000');
  console.log('  3. Disconnect internet and test!');
  process.exit(0);
} else if (errors === 0) {
  console.log(`⚠️  ${warnings} warning(s), but ready to run.`);
  process.exit(0);
} else {
  console.log(`❌ ${errors} error(s), ${warnings} warning(s) found.`);
  console.log('\nFix errors and run: npm run setup');
  process.exit(1);
}
