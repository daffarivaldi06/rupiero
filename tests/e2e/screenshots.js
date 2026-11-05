// Screenshots of the web build for the README, with sample data, a few budgets and a transfer.
// Usage: node tests/e2e/screenshots.js [url] [outDir]   (outDir defaults to docs/screenshots)
// Or, against a fresh Docker build: npm run screenshots
const path = require('path');
const puppeteer = require('puppeteer-core');
const { DEFAULT_URL, chromePath, sleep, openApp, loadSample, createBudgets, createTransfer, clickAdd } = require('./helpers');

const base = (process.argv[2] || DEFAULT_URL).replace(/\/$/, '') + '/';
const outDir = process.argv[3] || path.join(__dirname, '..', '..', 'docs', 'screenshots');
const WIDE = { width: 1440, height: 900 };
const NARROW = { width: 390, height: 844, deviceScaleFactor: 2 };

(async () => {
  const browser = await puppeteer.launch({ executablePath: chromePath(), headless: true });
  const page = await browser.newPage();
  await page.setViewport(WIDE);

  await openApp(page, base);
  await loadSample(page);
  await createBudgets(page, base, [['Rent', '600'], ['Transport', '100'], ['Bills', '100'], ['Food & Groceries', '300']]);
  await createTransfer(page, base);

  const shoot = async (name, url, waitFor) => {
    await page.goto(base + url, { waitUntil: 'networkidle0' });
    await page.waitForFunction((pattern) => new RegExp(pattern).test(document.body.innerText), { timeout: 15000 }, waitFor);
    await sleep(3000); // intro, count-up, ECB rate
    await page.mouse.move(0, 0);
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    console.log(`${name}.png`);
  };

  await shoot('dashboard-wide', '', 'Recent transactions');
  await shoot('transactions-table', 'transactions', 'Description');
  await shoot('budget', 'budget', 'Copy from ');
  await shoot('charts', 'charts', 'Last 6 months');

  // The quick-add dialog, part-way through adding an expense.
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => /Recent transactions/.test(document.body.innerText), { timeout: 15000 });
  await sleep(2500);
  await clickAdd(page);
  await page.waitForSelector('[aria-label="Delete one"]', { visible: true });
  await sleep(600);
  await page.keyboard.type('12.5');
  await page.evaluate(() => [...document.querySelectorAll('[role=dialog] [role=radio]')].find((e) => e.textContent.trim() === 'Food & Groceries')?.click());
  await sleep(600);
  await page.mouse.move(0, 0);
  await page.screenshot({ path: path.join(outDir, 'quick-add.png') });
  console.log('quick-add.png');
  await page.keyboard.press('Escape');

  // The phone layout, same data.
  await page.setViewport(NARROW);
  await shoot('dashboard-narrow', '', 'Current balance');

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
