import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('vendor/nexrad', { recursive: true });
await build({
  entryPoints: ['src/level2-worker.js'],
  outfile: 'vendor/nexrad/level2-worker.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome100', 'firefox100', 'safari16'],
  alias: {
    zlib: './src/zlib-browser-shim.js'
  },
  legalComments: 'eof'
});

await Promise.all([
  copyFile('node_modules/nexrad-level-2-data/license', 'vendor/nexrad/LICENSE-nexrad-level-2-data.txt'),
  copyFile('node_modules/seek-bzip/LICENSE', 'vendor/nexrad/LICENSE-seek-bzip.txt'),
  copyFile('node_modules/buffer/LICENSE', 'vendor/nexrad/LICENSE-buffer.txt'),
  copyFile('node_modules/base64-js/LICENSE', 'vendor/nexrad/LICENSE-base64-js.txt'),
  copyFile('node_modules/ieee754/LICENSE', 'vendor/nexrad/LICENSE-ieee754.txt')
]);
