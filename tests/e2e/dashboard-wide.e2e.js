// Wide web Dashboard: cards, 2:1 grid, recent transactions, budgets top 6, hidden rows, balance at xl.
// Usage: node tests/e2e/dashboard-wide.e2e.js [url]
const puppeteer = require('puppeteer-core');
const { sleep, openApp, loadSample, createBudgets } = require('./helpers');
const out = require('./helpers').OUT;
const base = (process.argv[2] || require('./helpers').DEFAULT_URL).replace(/\/$/, '') + '/';
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};
const BUDGETS = [['Rent', '600'], ['Transport', '100'], ['Bills', '100'], ['Food & Groceries', '300'], ['Entertainment', '50'], ['Health', '40'], ['Other', '80'], ['Salary', '10']];

/** Geometry of the wide Dashboard, measured from the DOM. */
const measure = (page) =>
  page.evaluate(() => {
    const visible = (e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed';
    const leaf = (s) => [...document.querySelectorAll('div,span')].find((e) => visible(e) && !e.closest('[role=navigation]') && e.children.length === 0 && e.textContent.trim() === s);
    const box = (e) => {
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
    };
    // Cards: surface background with 8px radius.
    const cards = [...document.querySelectorAll('div')].filter(
      (e) => visible(e) && getComputedStyle(e).backgroundColor === 'rgb(251, 250, 246)' && getComputedStyle(e).borderTopLeftRadius === '8px',
    );
    const cardInfo = cards.map((c) => {
      const amounts = [...c.querySelectorAll('div')].filter((e) => e.children.length === 0 && /[€]|Rp/.test(e.textContent) && parseFloat(getComputedStyle(e).fontSize) >= 20);
      return { ...box(c), text: c.innerText.replace(/\n/g, ' | '), fontSize: amounts[0] ? getComputedStyle(amounts[0]).fontSize : null };
    });
    // Grid: the row whose two children hold "Recent transactions" and "Budget".
    // The grid is the lowest element holding both column titles; its two children are the columns.
    const recentTitle = leaf('Recent transactions');
    const budgetTitle = leaf('Budget');
    const ancestors = new Set();
    for (let e = recentTitle; e; e = e.parentElement) ancestors.add(e);
    let grid = budgetTitle;
    while (grid && !ancestors.has(grid)) grid = grid.parentElement;
    const left = grid && [...grid.children].find((c) => c.contains(recentTitle));
    const right = grid && [...grid.children].find((c) => c.contains(budgetTitle));
    const page = grid?.parentElement;
    const nav = document.querySelector('[role=navigation]');
    const sideRight = nav ? nav.getBoundingClientRect().right : 0;
    // Recent rows: the buttons above the "Categories" title (categories now follow in the same column).
    const categoriesTitle = leaf('Categories');
    const categoriesTop = categoriesTitle ? categoriesTitle.getBoundingClientRect().top : Infinity;
    const recentRows = left ? [...left.querySelectorAll('[role=button]')].filter((b) => b.getBoundingClientRect().top < categoriesTop).length : 0;
    const rightText = right ? right.innerText.split('\n').map((l) => l.trim()) : [];
    const budgetIdx = rightText.indexOf('Budget');
    const accountsIdx = rightText.indexOf('Accounts');
    const budgetNames = right
      ? [...right.querySelectorAll('[role=button]')].map((b) => b.innerText.split('\n')[0].trim()).slice(0, 10)
      : [];
    return {
      cards: cardInfo,
      left: left && box(left),
      right: right && box(right),
      page: page && box(page),
      contentArea: { x: Math.round(sideRight), w: Math.round(window.innerWidth - sideRight) },
      recentRows,
      budgetNames,
      budgetBlock: budgetIdx >= 0 && accountsIdx > budgetIdx ? rightText.slice(budgetIdx, accountsIdx) : [],
      sections: right
        ? ['Budget', 'Accounts', 'Categories'].map((s) => {
            const el = [...right.querySelectorAll('div')].find((e) => e.children.length === 0 && e.textContent.trim() === s);
            return el ? Math.round(el.getBoundingClientRect().top) : null;
          }).concat([Math.round(right.getBoundingClientRect().bottom)])
        : [],
      scroll: { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth },
      hasRows: /All transactions|Spending charts/.test(document.body.innerText),
    };
  });

(async () => {
  const browser = await puppeteer.launch({ executablePath: require('./helpers').chromePath(), headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });
  page.on('pageerror', (e) => console.log('page error:', e.message));

  // Fresh profile: the offer sits at the top, above the cards.
  await openApp(page, base);
  const offerY = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((e) => e.children.length === 0 && e.textContent.trim() === 'Try Rupiero with sample data');
    return el ? Math.round(el.getBoundingClientRect().top) : null;
  });
  let m = await measure(page);
  const firstBalanceCard = m.cards.find((c) => c.text.startsWith('EUR'));
  check('offer at the top, above the balance cards', offerY !== null && firstBalanceCard && offerY < firstBalanceCard.y, `offer y ${offerY}, cards y ${firstBalanceCard?.y}`);
  await page.screenshot({ path: `${out}/dash-00-offer.png` });

  await loadSample(page);
  await createBudgets(page, base, BUDGETS);
  await openApp(page, base);

  for (const width of [1024, 1280, 1440, 1920]) {
    await page.setViewport({ width, height: 1000 });
    await sleep(1200);
    m = await measure(page);
    const balanceCards = m.cards.filter((c) => /^(EUR|IDR|Total in)/.test(c.text));
    const sameRow = balanceCards.length === 3 && balanceCards.every((c) => Math.abs(c.y - balanceCards[0].y) <= 1);
    const equal = balanceCards.length === 3 && Math.max(...balanceCards.map((c) => c.w)) - Math.min(...balanceCards.map((c) => c.w)) <= 1;
    check(`${width}px: 3 cards (EUR, IDR, Total) in one row, equal widths`, sameRow && equal, balanceCards.map((c) => `${c.text.split(' | ')[0]} ${c.w}px@y${c.y}`).join(', '));
    check(`${width}px: card amounts are 32px`, balanceCards.length === 3 && balanceCards.every((c) => c.fontSize === '32px'), balanceCards.map((c) => c.fontSize).join(', '));
    check(`${width}px: total card has the ECB date`, balanceCards.some((c) => /ECB rate of \d+ \w+/.test(c.text)));
    const ratio = m.left && m.right ? m.left.w / m.right.w : 0;
    const ratioOk = width >= 1280 ? ratio > 1.7 && ratio < 2.3 : m.right?.w >= 300;
    check(`${width}px: 2:1 grid (left ${m.left?.w}px, right ${m.right?.w}px)`, !!m.left && !!m.right && Math.abs(m.left.y - m.right.y) <= 24 && ratioOk, `ratio ${ratio.toFixed(2)}`);
    const centered = m.page && Math.abs(m.page.x - m.contentArea.x - (m.contentArea.x + m.contentArea.w - (m.page.x + m.page.w))) <= 2;
    check(`${width}px: content at most 1200px wide and centered`, !!m.page && m.page.w <= 1200 && centered, `page ${m.page?.w}px at x=${m.page?.x}, content area x=${m.contentArea.x} w=${m.contentArea.w}`);
    check(`${width}px: 5–8 recent transactions`, m.recentRows >= 5 && m.recentRows <= 8, `${m.recentRows} rows`);
    check(`${width}px: "All transactions" / "Spending charts" rows hidden`, !m.hasRows);
    check(`${width}px: no horizontal scroll`, m.scroll.scrollWidth === m.scroll.innerWidth, JSON.stringify(m.scroll));
    const heights = `left ${m.left?.h}px, right ${m.right?.h}px`;
    console.log(`      column heights at ${width}px: ${heights}`);
    await page.screenshot({ path: `${out}/dash-${width}.png` });
  }

  // Budgets: sorted by use, top 6, then "All budgets →".
  await page.setViewport({ width: 1280, height: 1000 });
  await sleep(800);
  m = await measure(page);
  const budgetRows = m.budgetBlock.filter((l) => BUDGETS.some(([n]) => n === l));
  check('budgets sorted by use: Rent, Transport, Bills first', JSON.stringify(budgetRows.slice(0, 3)) === '["Rent","Transport","Bills"]', JSON.stringify(budgetRows));
  check('top 6 budgets shown, then "All budgets →"', budgetRows.length === 6 && m.budgetBlock.includes('All budgets →'), `${budgetRows.length} rows; ${JSON.stringify(m.budgetBlock.slice(-2))}`);

  // Links.
  const clickLeaf = (label) =>
    page.evaluate((label) => {
      const el = [...document.querySelectorAll('[role=link],[role=button]')].filter((e) => e.offsetParent !== null).find((e) => e.textContent.trim() === label);
      el?.click();
      return !!el;
    }, label);
  await clickLeaf('View all →');
  await sleep(1000);
  check('"View all →" opens /transactions', new URL(page.url()).pathname === '/transactions', page.url());
  await page.goBack();
  await sleep(1000);
  await clickLeaf('All budgets →');
  await sleep(1000);
  check('"All budgets →" opens /budget', new URL(page.url()).pathname === '/budget', page.url());
  await page.goBack();
  await sleep(1000);
  // A recent row opens the editor.
  await page.evaluate(() => {
    const leaf = (s) => [...document.querySelectorAll('div')].find((e) => e.offsetParent !== null && !e.closest('[role=navigation]') && e.children.length === 0 && e.textContent.trim() === s);
    const recentTitle = leaf('Recent transactions');
    const ancestors = new Set();
    for (let e = recentTitle; e; e = e.parentElement) ancestors.add(e);
    let grid = leaf('Budget');
    while (grid && !ancestors.has(grid)) grid = grid.parentElement;
    [...grid.children].find((c) => c.contains(recentTitle)).querySelector('[role=button]').click();
  });
  await sleep(1200);
  check('a recent row opens it in quick-add', await page.$('[aria-label="Delete one"]').then(Boolean));

  await browser.close();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures ? 1 : 0);
})();
