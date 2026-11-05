// Back/forward cache restore, second tab, data persistence. Usage: node tests/e2e/page-lifecycle.e2e.js [url]
const puppeteer = require('puppeteer-core');
const url = process.argv[2] || require('./helpers').DEFAULT_URL;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};
const appState = async (page) => {
  for (let t = 0; t < 100; t++) {
    const text = await page.evaluate(() => document.body?.innerText ?? '').catch(() => '');
    if (/could not open/.test(text)) return 'could not open';
    if (/Current balance/.test(text)) return 'ok';
    await sleep(100);
  }
  return 'timeout';
};
const expense = async (page) => {
  const lines = (await page.evaluate(() => document.body.innerText)).split('\n').map((l) => l.trim());
  const i = lines.indexOf('Cash flow November 2026');
  return lines[i + 5]; // EUR expense cell
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: require('./helpers').chromePath(), headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // --- Persistence: save a transaction, reload ---------------------------------------------------
  await page.goto(url, { waitUntil: 'networkidle0' });
  check('first load opens', (await appState(page)) === 'ok');
  await sleep(1500);
  await require('./helpers').clickAdd(page);
  await page.waitForSelector('[aria-label="Delete one"]');
  await sleep(500);
  await page.keyboard.type('9.5');
  await page.evaluate(() => [...document.querySelectorAll('[role=radio]')].filter((e) => e.offsetParent !== null).find((e) => e.textContent.trim() === 'Transport').click());
  await page.keyboard.press('Enter');
  await sleep(1500);
  check('transaction saved: expense -€9.50', (await expense(page)) === '-€9.50', await expense(page));
  await page.reload({ waitUntil: 'networkidle0' });
  check('after a reload the app opens', (await appState(page)) === 'ok');
  await sleep(800);
  check('after a reload the transaction is still there', (await expense(page)) === '-€9.50', await expense(page));

  // --- Back/forward cache: leave for another page, come back ---------------------------------------
  const cdp = await page.createCDPSession();
  await page.evaluate(() => {
    window.__sameDocument = true;
  });
  await page.goto('data:text/html,<p>elsewhere</p>');
  await sleep(500);
  const restore = new Promise((resolve) => cdp.on('Page.backForwardCacheNotUsed', (e) => resolve(`not used: ${JSON.stringify(e.notRestoredExplanations?.map((x) => x.reason))}`)));
  await cdp.send('Page.enable');
  await page.goBack({ waitUntil: 'networkidle0' });
  const state = await appState(page);
  const fresh = await page.evaluate(() => window.__sameDocument !== true);
  const navType = await page.evaluate(() => performance.getEntriesByType('navigation')[0]?.type);
  const bf = await Promise.race([restore, sleep(300).then(() => 'restored from the cache')]);
  check('after leaving and coming back (back button) the app opens', state === 'ok', state);
  check('the restored page reloaded itself (fresh document)', fresh, `navigation type ${navType}; ${bf}`);
  await sleep(800);
  check('after coming back the transaction is still there', (await expense(page)) === '-€9.50', await expense(page));

  // --- Second tab ----------------------------------------------------------------------------------
  const second = await browser.newPage();
  await second.setViewport({ width: 1280, height: 900 });
  await second.goto(url, { waitUntil: 'networkidle0' });
  const secondState = await appState(second);
  check('a second tab shows "could not open"', secondState === 'could not open', secondState);
  await page.close();
  await sleep(500);
  await second.evaluate(() => [...document.querySelectorAll('[role=button],button')].find((e) => /Try again/.test(e.textContent))?.click());
  const retried = await appState(second);
  check('after the first tab closes, "Try again" opens the app', retried === 'ok', retried);
  await sleep(800);
  check('the second tab sees the saved transaction', (await expense(second)) === '-€9.50', await expense(second));

  await browser.close();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures ? 1 : 0);
})();
