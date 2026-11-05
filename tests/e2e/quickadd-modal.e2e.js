// Wide web: desktop header, quick-add modal (centered, Esc/backdrop, focus, keyboard, icon), N key.
// Narrow web: N opens the bottom sheet. Usage: node tests/e2e/quickadd-modal.e2e.js [url]
const puppeteer = require('puppeteer-core');
const { sleep, openApp, clickAdd } = require('./helpers');
const out = require('./helpers').OUT;
const base = (process.argv[2] || require('./helpers').DEFAULT_URL).replace(/\/$/, '') + '/';
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};
const NOTE = 'input[placeholder="Note (optional)"]';

(async () => {
  const browser = await puppeteer.launch({ executablePath: require('./helpers').chromePath(), headless: true });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('page error:', e.message));
  await page.setViewport({ width: 1280, height: 900 });
  await openApp(page, base);
  await page.evaluate(() => [...document.querySelectorAll('[role=button],button')].find((e) => e.textContent.trim() === 'No thanks')?.click());
  await sleep(800);

  const dialog = () =>
    page.evaluate(() => {
      // react-native-web's Modal is itself a full-screen role=dialog; the card is the innermost one.
      const d = [...document.querySelectorAll('[role=dialog]')].find((e) => e.getBoundingClientRect().width > 0 && !e.querySelector('[role=dialog]'));
      if (!d) return null;
      const r = d.getBoundingClientRect();
      const back = d.querySelector('[aria-label="Delete one"]');
      return {
        x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
        backHasSvg: !!back?.querySelector('svg'), backText: back?.textContent ?? null,
        focusInside: d.contains(document.activeElement),
        focusText: document.activeElement?.innerText?.replace(/\n/g, ' | ').slice(0, 40) ?? '',
      };
    });
  const sheetOpen = () => page.evaluate(() => [...document.querySelectorAll('[aria-label="Delete one"]')].some((e) => e.offsetParent !== null && !e.closest('[role=dialog]')));
  const expenseEur = async () => {
    const lines = (await page.evaluate(() => document.body.innerText)).split('\n').map((l) => l.trim());
    const i = lines.indexOf('Cash flow November 2026');
    return lines[i + 5];
  };

  // --- Header --------------------------------------------------------------------------------
  const header = await page.evaluate(() => {
    const visible = (e) => e.offsetParent !== null && !e.closest('[role=navigation]');
    return {
      add: [...document.querySelectorAll('[role=button],button')].some((e) => visible(e) && e.textContent.trim() === '+ Add transaction'),
      month: [...document.querySelectorAll('[aria-label="Previous month"],[aria-label="Next month"]')].filter(visible).length,
      eye: [...document.querySelectorAll('[aria-label="Hide balances"]')].some(visible),
      wordmark: [...document.querySelectorAll('[aria-label="Rupiero"]')].some(visible),
      gear: [...document.querySelectorAll('[aria-label="Settings"]')].some(visible),
      fab: [...document.querySelectorAll('[aria-label="Add transaction"]')].some(visible),
    };
  });
  check('header: month switcher, eye and "+ Add transaction"', header.add && header.month === 2 && header.eye, JSON.stringify(header));
  check('header: no wordmark or gear (the sidebar has them), no floating "+"', !header.wordmark && !header.gear && !header.fab, JSON.stringify(header));
  await page.screenshot({ path: `${out}/qa-01-header.png` });

  // --- Modal via the header button ---------------------------------------------------------------
  await clickAdd(page);
  await sleep(800);
  let d = await dialog();
  check('header button opens a centered dialog about 460px wide', !!d && d.w === 460 && Math.abs(d.x + d.w / 2 - 640) <= 2 && Math.abs(d.y + d.h / 2 - 450) <= 2, JSON.stringify(d && { x: d.x, y: d.y, w: d.w, h: d.h }));
  check('no bottom sheet behind it', !(await sheetOpen()));
  check('focus starts on the amount', !!d && d.focusInside && /€0\.00/.test(d.focusText), d?.focusText);
  check('backspace is an icon, not the ⌫ character', !!d && d.backHasSvg && !d.backText?.includes('⌫'), JSON.stringify(d && { svg: d.backHasSvg, text: d.backText }));
  await page.screenshot({ path: `${out}/qa-02-modal.png` });

  // Physical keyboard: type, pick a category, Enter saves.
  await page.keyboard.type('12.5');
  await sleep(300);
  const amount = await page.evaluate(() => document.querySelector('[role=dialog]').innerText.includes('€12.50'));
  check('typing drives the keypad (€12.50)', amount);
  await page.evaluate(() => [...document.querySelectorAll('[role=dialog] [role=radio]')].find((e) => e.textContent.trim() === 'Transport').click());
  await page.keyboard.press('Enter');
  await sleep(1500);
  check('Enter saves and closes the dialog', !(await dialog()) && (await expenseEur()) === '-€12.50', await expenseEur());

  // Esc closes.
  await clickAdd(page);
  await sleep(700);
  await page.keyboard.press('Escape');
  await sleep(700);
  check('Esc closes the dialog', !(await dialog()));

  // Backdrop click closes.
  await clickAdd(page);
  await sleep(700);
  await page.mouse.click(300, 120);
  await sleep(700);
  check('a click on the backdrop closes the dialog', !(await dialog()));

  // Esc and "n" in the note stay typing.
  await clickAdd(page);
  await sleep(700);
  await page.click(NOTE);
  await page.keyboard.type('nan', { delay: 30 });
  await page.keyboard.press('Escape');
  await sleep(700);
  const note = await page.$eval(NOTE, (e) => e.value).catch(() => null);
  check('in the note, "n" is typed and Esc does not close the dialog', !!(await dialog()) && note === 'nan', JSON.stringify(note));
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Escape');
  await sleep(700);

  // --- N key ---------------------------------------------------------------------------------
  await page.keyboard.press('n');
  await sleep(800);
  check('N opens quick-add as the dialog on wide screens', !!(await dialog()));
  await page.keyboard.press('n'); // already open: nothing else happens
  await sleep(400);
  check('N while open opens nothing more', (await page.evaluate(() => [...document.querySelectorAll('[role=dialog]')].filter((e) => !e.querySelector('[role=dialog]')).length)) === 1);
  await page.keyboard.press('Escape');
  await sleep(700);
  await page.keyboard.down('Control');
  await page.keyboard.press('n');
  await page.keyboard.up('Control');
  await sleep(700);
  check('Ctrl+N does not open quick-add', !(await dialog()) && !(await sheetOpen()));
  await page.keyboard.press('N');
  await sleep(800);
  check('Shift+N (capital N) opens it too', !!(await dialog()));
  await page.keyboard.press('Escape');
  await sleep(700);

  // --- Narrow: N opens the bottom sheet ------------------------------------------------------------
  await page.setViewport({ width: 800, height: 900 });
  await sleep(1000);
  await page.keyboard.press('n');
  await sleep(1000);
  check('below 1024px, N opens the bottom sheet (no dialog)', (await sheetOpen()) && !(await dialog()));
  await page.screenshot({ path: `${out}/qa-03-narrow-sheet.png` });
  await page.keyboard.press('Escape');
  await sleep(800);

  await browser.close();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures ? 1 : 0);
})();
