// Runs the headless Chrome checks one after another and prints a summary; exits 1 if any fails.
//
//   npm run test:e2e                     against E2E_URL (default http://localhost:8080/)
//   npm run test:e2e -- <url>            against another build
//   npm run test:e2e:docker              builds the Docker image, runs it on E2E_PORT (default 8095), tests, stops it
//   npm run screenshots                  the same Docker steps, but writes the README screenshots to docs/screenshots
//
// Each check starts its own browser with a fresh profile, so the app always starts empty.
const { spawnSync } = require('child_process');
const path = require('path');

const SUITE = [
  ['sidebar.e2e.js'],
  ['web-demo.e2e.js'],
  ['keyboard.e2e.js', '1280'],
  ['keyboard.e2e.js', '800'],
  ['base-currency.e2e.js'],
  ['page-lifecycle.e2e.js'],
  ['dashboard-wide.e2e.js'],
  ['quickadd-modal.e2e.js'],
  ['transactions-table.e2e.js'],
  ['budget-charts.e2e.js'],
  ['fonts.e2e.js', 'wide'],
  ['repeated-loads.e2e.js', '10'],
  ['repeated-loads.e2e.js', '10', 'back'],
];

const args = process.argv.slice(2);
const docker = args.includes('--docker');
const screenshotsOnly = args.includes('screenshots');
const root = path.join(__dirname, '..', '..');
const sh = (cmd, cmdArgs, opts = {}) => spawnSync(cmd, cmdArgs, { stdio: 'inherit', cwd: root, shell: process.platform === 'win32', ...opts });

async function waitForServer(url) {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${url} did not answer within 60 s`);
}

(async () => {
  const port = process.env.E2E_PORT || '8095';
  const url = docker ? `http://localhost:${port}/` : args.find((a) => !a.startsWith('--') && a !== 'screenshots') || require('./helpers').DEFAULT_URL;
  const container = 'rupiero-e2e';

  if (docker) {
    if (sh('docker', ['build', '-t', container, '.']).status !== 0) process.exit(1);
    sh('docker', ['rm', '-f', container], { stdio: 'ignore' });
    if (sh('docker', ['run', '-d', '--rm', '--name', container, '-p', `${port}:8080`, container]).status !== 0) process.exit(1);
  }

  const results = [];
  try {
    await waitForServer(url);
    console.log(`\nTesting ${url}\n`);
    for (const [script, ...scriptArgs] of screenshotsOnly ? [['screenshots.js']] : SUITE) {
      const name = [script, ...scriptArgs].join(' ');
      console.log(`=== ${name} ===`);
      const started = Date.now();
      const { status } = spawnSync(process.execPath, [path.join(__dirname, script), url, ...scriptArgs], { stdio: 'inherit' });
      results.push({ name, ok: status === 0, seconds: Math.round((Date.now() - started) / 1000) });
    }
  } finally {
    if (docker) sh('docker', ['stop', container], { stdio: 'ignore' });
  }

  console.log('\nSummary');
  for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}  (${r.seconds} s)`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed === 0 ? `\nAll ${results.length} checks passed.` : `\n${failed} of ${results.length} checks failed.`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
