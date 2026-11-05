// Like a real session: navigate inside the app, then load the page again in the same tab. Only uses
// controls that exist on both builds (Dashboard rows, the gear, the header back arrow).
// Usage: node tests/e2e/repeated-loads.e2e.js [url] [rounds] [back]
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const [url = require('./helpers').DEFAULT_URL, rounds = '8', historyBack] = process.argv.slice(2);
  const browser = await puppeteer.launch({ executablePath: require('./helpers').chromePath(), headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const visibleClick = (pred) =>
    page.evaluate((src) => {
      const match = new Function('e', `return (${src})(e)`);
      const el = [...document.querySelectorAll('[role=button],[role=link],button,a')].filter((e) => e.offsetParent !== null).find((e) => match(e));
      el?.click();
      return !!el;
    }, pred.toString());
  const waitOpen = async () => {
    for (let t = 0; t < 80; t++) {
      const text = await page.evaluate(() => document.body.innerText);
      if (/could not open/.test(text)) return 'FAILED';
      if (/Current balance|Cash flow|Spending in/.test(text)) return 'ok';
      await sleep(100);
    }
    return 'timeout';
  };
  const results = [];
  for (let i = 0; i < Number(rounds); i++) {
    await page.goto(url, { waitUntil: 'networkidle0' });
    const state = await waitOpen();
    results.push(state);
    if (state !== 'ok') continue;
    await sleep(1200);
    await visibleClick((e) => e.textContent.trim().startsWith('All transactions'));
    await sleep(500);
    await visibleClick((e) => /back/i.test(e.getAttribute('aria-label') || ''));
    await sleep(500);
    await visibleClick((e) => e.getAttribute('aria-label') === 'Settings');
    await sleep(500);
    if (historyBack) {
      await page.goBack().catch(() => {});
      await sleep(500);
    }
  }
  console.log(`${url}${historyBack ? ' (+history back)' : ''} ×${rounds}: ${results.join(' ')}  → ${results.filter((r) => r !== 'ok').length} failed`);
  await browser.close();
  process.exit(results.every((r) => r === "ok") ? 0 : 1);
})();
