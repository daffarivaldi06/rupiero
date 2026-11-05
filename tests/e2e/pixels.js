// Below 1024px the web app must look exactly as on demo/develop. Pixel-compare Dashboard and Settings.
// Usage: node tests/e2e/pixels.js <baselineUrl> <url> [sample|budgets]
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const { createBudgets, openApp } = require('./helpers');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [developUrl, branchUrl, withSample] = process.argv.slice(2);

async function shoot(url, width, screen) {
  const browser = await puppeteer.launch({ executablePath: require('./helpers').chromePath(), headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width, height: 2400 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => /Current balance/.test(document.body.innerText), { timeout: 10000 });
  await sleep(2500); // intro, count-up, ECB rate
  if (withSample) {
    await page.evaluate(() => [...document.querySelectorAll('[role=button],button')].find((e) => e.textContent.trim() === 'Load sample data')?.click());
    await page.waitForFunction(() => !/Try Rupiero with sample data/.test(document.body.innerText), { timeout: 10000 });
    await sleep(2000);
    await page.evaluate(() => window.scrollTo(0, 0));
    if (withSample === 'budgets') {
      await createBudgets(page, url, [['Rent', '600'], ['Transport', '100'], ['Bills', '100'], ['Food & Groceries', '300']]);
      await openApp(page, url);
    }
  }
  if (screen === 'sheet') {
    await page.click('[aria-label="Add transaction"]');
    await page.waitForSelector('[aria-label="Delete one"]', { visible: true });
    await sleep(1500);
  }
  if (screen === 'transactions') {
    await page.evaluate(() => [...document.querySelectorAll('[role=button]')].find((e) => e.offsetParent !== null && e.textContent.trim().startsWith('All transactions')).click());
    await page.waitForFunction(() => /All accounts/.test(document.body.innerText), { timeout: 10000 });
    await sleep(1500);
  }
  if (screen === 'budget' || screen === 'charts') {
    await page.goto(url.replace(/\/$/, '') + '/' + screen, { waitUntil: 'networkidle0' });
    await page.waitForFunction((s) => (s === 'budget' ? /Copy from /.test(document.body.innerText) : /Last 6 months|No spending to chart/.test(document.body.innerText)), { timeout: 15000 }, screen);
    await sleep(2500);
  }
  if (screen === 'settings') {
    await page.click('[aria-label="Settings"]');
    await sleep(1500);
  }
  await page.mouse.move(0, 0);
  const png = PNG.sync.read(await page.screenshot({ fullPage: true }));
  await browser.close();
  return png;
}

(async () => {
  let failures = 0;
  for (const width of [390, 800, 1023]) {
    for (const screen of ['dashboard', 'settings', 'sheet', 'transactions', 'budget', 'charts']) {
      const a = await shoot(developUrl, width, screen);
      const b = await shoot(branchUrl, width, screen);
      const diff = new PNG({ width: a.width, height: a.height });
      const changed = a.width === b.width && a.height === b.height ? pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0 }) : -1;
      fs.writeFileSync(`${require('./helpers').OUT}/compact-${width}-${screen}${withSample ? '-sample' : ''}-branch.png`, PNG.sync.write(b));
      if (changed) fs.writeFileSync(`${require('./helpers').OUT}/compact-${width}-${screen}${withSample ? '-sample' : ''}-diff.png`, PNG.sync.write(diff));
      console.log(`${changed === 0 ? 'PASS' : 'FAIL'}  ${width}px ${screen}: ${changed} pixel(s) differ from demo/develop`);
      if (changed !== 0) failures++;
    }
  }
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
})();
