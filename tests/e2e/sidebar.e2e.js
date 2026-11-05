// Web sidebar: wide layout, active item, hover/cursor, URLs, browser back/forward, reload, resize.
// Usage: node tests/e2e/sidebar.e2e.js [url]
const puppeteer = require('puppeteer-core');
const out = require('./helpers').OUT;
const base = (process.argv[2] || require('./helpers').DEFAULT_URL).replace(/\/$/, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};
const LINE = 'rgb(217, 212, 199)';

(async () => {
  const browser = await puppeteer.launch({ executablePath: require('./helpers').chromePath(), headless: true });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('page error:', e.message));
  await page.setViewport({ width: 1280, height: 900 });

  /** Sidebar geometry and items: label, background, cursor, box. */
  const sidebar = () =>
    page.evaluate(() => {
      const nav = [...document.querySelectorAll('[role=navigation]')].find((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
      if (!nav) return null;
      const box = nav.getBoundingClientRect();
      const items = [...nav.querySelectorAll('a,[role=link]')].map((e) => {
        const r = e.getBoundingClientRect();
        return { label: e.textContent.trim(), bg: getComputedStyle(e).backgroundColor, cursor: getComputedStyle(e).cursor, top: Math.round(r.top), x: Math.round(r.left) };
      });
      let drawer = nav.parentElement;
      while (drawer && Math.round(drawer.getBoundingClientRect().width) === Math.round(box.width)) drawer = drawer.parentElement;
      return { x: Math.round(box.left), width: Math.round(drawer.getBoundingClientRect().width), visible: box.right > 0 && box.width > 0, items };
    });
  const activeItems = async () => ((await sidebar())?.items ?? []).filter((i) => i.bg === 'rgb(28, 27, 25)').map((i) => i.label);
  /** Left edge of the visible stack screen's content (its header or the Dashboard header). */
  const contentLeft = () =>
    page.evaluate(() => {
      const nav = document.querySelector('[role=navigation]');
      const candidates = [...document.querySelectorAll('[aria-label="Settings"], [aria-label="Previous month"], h1, [role=heading]')].filter((e) => !nav || !nav.contains(e));
      const visible = candidates.find((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.right > 0 && r.left < window.innerWidth && getComputedStyle(e).visibility !== 'hidden';
      });
      return { headerLeft: visible ? Math.round(visible.getBoundingClientRect().left) : null, scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth };
    });
  const path = () => new URL(page.url()).pathname;
  const clickItem = (label) =>
    page.evaluate((label) => {
      const el = [...document.querySelectorAll('[role=navigation] a, [role=navigation] [role=link]')].find((e) => e.textContent.trim() === label);
      el?.click();
      return !!el;
    }, label);
  const title = () => page.evaluate(() => document.title);
  /** Load a URL and wait until the sidebar can be clicked (the intro overlay is gone); returns ms. */
  const openUrl = async (p) => {
    const t0 = Date.now();
    await page.goto(base + p, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => {
      const link = document.querySelector('[role=navigation] [role=link]');
      if (!link) return false;
      const r = link.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!hit && link.contains(hit);
    }, { timeout: 10000, polling: 50 }).catch(async (e) => {
      await page.screenshot({ path: `${out}/sidebar-timeout${p.replace(/\//g, '-')}.png` });
      console.log('  timeout on', p, 'url now', page.url(), 'title', await title());
      console.log('  text:', (await page.evaluate(() => document.body.innerText)).slice(0, 200).replace(/\n/g, ' | '));
      throw e;
    });
    return Date.now() - t0;
  };

  // --- Wide: layout ------------------------------------------------------------------------------
  console.log(`(/ usable after ${await openUrl('/')} ms)`);
  await sleep(1000);
  let s = await sidebar();
  check('sidebar at x=0, 240px wide', !!s && s.x === 0 && s.width === 240, JSON.stringify(s && { x: s.x, width: s.width }));
  check('items: Dashboard, Transactions, Budget, Charts, Settings', JSON.stringify(s?.items.map((i) => i.label)) === JSON.stringify(['Dashboard', 'Transactions', 'Budget', 'Charts', 'Settings']), JSON.stringify(s?.items.map((i) => i.label)));
  const settingsTop = s?.items.find((i) => i.label === 'Settings')?.top ?? 0;
  check('Settings pinned at the bottom', settingsTop > 900 - 100, `top ${settingsTop}px of 900`);
  check('wordmark at the top of the sidebar', await page.evaluate(() => !!document.querySelector('[role=navigation] [aria-label="Rupiero"]')));
  check('Dashboard is highlighted at /', JSON.stringify(await activeItems()) === '["Dashboard"]' && path() === '/', `${JSON.stringify(await activeItems())} ${path()}`);
  check('every item has a pointer cursor', !!s && s.items.every((i) => i.cursor === 'pointer'), JSON.stringify(s?.items.map((i) => i.cursor)));
  let c = await contentLeft();
  check('content starts right of the sidebar, no horizontal scroll', c.headerLeft !== null && c.headerLeft >= 240 && c.scrollWidth === c.innerWidth, JSON.stringify(c));
  await page.screenshot({ path: `${out}/sidebar-01-dashboard.png` });

  // Hover.
  const box = await page.evaluate(() => {
    const el = [...document.querySelectorAll('[role=navigation] a, [role=navigation] [role=link]')].find((e) => e.textContent.trim() === 'Budget');
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.move(box.x, box.y);
  await sleep(200);
  s = await sidebar();
  check('hover highlights the item under the mouse', s?.items.find((i) => i.label === 'Budget')?.bg === LINE, s?.items.find((i) => i.label === 'Budget')?.bg);
  await page.screenshot({ path: `${out}/sidebar-02-hover.png` });
  await page.mouse.move(700, 450);

  // --- Navigation, URLs, history ------------------------------------------------------------------
  const steps = [['Transactions', '/transactions'], ['Charts', '/charts'], ['Budget', '/budget'], ['Settings', '/settings']];
  for (const [label, expected] of steps) {
    await clickItem(label);
    await sleep(700);
    check(`click ${label} → ${expected}, ${label} highlighted`, path() === expected && JSON.stringify(await activeItems()) === JSON.stringify([label]), `${path()} ${JSON.stringify(await activeItems())} title="${await title()}"`);
  }
  await page.screenshot({ path: `${out}/sidebar-03-settings.png` });

  await page.goBack();
  await sleep(700);
  check('browser back → /budget', path() === '/budget' && JSON.stringify(await activeItems()) === '["Budget"]', `${path()} ${JSON.stringify(await activeItems())}`);
  await page.goBack();
  await sleep(700);
  check('browser back again → /charts', path() === '/charts' && JSON.stringify(await activeItems()) === '["Charts"]', `${path()} ${JSON.stringify(await activeItems())}`);
  await page.goForward();
  await sleep(700);
  check('browser forward → /budget', path() === '/budget' && JSON.stringify(await activeItems()) === '["Budget"]', `${path()} ${JSON.stringify(await activeItems())}`);

  // Dashboard via the sidebar goes back to the bottom of the stack (no duplicate Dashboard).
  await clickItem('Dashboard');
  await sleep(700);
  check('click Dashboard → /', path() === '/' && JSON.stringify(await activeItems()) === '["Dashboard"]', `${path()} ${JSON.stringify(await activeItems())}`);

  // A detail screen keeps its section highlighted.
  await clickItem('Transactions');
  await sleep(700);
  await page.evaluate(() => [...document.querySelectorAll('[role=radio],[role=button]')].filter((e) => e.offsetParent !== null).find((e) => /^(Food|All|Transport)/.test(e.textContent.trim()))?.click());
  await sleep(300);

  // Reload on a section URL.
  const budgetMs = await openUrl('/budget');
  await sleep(300);
  check(`reload on /budget is usable without the 4 s intro fallback (${budgetMs} ms)`, budgetMs < 3000);
  check('reload on /budget opens Budget, highlighted', path() === '/budget' && JSON.stringify(await activeItems()) === '["Budget"]' && (await title()).includes('Budget'), `${path()} ${JSON.stringify(await activeItems())} title="${await title()}"`);
  await page.goBack();
  await sleep(500);

  // --- Resize across 1024px ------------------------------------------------------------------------
  console.log(`(/charts usable after ${await openUrl('/charts')} ms)`);
  await sleep(500);
  for (const width of [1280, 900, 1280, 600, 1100, 1023, 1024]) {
    await page.setViewport({ width, height: 900 });
    await sleep(800);
    s = await sidebar();
    c = await contentLeft();
    const wide = width >= 1024;
    const ok = wide
      ? !!s && s.visible && s.x === 0 && s.width === 240 && c.headerLeft >= 240
      : (!s || !s.visible || s.width === 0 || s.x + s.width <= 0) && c.headerLeft !== null && c.headerLeft < 240;
    check(
      `${width}px: ${wide ? 'sidebar shown, content beside it' : 'no sidebar, content full width'}, still /charts, no horizontal scroll`,
      ok && path() === '/charts' && c.scrollWidth === c.innerWidth,
      `sidebar ${JSON.stringify(s && { x: s.x, width: s.width, visible: s.visible })}, content ${JSON.stringify(c)}, ${path()}`,
    );
    await page.screenshot({ path: `${out}/sidebar-resize-${width}.png` });
  }

  await browser.close();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures ? 1 : 0);
})();
