import { cpSync, rmSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const pdfjsDistPath = dirname(require.resolve('pdfjs-dist/package.json'));
const src = join(pdfjsDistPath, 'wasm');
const dest = new URL('./public/wasm', import.meta.url).pathname;

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
