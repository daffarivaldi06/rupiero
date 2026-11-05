// Wide web Budget grid and Charts columns. Usage: node tests/e2e/budget-charts.e2e.js [url]
const puppeteer = require('puppeteer-core');
const { sleep, openApp, loadSample, createBudgets } = require('./helpers');
const out = require('./helpers').OUT;
const base = (process.argv[2] || require('./helpers').DEFAULT_URL).replace(/\/$/, '') + '/';
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};

/** Header, cards (surface background, 8px radius) and scroll width of the visible screen. */
const screen = (page) =>
  page.evaluate(() => {
    const visible = (e) => e.offsetParent !== null && !e.closest('[role=navigation]');
    const leaves = [...document.querySelectorAll('div')].filter((e) => visible(e) && e.children.length === 0).map((e) => e.textContent.trim());
    const cards = [...document.querySelectorAll('div')]
      .filter((e) => visible(e) && getComputedStyle(e).backgroundColor === 'rgb(251, 250, 246)' && getComputedStyle(e).borderTopLeftRadius === '8px')
      .map((c) => {
        const r = c.getBoundingClientRect();
        return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), first: c.innerText.split('\n')[0].trim(), text: c.innerText };
      });
    return {
      leaves,
      add: [...document.querySelectorAll('[role=button],button')].some((e) => visible(e) && e.textContent.trim() === '+ Add transaction'),
      back: [...document.querySelectorAll('[role=button],button,a')].some((e) => visible(e) && /back/i.test(e.getAttribute('aria-label') || '')),
      cards,
      scroll: { w: document.documentElement.scrollWidth, inner: window.innerWidth },
    };
  });
const clickVisible = (page, selector, label) =>
  page.evaluate(
    (selector, label) => {
      const el = [...document.querySelectorAll(selector)].filter((e) => e.offsetParent !== null).find((e) => (label ? e.textContent.trim() === label : true));
      el?.click();
      return !!el;
    },
    selector,
    label,
  );

(async () => {
  const browser = await puppeteer.launch({ executablePath: require('./helpers').chromePath(), headless: true });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('page error:', e.message));
  await page.setViewport({ width: 1280, height: 1000 });
  await openApp(page, base);
  await loadSample(page);
  await createBudgets(page, base, [['Rent', '600'], ['Transport', '100'], ['Bills', '100'], ['Food & Groceries', '300']]);

  // --- Budget ------------------------------------------------------------------------------------
  for (const width of [1024, 1280, 1920]) {
    await page.setViewport({ width, height: 1000 });
    await page.goto(base + 'budget', { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => /Copy from /.test(document.body.innerText), { timeout: 15000 });
    await sleep(1200);
    const s = await screen(page);
    check(`Budget ${width}px: header "Budget", month picker, add; no stack header or month row`, s.leaves.includes('Budget') && s.leaves.includes('Nov 2026') && s.add && !s.back && !s.leaves.includes('November 2026'), JSON.stringify({ add: s.add, back: s.back }));
    const xs = [...new Set(s.cards.map((c) => c.x))];
    const ws = s.cards.map((c) => c.w);
    check(`Budget ${width}px: cards in 2 equal columns`, s.cards.length === 8 && xs.length === 2 && Math.max(...ws) - Math.min(...ws) <= 1, `${s.cards.length} cards, x ${JSON.stringify(xs)}, w ${Math.min(...ws)}–${Math.max(...ws)}`);
    check(
      `Budget ${width}px: sorted by share used, no-budget categories last`,
      JSON.stringify(s.cards.map((c) => c.first)) === JSON.stringify(['Rent', 'Transport', 'Bills', 'Food & Groceries', 'Salary', 'Entertainment', 'Health', 'Other']),
      JSON.stringify(s.cards.map((c) => c.first)),
    );
    check(`Budget ${width}px: over and 80% warnings shown`, s.cards[0].text.includes('Over budget') && s.cards[1].text.includes('Almost spent'));
    check(`Budget ${width}px: no horizontal scroll`, s.scroll.w === s.scroll.inner, JSON.stringify(s.scroll));
    await page.screenshot({ path: `${out}/budget-${width}.png` });
  }
  await page.setViewport({ width: 1280, height: 1000 });
  await sleep(800);

  // Copy last month: go to December (empty), copy from November.
  await clickVisible(page, '[aria-label="Next month"]');
  await sleep(1000);
  let s = await screen(page);
  const setBefore = s.cards.filter((c) => /Set/.test(c.text)).length;
  await clickVisible(page, '[role=button],button', 'Copy from November');
  await sleep(1500);
  s = await screen(page);
  const setAfter = s.cards.filter((c) => /Set/.test(c.text)).length;
  check('"Copy from November" fills December', s.leaves.includes('Dec 2026') && setBefore === 8 && setAfter === 4, `cards with "Set": ${setBefore} → ${setAfter}`);
  await clickVisible(page, '[aria-label="Previous month"]');
  await sleep(1000);

  // A card opens the budget form.
  await page.evaluate(() => {
    const leaf = [...document.querySelectorAll('div')].find((e) => e.offsetParent !== null && !e.closest('[role=navigation]') && e.children.length === 0 && e.textContent.trim() === 'Health');
    leaf.closest('[role=button]').click();
  });
  await sleep(1200);
  check('a card opens the budget form', new URL(page.url()).pathname === '/budget-form', page.url());

  await page.goto(base + 'budget?month=2026-10', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => /Copy from /.test(document.body.innerText), { timeout: 15000 });
  await sleep(800);
  check('/budget?month=2026-10 opens October', (await screen(page)).leaves.includes('Oct 2026'));

  // --- Charts ------------------------------------------------------------------------------------
  for (const width of [1024, 1280, 1920]) {
    await page.setViewport({ width, height: 1000 });
    await page.goto(base + 'charts', { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => /Last 6 months/.test(document.body.innerText), { timeout: 15000 });
    await sleep(1200);
    s = await screen(page);
    check(`Charts ${width}px: header "Charts", month picker, add; no stack header or month row`, s.leaves.includes('Charts') && s.leaves.includes('Nov 2026') && s.add && !s.back && !s.leaves.includes('November 2026'));
    const [eur, idr] = s.cards;
    check(`Charts ${width}px: EUR and IDR side by side, equal widths`, s.cards.length === 2 && eur.first === 'EUR' && idr.first === 'IDR' && eur.y === idr.y && idr.x > eur.x && Math.abs(eur.w - idr.w) <= 1, JSON.stringify(s.cards.map((c) => ({ first: c.first, x: c.x, y: c.y, w: c.w }))));
    const sizes = await page.evaluate(() => {
      const visible = (e) => e.offsetParent !== null;
      const donuts = [...document.querySelectorAll('svg')].filter((e) => visible(e.parentElement) && e.getAttribute('width') === e.getAttribute('height') && Number(e.getAttribute('width')) > 60);
      const trendTitles = [...document.querySelectorAll('div')].filter((e) => visible(e) && e.children.length === 0 && e.textContent.trim() === 'Last 6 months');
      const trends = trendTitles.map((title) => Math.round(title.nextElementSibling.getBoundingClientRect().width));
      const legend = [...document.querySelectorAll('div')].find((e) => visible(e) && e.children.length === 0 && /^\d+%$/.test(e.textContent.trim()));
      return { donuts: donuts.map((d) => Number(d.getAttribute('width'))), trends, legendFont: legend ? getComputedStyle(legend).fontSize : null };
    });
    check(`Charts ${width}px: donuts 132px, trend at most 480px, legend text ≥ 12px`, sizes.donuts.length === 2 && sizes.donuts.every((d) => d === 132) && sizes.trends.length === 2 && sizes.trends.every((w) => w <= 480) && parseFloat(sizes.legendFont) >= 12, JSON.stringify(sizes));
    check(`Charts ${width}px: no horizontal scroll`, s.scroll.w === s.scroll.inner, JSON.stringify(s.scroll));
    await page.screenshot({ path: `${out}/charts-${width}.png` });
  }
  await page.setViewport({ width: 1280, height: 1000 });
  await sleep(800);
  await clickVisible(page, '[aria-label="Previous month"]');
  await sleep(1200);
  s = await screen(page);
  check('Charts month picker switches to October', s.leaves.includes('Oct 2026') && s.cards.every((c) => c.text.includes('Spending in October 2026')), JSON.stringify(s.cards.map((c) => c.text.split('\n')[1])));

  await browser.close();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures ? 1 : 0);
})();
