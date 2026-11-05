// Web demo: sample data offer, second-tab message + reload on Try again, Android-only settings hidden.
// Usage: node tests/e2e/web-demo.e2e.js [url]   (each case in a fresh browser profile)
const puppeteer = require('puppeteer-core');
const out = require('./helpers').OUT;
const url = process.argv[2] || require('./helpers').DEFAULT_URL;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};
const launch = () => puppeteer.launch({ executablePath: require('./helpers').chromePath(), headless: true });
const OFFER = 'Try Rupiero with sample data';
const text = (page) => page.evaluate(() => document.body?.innerText ?? '').catch(() => '');
const ready = async (page) => {
  for (let t = 0; t < 100; t++) {
    const s = await text(page);
    if (/could not open/.test(s)) return 'could not open';
    if (/Current balance/.test(s)) return 'ok';
    await sleep(100);
  }
  return 'timeout';
};
const open = async (browser) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await ready(page);
  await sleep(1500);
  return page;
};
const clickText = (page, label) =>
  page.evaluate((label) => {
    const el = [...document.querySelectorAll('[role=button],[role=link],button')].filter((e) => e.offsetParent !== null).find((e) => e.textContent.trim() === label);
    el?.click();
    return !!el;
  }, label);
/** The EUR and IDR hero balances under "Current balance". */
const heroBalances = async (page) => {
  const lines = (await text(page)).split('\n').map((l) => l.trim());
  const i = lines.indexOf('Current balance');
  return lines.slice(i + 1, i + 5).join(' ');
};

(async () => {
  // --- A. Load sample data ----------------------------------------------------------------------
  let browser = await launch();
  let page = await open(browser);
  check('A: first launch offers sample data', (await text(page)).includes(OFFER));
  await page.screenshot({ path: `${out}/demo-01-offer.png` });
  check('A: "Load sample data" button', await clickText(page, 'Load sample data'));
  await sleep(2000);
  let s = await text(page);
  check('A: offer gone after loading', !s.includes(OFFER));
  check('A: balances filled from the sample data', !/€0\.00 IDR Rp[\s\u00a0]0/.test(await heroBalances(page)), await heroBalances(page));
  check('A: sample cash account present', /Cash/.test(s));
  await page.screenshot({ path: `${out}/demo-02-loaded.png` });
  await page.reload({ waitUntil: 'networkidle0' });
  await ready(page);
  await sleep(1200);
  check('A: offer still gone after a reload', !(await text(page)).includes(OFFER));
  await browser.close();

  // --- B. No thanks ---------------------------------------------------------------------------
  browser = await launch();
  page = await open(browser);
  check('B: "No thanks" button', await clickText(page, 'No thanks'));
  await sleep(1000);
  check('B: offer gone, database still empty', !(await text(page)).includes(OFFER) && /€0\.00 IDR Rp[\s\u00a0]0/.test(await heroBalances(page)), await heroBalances(page));
  await page.reload({ waitUntil: 'networkidle0' });
  await ready(page);
  await sleep(1200);
  check('B: after a reload the offer does not come back and the database is empty', !(await text(page)).includes(OFFER) && /€0\.00 IDR Rp[\s\u00a0]0/.test(await heroBalances(page)), await heroBalances(page));
  await browser.close();

  // --- C. Using the app instead ----------------------------------------------------------------
  browser = await launch();
  page = await open(browser);
  await require('./helpers').clickAdd(page);
  await page.waitForSelector('[aria-label="Delete one"]');
  await sleep(500);
  await page.keyboard.type('4.2');
  await page.evaluate(() => [...document.querySelectorAll('[role=radio]')].filter((e) => e.offsetParent !== null).find((e) => e.textContent.trim() === 'Transport').click());
  await page.keyboard.press('Enter');
  await sleep(1500);
  check('C: recording a transaction ends the offer', !(await text(page)).includes(OFFER));
  await page.reload({ waitUntil: 'networkidle0' });
  await ready(page);
  await sleep(1200);
  check('C: still no offer after a reload', !(await text(page)).includes(OFFER));

  // --- E. Settings on the web (same browser) ----------------------------------------------------
  await require('./helpers').openSettings(page);
  await sleep(1000);
  s = await text(page);
  check('E: no widget setting on web', !s.includes('Hide in the widget too'));
  check('E: no Data section (backup, import, CSV) on web', !/Export backup|Export CSV|Import backup|\nData\n/.test(s));
  check('E: "Hide balances" still there', /Hide balances/.test(s));
  await page.screenshot({ path: `${out}/demo-03-settings.png`, fullPage: true });

  // --- D. Second tab ---------------------------------------------------------------------------
  const second = await browser.newPage();
  await second.setViewport({ width: 1280, height: 900 });
  await second.goto(url, { waitUntil: 'networkidle0' });
  await sleep(2500);
  s = await text(second);
  check('D: second tab says Rupiero is open in another tab', s.includes('Rupiero is open in another tab. Close it, then try again.'), s.replace(/\n/g, ' | ').slice(0, 160));
  check('D: no technical details for that case', !s.includes('Details:'));
  await second.screenshot({ path: `${out}/demo-04-second-tab.png` });
  await page.close();
  await sleep(500);
  await second.evaluate(() => {
    window.__beforeRetry = true;
  });
  await Promise.all([second.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null), clickText(second, 'Try again')]);
  const reloaded = await second.evaluate(() => window.__beforeRetry !== true);
  const state = await ready(second);
  await sleep(1000);
  check('D: "Try again" reloads the page', reloaded);
  check('D: after the reload the app opens with its data', state === 'ok' && !(await text(second)).includes(OFFER), state);
  await browser.close();

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures ? 1 : 0);
})();
