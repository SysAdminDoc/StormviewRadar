import { spawnSync } from 'node:child_process';

function run(args) {
  const result = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...args], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

run(['--project=chromium', '--project=webkit-smoke']);

if (process.platform === 'win32') {
  console.log('Firefox smoke is CI-only on Windows hosts because Playwright Juggler teardown is unstable with Windows graphics processes.');
} else {
  run(['--project=firefox-smoke', '--workers=1']);
}
