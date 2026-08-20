import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const TOKEN_BY_HEX = {
  '0a1424': 'app',
  '0f1e38': 'surface',
  '14294a': 'surface-2',
  '22365c': 'line',
  '1f3356': 'line-soft',
  'f2f5fa': 'ink',
  'a9b7ce': 'muted',
  '6c7c99': 'faint',
  'e3a73b': 'accent',
  '1a1200': 'accent-ink',
  'eeb64f': 'accent-hover',
  '3b6fe0': 'primary',
  '1c3966': 'primary-hover',
  '4fb579': 'success',
  '5fc78a': 'success-hover',
  '062412': 'success-ink',
  '132a1c': 'success-soft',
  'e2687a': 'danger',
  '3a1620': 'danger-soft',
  'ffb4c0': 'danger-ink',
  'd99a3d': 'warn',
  '332715': 'warn-soft',
  '3a2e14': 'gold-soft',
  '3a2a10': 'gold-soft',
  '38bdf8': 'info',
  '050912': 'overlay',
  '060d1a': 'overlay-2',
  'cd7f32': 'bronze',
  '1c3057': 'gold-deep',
  '080e1a': 'app-deep',
  '18263e': 'line-deep',
  '0369a1': 'sky-deep',
  '94a3b8': 'silver',
  '334155': 'slate-deep',
  'e2e8f0': 'slate-ink',
  'd97706': 'amber-deep',
  '78350f': 'amber-bg',
  'fbbf24': 'amber-ink',
  '8293b0': 'slate-faint',
  '2e9e52': 'success-strong',
  'c43b4e': 'danger-strong',
  'ffebee': 'danger-pale',
  'c95062': 'danger-hover',
  'ff8597': 'danger-light',
  'e6f8ee': 'success-pale',
  'fef3c7': 'warn-pale',
};

const CLASS_PREFIX = '(?:bg|text|border|from|to|via|ring|outline|divide|shadow|decoration|placeholder|caret|fill|stroke|accent)';
const PATTERN = new RegExp(`(${CLASS_PREFIX})-\\[#([0-9a-fA-F]{6})\\](?:\\/([0-9]+))?`, 'g');

function migrateFile(filePath) {
  const original = readFileSync(filePath, 'utf8');
  let replaced = 0;

  const migrated = original.replace(PATTERN, (match, prefix, hex, opacity) => {
    const token = TOKEN_BY_HEX[hex.toLowerCase()];
    if (!token) return match;
    replaced += 1;
    return `${prefix}-${token}${opacity ? `/${opacity}` : ''}`;
  });

  if (migrated !== original) {
    writeFileSync(filePath, migrated);
  }
  return replaced;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(full, out);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

const root = process.cwd();
const files = walk(join(root, 'src'));
let total = 0;
let changedFiles = 0;
for (const file of files) {
  const count = migrateFile(file);
  if (count > 0) {
    total += count;
    changedFiles += 1;
    console.log(`${relative(root, file)}: ${count} substituições`);
  }
}
console.log(`\nTotal: ${total} substituições em ${changedFiles} arquivos`);