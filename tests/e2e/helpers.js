// Shared setup and steps for the headless Chrome checks in this folder (run them with `npm run test:e2e`).
const fs = require('fs');
const os = require('os');
const path = require('path');

/** The app under test: E2E_URL, or the Docker build on its default port (see the README). */
const DEFAULT_URL = process.env.E2E_URL || 'http://localhost:8080/';

/** Screenshots and pixel diffs (git-ignored). */
const OUT = path.join(__dirname, 'output');
fs.mkdirSync(OUT, { recursive: true });

/** Chrome or Chromium to drive: CHROME_PATH, else the usual install location for this system. */
function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = {
    win32: [
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ],
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'],
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  }[process.platform] || [];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error('Chrome not found: set CHROME_PATH to a Chrome or Chromium executable.');
  return found;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (page) => page.evaluate(() => document.body?.innerText ?? '').catch(() => '');

/** Opens the app and waits for the Dashboard (and the intro) to settle. */
async function openApp(page, base) {
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => /Current balance/.test(document.body.innerText), { timeout: 15000 });
  await sleep(2500);
}

/** Accepts the first-launch offer: the development seed (three months, EUR and IDR). */
async function loadSample(page) {
  await page.evaluate(() => [...document.querySelectorAll('[role=button],button')].find((e) => e.textContent.trim() === 'Load sample data')?.click());
  await page.waitForFunction(() => !/Try Rupiero with sample data/.test(document.body.innerText), { timeout: 10000 });
  await sleep(1500);
}

/** budgets: [[categoryName, eurLimitText], …], created one by one on /budget for the current month. */
async function createBudgets(page, base, budgets) {
  for (const [name, limit] of budgets) {
    await page.goto(base.replace(/\/$/, '') + '/budget', { waitUntil: 'networkidle0' });
    await page.waitForFunction((n) => document.body.innerText.includes(n), { timeout: 15000 }, name);
    await sleep(600);
    await page.evaluate((n) => {
      const row = [...document.querySelectorAll('[role=button]')].filter((e) => e.offsetParent !== null).find((e) => e.textContent.trim().startsWith(n));
      row.click();
    }, name);
    await page.waitForSelector('input', { visible: true, timeout: 10000 });
    await sleep(400);
    // The EUR limit field: its placeholder is the EUR example (300…); the IDR one is 1,500,000.
    const eur = await page.waitForSelector('input[placeholder^="300"]', { visible: true, timeout: 10000 });
    await eur.click({ clickCount: 3 });
    await eur.type(limit, { delay: 20 });
    await sleep(200);
    await page.evaluate(() => [...document.querySelectorAll('[role=button],button')].filter((e) => e.offsetParent !== null).find((e) => e.textContent.trim() === 'Save').click());
    await page.waitForFunction(() => !document.querySelector('input') || [...document.querySelectorAll('input')].every((i) => i.offsetParent === null), { timeout: 10000 });
    await sleep(400);
  }
}

/** One transfer through its form: [sent, received, fee, note] typed into the form's four fields, in order. */
async function createTransfer(page, base, values = ['100', '2000000', '1.50', 'Tuition']) {
  await page.goto(base.replace(/\/$/, '') + '/transfer', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => /Save transfer/.test(document.body.innerText), { timeout: 15000 });
  await sleep(800);
  const inputs = [];
  for (const input of await page.$$('input')) if (await input.isVisible()) inputs.push(input);
  for (let i = 0; i < values.length; i++) {
    await inputs[i].click({ clickCount: 3 });
    await inputs[i].type(values[i], { delay: 20 });
  }
  await page.evaluate(() => [...document.querySelectorAll('[role=button],button')].find((e) => e.offsetParent !== null && e.textContent.trim() === 'Save transfer').click());
  await sleep(1500);
}

/** Opens quick-add the way a user would at this width: the floating "+" (narrow) or the header button (wide). */
async function clickAdd(page) {
  const clicked = await page.evaluate(() => {
    const visible = (e) => e.offsetParent !== null;
    const fab = [...document.querySelectorAll('[aria-label="Add transaction"]')].find(visible);
    const header = [...document.querySelectorAll('[role=button],button')].find((e) => visible(e) && e.textContent.trim() === '+ Add transaction');
    const target = fab || header;
    target?.click();
    return !!target;
  });
  if (!clicked) throw new Error('No add control on screen');
}

/** Opens Settings: the header gear (narrow) or the sidebar item (wide, where the header has no gear). */
async function openSettings(page) {
  const clicked = await page.evaluate(() => {
    const visible = (e) => e.offsetParent !== null;
    const gear = [...document.querySelectorAll('[aria-label="Settings"]')].find(visible);
    const item = [...document.querySelectorAll('[role=navigation] [role=link]')].find((e) => visible(e) && e.textContent.trim() === 'Settings');
    const target = gear || item;
    target?.click();
    return !!target;
  });
  if (!clicked) throw new Error('No way to open Settings on screen');
}

module.exports = { DEFAULT_URL, OUT, chromePath, sleep, text, openApp, loadSample, createBudgets, createTransfer, clickAdd, openSettings };
