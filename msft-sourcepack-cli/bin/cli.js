#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const MANIFEST_FILE = 'sourcepack.json';

function findInstalledTemplatePackages(projectRoot) {
  const nodeModulesDir = path.join(projectRoot, 'node_modules');
  if (!fs.existsSync(nodeModulesDir)) {
    return [];
  }

  const packages = [];

  for (const entry of fs.readdirSync(nodeModulesDir)) {
    if (entry.startsWith('@')) {
      // Scoped packages — scan inside the scope directory
      const scopeDir = path.join(nodeModulesDir, entry);
      for (const name of fs.readdirSync(scopeDir)) {
        const dir = path.join(scopeDir, name);
        if (fs.existsSync(path.join(dir, MANIFEST_FILE))) {
          packages.push({ name: `${entry}/${name}`, dir });
        }
      }
    } else {
      // Unscoped packages
      const dir = path.join(nodeModulesDir, entry);
      if (fs.statSync(dir).isDirectory() && fs.existsSync(path.join(dir, MANIFEST_FILE))) {
        packages.push({ name: entry, dir });
      }
    }
  }

  return packages;
}

function loadManifest(pkgDir) {
  const manifestPath = path.join(pkgDir, MANIFEST_FILE);
  const content = fs.readFileSync(manifestPath, 'utf8');
  return JSON.parse(content);
}

function validateManifest(manifest, pkgName) {
  if (manifest.files) {
    const validActions = ['replace', 'skip'];
    for (const entry of manifest.files) {
      if (!validActions.includes(entry.ifExists)) {
        console.error(`  ERROR: File entry "${entry.src}" in ${pkgName} has invalid "ifExists" value (must be replace or skip).`);
        console.error(`  Refusing to process ${pkgName}.`);
        return false;
      }
    }
  }
  if (manifest.directories) {
    const validActions = ['replace', 'skip', 'merge'];
    for (const entry of manifest.directories) {
      if (!validActions.includes(entry.ifExists)) {
        console.error(`  ERROR: Directory entry "${entry.src}" in ${pkgName} has invalid "ifExists" value (must be replace, skip, or merge).`);
        console.error(`  Refusing to process ${pkgName}.`);
        return false;
      }
    }
  }
  if (!manifest.files && !manifest.directories) {
    console.error(`  ERROR: ${pkgName} sourcepack.json has neither "files" nor "directories".`);
    return false;
  }
  return true;
}

function copyFile(src, dest, options) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const fileName = path.basename(dest);
  const destRelative = options.destField;

  if (fs.existsSync(dest) && options.ifExists === 'skip') {
    console.log(`  SKIP: ${fileName} ${destRelative}`);
    return false;
  }

  fs.copyFileSync(src, dest);
  console.log(`  COPY: ${fileName} ${destRelative}`);
  return true;
}

function removeDirectoryRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function copyDirectoryRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function mergeDirectory(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      mergeDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function processDirectory(srcDir, destDir, ifExists, destField) {
  const destExists = fs.existsSync(destDir);

  if (destExists && ifExists === 'skip') {
    console.log(`  SKIP: ${destField}`);
    return 'skipped';
  }

  if (destExists && ifExists === 'replace') {
    removeDirectoryRecursive(destDir);
    copyDirectoryRecursive(srcDir, destDir);
    console.log(`  REPLACE: ${destField}`);
    return 'copied';
  }

  if (destExists && ifExists === 'merge') {
    mergeDirectory(srcDir, destDir);
    console.log(`  MERGE: ${destField}`);
    return 'copied';
  }

  // Directory does not exist — copy it
  copyDirectoryRecursive(srcDir, destDir);
  console.log(`  COPY: ${destField}`);
  return 'copied';
}

function init(projectRoot, options) {
  let packages = findInstalledTemplatePackages(projectRoot);

  if (options.author) {
    const scope = options.author.startsWith('@') ? options.author : `@${options.author}`;
    packages = packages.filter(pkg => pkg.name.startsWith(`${scope}/`));
  }

  if (packages.length === 0) {
    console.log('No sourcepack template packages found in node_modules.');
    console.log('Install packages first: npm install --save-dev @microsoft/sourcepack-sample-readme');
    process.exit(1);
  }

  console.log(`Found ${packages.length} template package(s):\n`);

  let copied = 0;
  let skipped = 0;

  for (const pkg of packages) {
    console.log(`${pkg.name}:`);
    const manifest = loadManifest(pkg.dir);

    if (!validateManifest(manifest, pkg.name)) {
      console.log('');
      continue;
    }

    if (manifest.files) {
      for (const entry of manifest.files) {
        const srcPath = path.join(pkg.dir, entry.src);
        const destPath = path.resolve(projectRoot, entry.dest, path.basename(entry.src));

        if (copyFile(srcPath, destPath, { ifExists: entry.ifExists, projectRoot, destField: entry.dest })) {
          copied++;
        } else {
          skipped++;
        }
      }
    }

    if (manifest.directories) {
      for (const entry of manifest.directories) {
        const srcDir = path.join(pkg.dir, entry.src);
        const destDir = path.resolve(projectRoot, entry.dest);

        const result = processDirectory(srcDir, destDir, entry.ifExists, entry.dest);
        if (result === 'copied') {
          copied++;
        } else {
          skipped++;
        }
      }
    }

    console.log('');
  }

  console.log(`Done. ${copied} file(s) copied, ${skipped} file(s) skipped.`);
}

// --- CLI entry point ---

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'help' || command === '--help') {
  console.log(`
sourcepack — Scaffold template files from installed sourcepack packages.

Usage:
  npx @microsoft/sourcepack-cli init

Commands:
  init      Copy template files and directories to project locations as declared
            in each package's sourcepack.json manifest.

            Files: each entry must include "ifExists" (replace/skip).
            Directories: each entry must include "ifExists" (replace/skip/merge).

Options:
  -a, --author <scope>  Only process packages from the given scope (e.g. @microsoft).
  --help                Show this help message.
`);
  process.exit(0);
}

if (command === 'init') {
  const projectRoot = process.env.INIT_CWD || process.cwd();
  let authorIdx = args.indexOf('--author');
  if (authorIdx === -1) authorIdx = args.indexOf('-a');
  const author = authorIdx !== -1 ? args[authorIdx + 1] : null;
  init(projectRoot, { author });
} else {
  console.error(`Unknown command: ${command}`);
  console.error('Run "npx @microsoft/sourcepack-cli --help" for usage.');
  process.exit(1);
}
