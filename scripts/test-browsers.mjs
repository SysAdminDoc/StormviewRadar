import { spawnSync } from 'node:child_process';

function run(args) {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(command, ['playwright', 'test', ...args], {
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
