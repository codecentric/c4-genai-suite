import { cpSync, mkdirSync, rmSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const pdfjsDistPath = dirname(require.resolve('pdfjs-dist/package.json'));
const src = join(pdfjsDistPath, 'wasm');

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dest = join(scriptDir, 'public', 'wasm');

mkdirSync(dirname(dest), { recursive: true });
rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
