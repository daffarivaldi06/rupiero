// Base currency on web: Dashboard total in EUR / IDR, Settings choice, persistence, EUR-only balance, no-rate message.
// Usage: node tests/e2e/base-currency.e2e.js [url]   (fresh browser profile each run)
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

const text = (page) => page.evaluate(() => document.body.innerText);
/** The lines from "Total in …" to the rate line (or the no-rate message). */
const totalBlock = async (page) => {
  const lines = (await text(page)).split('\n').map((l) => l.trim()).filter(Boolean);
  const i = lines.findIndex((l) => /^Total in (EUR|IDR)$/.test(l));
  return i < 0 ? null : lines.slice(i, i + 3);
};
const clickText = (page, label) =>
  page.evaluate((label) => {
    const el = [...document.querySelectorAll('[role=button],[role=radio],a,button')].filter((e) => e.offsetParent !== null).find((e) => e.textContent.trim().startsWith(label));
    if (!el) return false;
    el.click();
    return true;
  }, label);

/** Chips and radio rows only, matched exactly (category names also appear as Dashboard rows). */
const clickRadio = (page, label) =>
  page.evaluate((label) => {
    const el = [...document.querySelectorAll('[role=radio]')].filter((e) => e.offsetParent !== null).find((e) => e.textContent.trim() === label);
    if (!el) return false;
    el.click();
    return true;
  }, label);

/** The stack header's back button (there is no URL routing, so browser history would leave the app). */
const goBackInApp = async (page) => {
  const labels = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('[role=button],button,a')].filter((e) => e.offsetParent !== null);
    const back = buttons.find((e) => /back/i.test(e.getAttribute('aria-label') || ''));
    if (back) back.click();
    return back ? null : buttons.slice(0, 6).map((e) => e.getAttribute('aria-label') || e.textContent.trim().slice(0, 15));
  });
  if (labels) console.log('  no back button; visible buttons:', JSON.stringify(labels));
};

(async () => {
  // --- With the ECB rate -------------------------------------------------------------------
  let browser = await launch();
  let page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.on('pageerror', (e) => console.log('page error:', e.message));
  await page.goto(url, { waitUntil: 'networkidle0' });
  await sleep(2500); // first ECB fetch

  let block = await totalBlock(page);
  check('Dashboard shows "Total in EUR" with a figure and the ECB date', !!block && block[1] === '€0.00' && /^≈ at the ECB rate of \d+ \w+$/.test(block[2]), JSON.stringify(block));

  // A EUR expense: −€12.50, then the quick-add preview tells us the IDR equivalent to expect.
  await require('./helpers').clickAdd(page);
  await page.waitForSelector('[aria-label="Delete one"]');
  await sleep(500);
  await page.keyboard.type('12.5');
  await sleep(400);
  const preview = (await text(page)).match(/≈ (Rp[\s\u00a0][\d,]+)/)?.[1];
  await clickRadio(page, 'Transport');
  await page.keyboard.press('Enter');
  await sleep(1500);
  block = await totalBlock(page);
  check('EUR total follows the balance: -€12.50', !!block && block[1] === '-€12.50', JSON.stringify(block));
  const figureStyle = await page.evaluate(() => {
    // The figure is the element right after the "Total in EUR" label, inside the CombinedTotal block.
    const label = [...document.querySelectorAll('div')].find((e) => e.children.length === 0 && e.textContent.trim() === 'Total in EUR');
    const el = label?.nextElementSibling;
    return el ? `${el.textContent.trim()} ${getComputedStyle(el).fontSize} ${getComputedStyle(el).fontFamily.split(',')[0]}` : null;
  });
  // At 1280 px the wide Dashboard shows the total in a card at the hero size (32 px); narrow keeps 40 px.
  check('the total is a large figure (hero card, 32px), not a caption', !!figureStyle && figureStyle.startsWith('-€12.50 32px'), figureStyle);
  await page.screenshot({ path: `${out}/base-01-eur.png` });

  // Settings: switch to IDR. The Dashboard behind it must update without a reload.
  await require('./helpers').openSettings(page);
  await sleep(1000);
  const settings = await text(page);
  check('Settings has the "Total balance in" choice', settings.includes('Total balance in') && settings.includes('Euro (EUR)') && settings.includes('Rupiah (IDR)'));
  const selected = () => page.evaluate(() => [...document.querySelectorAll('[role=radio]')].filter((e) => e.lastElementChild && e.lastElementChild.children.length > 0).map((e) => e.textContent.trim()));
  check('EUR is selected by default', (await selected()).includes('Euro (EUR)'), JSON.stringify(await selected()));
  await clickRadio(page, 'Rupiah (IDR)');
  await sleep(300);
  check('IDR is selected after the click', (await selected()).includes('Rupiah (IDR)'));
  await page.screenshot({ path: `${out}/base-02-settings.png` });
  await goBackInApp(page);
  await sleep(300);
  block = await totalBlock(page);
  const expectedIdr = preview ? `-${preview}` : null;
  check(`Dashboard total switches to IDR at once: ${expectedIdr}`, !!block && block[0] === 'Total in IDR' && block[1] === expectedIdr, JSON.stringify(block));
  await page.screenshot({ path: `${out}/base-03-idr.png` });

  // Persistence.
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1500);
  block = await totalBlock(page);
  check('the choice survives a reload', !!block && block[0] === 'Total in IDR', JSON.stringify(block));

  // EUR-only balance: archive the IDR account, the total must stay (converted into IDR).
  await require('./helpers').openSettings(page);
  await sleep(800);
  await clickText(page, 'Accounts');
  await sleep(800);
  await clickText(page, 'IDR account');
  await sleep(800);
  const archived = await clickText(page, 'Archive account');
  await sleep(1200);
  // Back on the Dashboard when its "Current balance" label is visible (any width).
  for (let i = 0; i < 4 && !(await page.evaluate(() => [...document.querySelectorAll('div')].some((e) => e.offsetParent !== null && e.children.length === 0 && e.textContent.trim() === 'Current balance'))); i++) {
    await goBackInApp(page);
    await sleep(600);
  }
  const balancesText = await text(page);
  block = await totalBlock(page);
  check(
    'with only a EUR balance, the total still shows in IDR',
    archived && !/\nIDR\nRp 0\n/.test(balancesText) && !!block && block[0] === 'Total in IDR' && block[1] === expectedIdr,
    `archive clicked: ${archived}; ${JSON.stringify(block)}`,
  );
  await page.screenshot({ path: `${out}/base-04-eur-only.png` });
  await browser.close();

  // --- Without a rate: every cross-origin request blocked, fresh profile ---------------------
  browser = await launch();
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setRequestInterception(true);
  const origin = new URL(url).origin;
  let blocked = 0;
  page.on('request', (r) => (r.url().startsWith(origin) || r.url().startsWith('data:') ? r.continue() : (blocked++, r.abort())));
  await page.goto(url, { waitUntil: 'networkidle0' });
  await sleep(2500);
  block = await totalBlock(page);
  check(
    'without a rate the Dashboard says so instead of hiding the total',
    !!block && block[0] === 'Total in EUR' && block[1].startsWith('No exchange rate yet.'),
    `blocked ${blocked} request(s); ${JSON.stringify(block)}`,
  );
  await page.screenshot({ path: `${out}/base-05-no-rate.png` });
  await browser.close();

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures ? 1 : 0);
})();
