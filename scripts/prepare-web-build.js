// scripts/prepare-web-build.js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const packageJsonPath = path.resolve(__dirname, '../package.json');
const originalPackageJsonPath = path.resolve(__dirname, '../package.json.original'); // For backup

const packagesToExclude = ['wemore', 'robotjs', '@electron-toolkit/preload', '@electron-toolkit/utils', 'cors', 'custom-electron-titlebar', 'electron-store', 'express', 'mqtt', 'serve', '@electron-toolkit/eslint-config-prettier', '@electron-toolkit/eslint-config-ts', '@types/node', '@types/cors', '@types/express', 'electron-devtools-installer', 'electron-rebuild' ]

try {
  // Backup original package.json if it doesn't exist yet
  if (!fs.existsSync(originalPackageJsonPath)) {
    fs.copyFileSync(packageJsonPath, originalPackageJsonPath);
    console.log('Original package.json backed up to package.json.original');
  } else {
    // Restore from backup before modifying, to ensure we start from a clean slate if run multiple times locally
    fs.copyFileSync(originalPackageJsonPath, packageJsonPath);
    console.log('Restored package.json from backup before modification.');
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  let modified = false;

  console.log('Original dependencies:', packageJson.dependencies);
  console.log('Original devDependencies:', packageJson.devDependencies);
  console.log('Original optionalDependencies:', packageJson.optionalDependencies);

  ['dependencies', 'devDependencies', 'optionalDependencies'].forEach(depType => {
    if (packageJson[depType]) {
      packagesToExclude.forEach(pkgName => {
        if (packageJson[depType][pkgName]) {
          console.log(`Removing ${pkgName} from ${depType}...`);
          delete packageJson[depType][pkgName];
          modified = true;
        }
      });
    }
  });

  if (modified) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
    console.log('Modified package.json to exclude specified packages for web build.');
    console.log('New dependencies:', packageJson.dependencies);
    console.log('New devDependencies:', packageJson.devDependencies);
    console.log('New optionalDependencies:', packageJson.optionalDependencies);
  } else {
    console.log('No specified packages found to exclude in package.json.');
  }

} catch (error) {
  console.error('Error modifying package.json:', error);
  process.exit(1); // Exit with error code so CI fails
}