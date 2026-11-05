// Wide web Transactions table: header, columns, rows = narrow list, transfers, hover, editor, filters, month, URLs.
// Usage: node tests/e2e/transactions-table.e2e.js [url]
const puppeteer = require('puppeteer-core');
const { sleep, openApp, loadSample } = require('./helpers');
const out = require('./helpers').OUT;
const base = (process.argv[2] || require('./helpers').DEFAULT_URL).replace(/\/$/, '') + '/';
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};
const LINE = 'rgb(217, 212, 199)';

/** Table rows as data: cells, amount box, background, cursor. */
const table = (page) =>
  page.evaluate(() => {
    const visible = (e) => e.offsetParent !== null;
    const rows = [...document.querySelectorAll('[role=row]')].filter((r) => visible(r) && !r.querySelector('[role=columnheader]'));
    const head = [...document.querySelectorAll('[role=columnheader]')].filter(visible).map((h) => h.innerText.trim());
    return {
      head,
      rows: rows.map((r) => {
        const cells = [...r.querySelectorAll('[role=cell]')];
        const amountText = cells[4] ? [...cells[4].querySelectorAll('div')].find((e) => e.children.length === 0 && /[€]|Rp/.test(e.textContent)) : null;
        const ar = amountText?.getBoundingClientRect();
        return {
          cells: cells.map((c) => c.innerText.replace(/\n/g, ' / ').trim()),
          amountRight: ar ? Math.round(ar.right) : null,
          amountAlign: amountText ? getComputedStyle(amountText).textAlign : null,
          tabular: amountText ? getComputedStyle(amountText).fontVariantNumeric : null,
          bg: getComputedStyle(r).backgroundColor,
          cursor: getComputedStyle(r).cursor,
        };
      }),
      scroll: { w: document.documentElement.scrollWidth, inner: window.innerWidth },
    };
  });
const listAmounts = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[role=button]')]
      .filter((b) => b.offsetParent !== null && !b.closest('[role=navigation]'))
      .map((b) => (b.innerText.match(/[+-](€|Rp)[\s\u00a0]?[\d.,]+/) || [])[0])
      .filter(Boolean),
  );
const clickChip = (page, label) =>
  page.evaluate((label) => {
    const el = [...document.querySelectorAll('[role=radio]')].filter((e) => e.offsetParent !== null).find((e) => e.textContent.trim() === label);
    el?.click();
    return !!el;
  }, label);

(async () => {
  const browser = await puppeteer.launch({ executablePath: require('./helpers').chromePath(), headless: true });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('page error:', e.message));
  await page.setViewport({ width: 1280, height: 1000 });
  await openApp(page, base);
  await loadSample(page);

  // A transfer with a fee and a note, through its form.
  await page.goto(base + 'transfer', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => /Save transfer/.test(document.body.innerText), { timeout: 15000 });
  await sleep(800);
  const inputs = [];
  for (const input of await page.$$('input')) if (await input.isVisible()) inputs.push(input);
  const values = ['100', '2000000', '1.50', 'Tuition'];
  for (let i = 0; i < 4; i++) {
    await inputs[i].click({ clickCount: 3 });
    await inputs[i].type(values[i], { delay: 20 });
  }
  await page.evaluate(() => [...document.querySelectorAll('[role=button],button')].find((e) => e.offsetParent !== null && e.textContent.trim() === 'Save transfer').click());
  await sleep(1500);

  // --- Wide table ----------------------------------------------------------------------------
  await page.goto(base + 'transactions', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelectorAll('[role=row]').length > 2, { timeout: 15000 });
  await sleep(1200);
  const header = await page.evaluate(() => {
    const visible = (e) => e.offsetParent !== null && !e.closest('[role=navigation]');
    const leaves = [...document.querySelectorAll('div')].filter((e) => visible(e) && e.children.length === 0).map((e) => e.textContent.trim());
    return {
      title: leaves.includes('Transactions'),
      monthShort: leaves.includes('Nov 2026'),
      inListMonth: leaves.includes('November 2026'),
      add: [...document.querySelectorAll('[role=button],button')].some((e) => visible(e) && e.textContent.trim() === '+ Add transaction'),
      back: [...document.querySelectorAll('[role=button],button,a')].some((e) => visible(e) && /back/i.test(e.getAttribute('aria-label') || '')),
    };
  });
  check('desktop header: title, month picker, "+ Add transaction"', header.title && header.monthShort && header.add, JSON.stringify(header));
  check('no stack header (back arrow) and no in-list month row', !header.back && !header.inListMonth, JSON.stringify(header));

  let tb = await table(page);
  check('columns: Date | Description | Category | Account | Amount', JSON.stringify(tb.head) === JSON.stringify(['Date', 'Description', 'Category', 'Account', 'Amount']), JSON.stringify(tb.head));
  const rights = [...new Set(tb.rows.map((r) => r.amountRight))];
  check('amounts right-aligned on one edge, tabular digits', rights.length === 1 && tb.rows.every((r) => r.amountAlign === 'right' && r.tabular === 'tabular-nums'), `right edges ${JSON.stringify(rights)}; ${tb.rows[0]?.amountAlign} ${tb.rows[0]?.tabular}`);
  const transfers = tb.rows.filter((r) => r.cells[2] === 'Transfer');
  check(
    'transfer readable: both sides with their own account and amount, plus the fee',
    transfers.length === 3 &&
      transfers.some((r) => /Transfer to IDR account \/ Tuition/.test(r.cells[1]) && r.cells[3] === 'EUR account' && /-€100\.00/.test(r.cells[4])) &&
      transfers.some((r) => /Transfer from EUR account/.test(r.cells[1]) && r.cells[3] === 'IDR account' && /\+Rp[\s\u00a0]2,000,000/.test(r.cells[4])) &&
      transfers.some((r) => /Transfer fee \/ EUR account → IDR account/.test(r.cells[1]) && /-€1\.50/.test(r.cells[4])),
    JSON.stringify(transfers.map((r) => r.cells)),
  );
  check('content at most 1200px, no horizontal scroll', tb.scroll.w === tb.scroll.inner, JSON.stringify(tb.scroll));
  const wideAmounts = tb.rows.map((r) => r.cells[4].replace(/[\s\u00a0]/g, ''));
  await page.screenshot({ path: `${out}/tx-01-table.png` });

  // Hover and cursor.
  const firstRow = await page.evaluate(() => {
    const r = [...document.querySelectorAll('[role=row]')].find((e) => e.offsetParent !== null && !e.querySelector('[role=columnheader]')).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.move(firstRow.x, firstRow.y);
  await sleep(200);
  tb = await table(page);
  check('hover highlights the row, pointer cursor', tb.rows[0].bg === LINE && tb.rows.every((r) => r.cursor === 'pointer'), `${tb.rows[0].bg} ${tb.rows[0].cursor}`);
  await page.mouse.move(5, 500);

  // Clicking a row opens the existing editor.
  const clickRow = (pred) =>
    page.evaluate((src) => {
      const match = new Function('cells', `return (${src})(cells)`);
      const row = [...document.querySelectorAll('[role=row]')].filter((e) => e.offsetParent !== null && !e.querySelector('[role=columnheader]')).find((r) => match([...r.querySelectorAll('[role=cell]')].map((c) => c.innerText)));
      row?.click();
      return !!row;
    }, pred.toString());
  await clickRow((cells) => cells[2] !== 'Transfer');
  await sleep(900);
  const dialog = await page.evaluate(() => [...document.querySelectorAll('[role=dialog]')].some((e) => !e.querySelector('[role=dialog]') && e.getBoundingClientRect().width > 0));
  check('a transaction row opens quick-add (the dialog)', dialog);
  await page.keyboard.press('Escape');
  await sleep(700);
  await clickRow((cells) => cells[1].startsWith('Transfer to'));
  await sleep(1200);
  check('a transfer row opens the transfer form', /\/transfer/.test(new URL(page.url()).pathname) && /Edit transfer|Save transfer/.test(await page.evaluate(() => document.body.innerText)), page.url());
  await page.goBack();
  await sleep(1200);

  // Filters.
  await clickChip(page, 'Expense');
  await sleep(1000);
  tb = await table(page);
  check('"Expense" filter: only negative amounts', tb.rows.length > 0 && tb.rows.every((r) => r.cells[4].startsWith('-')), `${tb.rows.length} rows`);
  await clickChip(page, 'All');
  await sleep(800);
  await clickChip(page, 'IDR account');
  await sleep(1000);
  tb = await table(page);
  check('account filter: only that account', tb.rows.length > 0 && tb.rows.every((r) => r.cells[3] === 'IDR account'), `${tb.rows.length} rows`);
  await clickChip(page, 'All accounts');
  await sleep(800);

  // Month switching in the header.
  await page.evaluate(() => [...document.querySelectorAll('[aria-label="Previous month"]')].find((e) => e.offsetParent !== null).click());
  await sleep(1200);
  tb = await table(page);
  const octLeaves = await page.evaluate(() => [...document.querySelectorAll('div')].some((e) => e.offsetParent !== null && e.children.length === 0 && e.textContent.trim() === 'Oct 2026'));
  check('header month picker switches to October', octLeaves && tb.rows.length > 8 && tb.rows.every((r) => / Oct$/.test(r.cells[0])), `${tb.rows.length} rows, first date ${tb.rows[0]?.cells[0]}`);

  // URLs.
  await page.goto(base + 'transactions?month=2026-10', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelectorAll('[role=row]').length > 2, { timeout: 15000 });
  await sleep(800);
  tb = await table(page);
  check('/transactions?month=2026-10 opens October as a table', tb.rows.length > 8 && tb.rows.every((r) => / Oct$/.test(r.cells[0])), `${tb.rows.length} rows`);
  await page.goto(base + 'transactions?accountId=2', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelectorAll('[role=row]').length > 1, { timeout: 15000 });
  await sleep(800);
  tb = await table(page);
  check('/transactions?accountId=2 filters the IDR account', tb.rows.length > 0 && tb.rows.every((r) => r.cells[3] === 'IDR account'), `${tb.rows.length} rows`);

  // Other widths.
  await page.goto(base + 'transactions', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelectorAll('[role=row]').length > 2, { timeout: 15000 });
  for (const width of [1024, 1920]) {
    await page.setViewport({ width, height: 1000 });
    await sleep(1000);
    tb = await table(page);
    const box = await page.evaluate(() => {
      const head = [...document.querySelectorAll('[role=columnheader]')].find((e) => e.offsetParent !== null).closest('[role=row]').getBoundingClientRect();
      return { x: Math.round(head.left), w: Math.round(head.width) };
    });
    check(`${width}px: table at most 1200px wide, no horizontal scroll`, box.w <= 1200 && tb.scroll.w === tb.scroll.inner, `table ${box.w}px at x=${box.x}`);
    await page.screenshot({ path: `${out}/tx-${width}.png` });
  }

  // --- Narrow: same rows, same order -----------------------------------------------------------
  await page.setViewport({ width: 800, height: 1000 });
  await sleep(1200);
  const narrowAmounts = (await listAmounts(page)).map((a) => a.replace(/[\s\u00a0]/g, ''));
  check('narrow list has the same entries in the same order', JSON.stringify(narrowAmounts) === JSON.stringify(wideAmounts), `${narrowAmounts.length} vs ${wideAmounts.length}`);
  const narrowHeader = await page.evaluate(() => ({
    back: [...document.querySelectorAll('[role=button],button,a')].some((e) => e.offsetParent !== null && /back/i.test(e.getAttribute('aria-label') || '')),
    table: [...document.querySelectorAll('[role=columnheader]')].some((e) => e.offsetParent !== null),
  }));
  check('narrow: stack header back, no table', narrowHeader.back && !narrowHeader.table, JSON.stringify(narrowHeader));

  await browser.close();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures ? 1 : 0);
})();
