#!/usr/bin/env node

/**
 * Deploy Prepare Script
 *
 * Script ini mempersiapkan folder deployment dengan:
 * 1. Copy backend source (optimized)
 * 2. Build frontend dan copy dist folder
 * 3. Setup environment files
 * 4. Cleanup unnecessary files
 * 5. Generate deployment manifest
 *
 * Usage: node deploy-prepare.js [options]
 * Options:
 *   --output-dir   : Output directory (default: ./deploy/production-ready)
 *   --skip-build   : Skip frontend build
 *   --include-node : Include node_modules after native-binary guard (not recommended)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes untuk console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.error(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.bright}${colors.blue}→ ${msg}${colors.reset}`),
};

// Parse arguments
const args = process.argv.slice(2);
let outputDir = './deploy/production-ready';
let skipBuild = false;
let includeNodeModules = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--output-dir' && args[i + 1]) {
    outputDir = args[i + 1];
    i++;
  }
  if (args[i] === '--skip-build') skipBuild = true;
  if (args[i] === '--include-node') includeNodeModules = true;
}

// Helper functions
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyDir(src, dest, excludePatterns = []) {
  ensureDir(dest);
  const files = fs.readdirSync(src);

  for (const file of files) {
    // Skip excluded patterns
    if (excludePatterns.some(pattern => file.match(pattern))) {
      continue;
    }

    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);

    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath, excludePatterns);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function findNativeBinaries(dir) {
  const matches = [];
  if (!fs.existsSync(dir)) return matches;

  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      matches.push(...findNativeBinaries(filePath));
    } else if (/\.(node|dll|so|dylib)$/i.test(file)) {
      matches.push(filePath);
    }
  }

  return matches;
}

function getFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getDirSize(dir) {
  let size = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      size += getDirSize(filePath);
    } else {
      size += stat.size;
    }
  }
  return size;
}

// Main deployment preparation
async function main() {
  try {
    log.step('Starting Deployment Preparation...');
    log.info(`Output directory: ${outputDir}`);

    // 1. Clean output directory
    log.step('Cleaning output directory...');
    removeDir(outputDir);
    ensureDir(outputDir);
    log.success('Output directory cleaned');

    // 2. Copy backend source
    log.step('Copying backend source files...');
    ensureDir(path.join(outputDir, 'backend'));
    copyDir(
      './backend/src',
      path.join(outputDir, 'backend', 'src'),
      [/node_modules/, /\.db/, /\.db-/, /\.env/]
    );
    log.success('Backend source copied');

    log.step('Verifying backend runtime compatibility...');
    const backendPackage = JSON.parse(fs.readFileSync('./backend/package.json', 'utf8'));
    const runtimeDeps = {
      ...(backendPackage.dependencies || {}),
      ...(backendPackage.optionalDependencies || {}),
    };
    const blockedDeps = ['better-sqlite3', 'sqlite3', 'bcrypt', 'sharp'];
    const blockedInstalled = blockedDeps.filter((dep) =>
      Object.prototype.hasOwnProperty.call(runtimeDeps, dep)
    );
    if (blockedInstalled.length) {
      throw new Error(`Native dependency not allowed for shared hosting: ${blockedInstalled.join(', ')}`);
    }
    log.success('Backend dependencies are native-addon free');

    // 3. Copy database (if exists)
    log.step('Checking for database file...');
    const dbPath = './backend/simwarga.db';
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, path.join(outputDir, 'backend', 'simwarga.db'));
      log.success('Database file copied');
    } else {
      log.warn('Database file not found (will be created on first run)');
    }

    // 4. Build and copy frontend
    if (!skipBuild) {
      log.step('Building frontend...');
      try {
        execSync('cd frontend && npm run build', { stdio: 'inherit' });
        log.success('Frontend built successfully');
      } catch (err) {
        log.error('Frontend build failed');
        throw err;
      }
    } else {
      log.warn('Skipping frontend build');
    }

    log.step('Copying frontend dist...');
    if (fs.existsSync('./frontend/dist')) {
      copyDir('./frontend/dist', path.join(outputDir, 'frontend', 'dist'));
      log.success('Frontend dist copied');
    } else {
      log.error('Frontend dist folder not found. Run build first.');
      process.exit(1);
    }

    // 5. Copy package.json files
    log.step('Copying package.json files...');
    fs.copyFileSync('./backend/package.json', path.join(outputDir, 'backend', 'package.json'));
    fs.copyFileSync('./backend/package-lock.json', path.join(outputDir, 'backend', 'package-lock.json'));
    log.success('Package files copied');

    // 6. Copy configuration files
    log.step('Copying configuration files...');

    // web.config
    if (fs.existsSync('./deploy/configs/web.config')) {
      fs.copyFileSync('./deploy/configs/web.config', path.join(outputDir, 'web.config'));
    }

    // .htaccess
    if (fs.existsSync('./deploy/configs/.htaccess')) {
      fs.copyFileSync('./deploy/configs/.htaccess', path.join(outputDir, '.htaccess'));
    }

    // server.js
    if (fs.existsSync('./deploy/smarterasp/server.js')) {
      fs.copyFileSync('./deploy/smarterasp/server.js', path.join(outputDir, 'server.js'));
    }

    if (fs.existsSync('./deploy/smarterasp/README-DEPLOY.txt')) {
      fs.copyFileSync('./deploy/smarterasp/README-DEPLOY.txt', path.join(outputDir, 'README-DEPLOY.txt'));
    }

    log.success('Configuration files copied');

    // 7. Generate package.json for production (root level)
    log.step('Generating production package.json...');
    const prodPackage = {
      name: 'simwarga-production',
      version: '1.0.0',
      description: 'SimWarga - Production Deployment',
      main: 'server.js',
      scripts: {
        start: 'node server.js',
        install: 'cd backend && npm ci --omit=dev'
      },
      engines: {
        node: '>=22.5.0'
      }
    };
    fs.writeFileSync(
      path.join(outputDir, 'package.json'),
      JSON.stringify(prodPackage, null, 2)
    );
    log.success('Production package.json generated');

    // 8. Copy node_modules jika diperlukan (not recommended untuk production)
    if (includeNodeModules && fs.existsSync('./backend/node_modules')) {
      log.warn('Including node_modules (this will significantly increase package size)');
      log.step('Copying node_modules...');
      const nativeBinaries = findNativeBinaries('./backend/node_modules');
      if (nativeBinaries.length) {
        throw new Error(`Refusing to include node_modules with native binaries:\n${nativeBinaries.join('\n')}`);
      }
      copyDir(
        './backend/node_modules',
        path.join(outputDir, 'backend', 'node_modules'),
        [/^\./] // exclude hidden folders
      );
      log.success('node_modules copied');
    } else {
      log.warn('node_modules not included (run "npm ci --omit=dev" on server)');
    }

    // 9. Generate .env.example untuk reference
    if (fs.existsSync('./deploy/configs/.env.example')) {
      fs.copyFileSync(
        './deploy/configs/.env.example',
        path.join(outputDir, '.env.example')
      );
      log.success('.env.example copied (template only, configure on server)');
    }

    // 10. Generate deployment manifest
    log.step('Generating deployment manifest...');
    const manifest = {
      version: '1.0.0',
      date: new Date().toISOString(),
      platform: 'smarterasp.net (Node.js + IIS)',
      structure: {
        backend: {
          src: 'Backend source code (Express API)',
          'simwarga.db': 'SQLite database',
          'package.json': 'Backend dependencies',
          'package-lock.json': 'Lock file'
        },
        frontend: {
          dist: 'Static frontend build (Vue 3 + Vite)'
        },
        root: {
          'server.js': 'Entry point for IIS',
          'web.config': 'IIS configuration',
          '.htaccess': 'Apache configuration (if applicable)',
          'package.json': 'Root deployment package',
          '.env.example': 'Environment template'
        }
      },
      notes: [
        'This deployment package is production-ready',
        'Configure .env file on the server before starting',
        'Run "npm ci --omit=dev" in backend folder on server',
        'Database file (simwarga.db) will auto-initialize on first run',
        'Ensure folder write permissions for database storage',
        'Requires Node.js >=22.5.0 because the backend uses built-in node:sqlite instead of native npm SQLite addons'
      ],
      requirements: {
        nodeVersion: '>=22.5.0',
        platform: 'Windows Server (IIS) or Linux (Apache/Nginx)',
        disk: 'Minimum 500MB free space',
        memory: 'Minimum 512MB RAM recommended'
      },
      security: {
        important: [
          'Change JWT_SECRET in .env to a strong random value',
          'Configure ALLOWED_ORIGINS with your actual domain',
          'Keep .env file secure and never commit to version control',
          'Use HTTPS in production (enforce in web.config)',
          'Regularly backup simwarga.db database'
        ]
      }
    };

    fs.writeFileSync(
      path.join(outputDir, 'MANIFEST.json'),
      JSON.stringify(manifest, null, 2)
    );
    log.success('Deployment manifest generated');

    // 11. Calculate and report sizes
    log.step('Calculating deployment package size...');
    const totalSize = getDirSize(outputDir);
    const packagedNativeBinaries = findNativeBinaries(outputDir);
    if (packagedNativeBinaries.length) {
      throw new Error(`Deployment package contains native binaries:\n${packagedNativeBinaries.join('\n')}`);
    }
    log.success('No native binary files found in deployment package');
    log.info(`Total package size: ${getFileSize(totalSize)}`);

    // Report folder sizes
    const backendSize = fs.existsSync(path.join(outputDir, 'backend'))
      ? getDirSize(path.join(outputDir, 'backend'))
      : 0;
    const frontendSize = fs.existsSync(path.join(outputDir, 'frontend'))
      ? getDirSize(path.join(outputDir, 'frontend'))
      : 0;

    log.info(`  - Backend: ${getFileSize(backendSize)}`);
    log.info(`  - Frontend: ${getFileSize(frontendSize)}`);

    // Final summary
    log.step('Deployment Preparation Complete!');
    log.success(`Package ready in: ${outputDir}`);
    log.info('Next steps:');
    log.info('  1. Review MANIFEST.json for structure and requirements');
    log.info('  2. Create .env file from .env.example and configure for your domain');
    log.info('  3. ZIP the folder for upload');
    log.info('  4. Upload to smarterasp.net');
    log.info('  5. Run "npm ci --omit=dev" in backend folder on server');
    log.info('  6. Set startup file to "server.js" in control panel');
    log.info('  7. Start the Node.js application');

  } catch (error) {
    log.error(`Deployment preparation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main();
