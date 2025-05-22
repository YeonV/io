import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const packageJsonPath = path.resolve(__dirname, '../package.json');
const originalPackageJsonPath = path.resolve(__dirname, '../package.json.original'); 

fs.copyFileSync(originalPackageJsonPath, packageJsonPath);
// Delete the backup file after restoring
fs.unlinkSync(originalPackageJsonPath);
console.log('Restored package.json from backup and deleted the backup file.'); 