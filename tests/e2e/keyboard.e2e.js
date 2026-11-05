// Headless check of physical keyboard input in the quick-add sheet, against the Docker build.
// Usage: node tests/e2e/keyboard.e2e.js [url] [width]   (expects an empty database: a fresh browser profile)
const puppeteer = require('puppeteer-core');
const out = require('./helpers').OUT;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};
const NOTE = 'input[placeholder="Note (optional)"]';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: require('./helpers').chromePath(),
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: Number(process.argv[3] || 1280), height: 900 });
  page.on('pageerror', (e) => console.log('page error:', e.message));
  await page.goto(process.argv[2] || require('./helpers').DEFAULT_URL, { waitUntil: 'networkidle0' });
  await sleep(2000);

  const sheetOpen = () => page.$('[aria-label="Delete one"]').then(Boolean);
  const expenseEur = async () => {
    // The dashboard's cash-flow block: "EUR | <income> | <expense>".
    const lines = (await page.evaluate(() => document.body.innerText)).split('\n').map((l) => l.trim());
    const i = lines.indexOf('Cash flow November 2026');
    return lines.slice(i + 3, i + 6).join(' | ');
  };
  const openSheet = async () => {
    await require('./helpers').clickAdd(page);
    await page.waitForSelector('[aria-label="Delete one"]', { timeout: 5000 });
    await sleep(600); // opening animation
  };
  const clickChip = (label) =>
    page.evaluate((label) => {
      const chip = [...document.querySelectorAll('[role=radio]')].find((e) => e.textContent.trim() === label);
      chip.click();
      chip.focus(); // as after a real mouse click: the chip keeps focus
      return document.activeElement === chip;
    }, label);
  // Expression line (if any) and amount, after the display has caught up with the last key.
  const amountBlock = async () => {
    await sleep(400);
    return page.evaluate(() => {
      let el = document.querySelector('[aria-label="Delete one"]');
      while (el && !el.innerText.includes('Expense')) el = el.parentElement;
      const lines = el.innerText.split('\n');
      const i = lines.findIndex((l) => /^-?(€|Rp)/.test(l));
      const expression = /^[\d.,×÷+−]+$/.test(lines[i - 1]) ? `${lines[i - 1]} / ` : '';
      return expression + lines[i];
    });
  };
  // EUR expense this month in cents, from "EUR | <income> | -€1,234.56".
  const spent = (flow) => Math.round(Number(flow.split(' | ')[2].replace(/[^\d.]/g, '')) * 100);
  // The dev build seeds sample data after the first render: wait until the dashboard stops changing.
  let previous = null;
  for (let i = 0; i < 20; i++) {
    const current = await expenseEur();
    if (current === previous) break;
    previous = current;
    await sleep(1500);
  }
  const baseline = spent(await expenseEur());
  console.log(`starting EUR expense: €${(baseline / 100).toFixed(2)}`);
  const spentIs = (flow, euros) => spent(flow) === baseline + euros * 100;

  // 1. Digits, "." as decimal, operators, Backspace.
  await openSheet();
  await page.keyboard.type('12.55');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('*2');
  let amount = await amountBlock();
  check('"12.55", Backspace, "*2" → 12.5×2 = €25.00', amount.startsWith('12.5×2 / €25.00'), amount);
  await page.keyboard.type('-5+1/2');
  amount = await amountBlock();
  check('"-" "+" "/" → − + ÷: 12.5×2−5+1÷2 = €20.50', amount.startsWith('12.5×2−5+1÷2 / €20.50'), amount);
  for (let i = 0; i < 6; i++) await page.keyboard.press('Backspace');
  amount = await amountBlock();
  check('Backspace ×6 → 12.5×2 again', amount.startsWith('12.5×2 / €25.00'), amount);

  // 2. Enter without a category: Save is disabled, nothing happens, sheet stays open.
  await page.keyboard.press('Enter');
  await sleep(800);
  check('Enter without a category keeps the sheet open', await sheetOpen());

  // 3. Pick a category with the mouse (the chip keeps focus), then a quick double Enter.
  check('category chip has focus after the click', await clickChip('Food & Groceries'));
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await sleep(1500);
  check('Enter saves and closes the sheet', !(await sheetOpen()));
  let flow = await expenseEur();
  check('quick double Enter saves once: EUR expense -€25.00, not -€50.00', spentIs(flow, 25), flow);

  // 4. Two Enter keydowns in the same tick, before the first save has resolved.
  await openSheet();
  await page.keyboard.type('7');
  await clickChip('Transport');
  await page.evaluate(() => {
    const fire = () =>
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    fire();
    fire();
  });
  await sleep(1500);
  flow = await expenseEur();
  check('same-tick double Enter saves once: -€32.00, not -€39.00', !(await sheetOpen()) && spentIs(flow, 32), flow);

  // 5. Typing in the note does not drive the keypad; Enter and Escape there do nothing.
  await openSheet();
  await page.keyboard.type('3');
  await page.click(NOTE);
  await page.keyboard.type('Lunch 12+4.5', { delay: 20 });
  await page.keyboard.press('Backspace');
  await sleep(300);
  const note = await page.$eval(NOTE, (e) => e.value);
  check('note gets the typed text and its Backspace', note === 'Lunch 12+4.', JSON.stringify(note));
  amount = await amountBlock();
  check('keypad amount unchanged while typing in the note (€3.00)', amount.startsWith('€3.00'), amount);
  await clickChip('Bills');
  await page.click(NOTE);
  await page.keyboard.press('Escape');
  await sleep(1000);
  check('Escape in the note does not close the sheet', await sheetOpen());
  await page.click(NOTE);
  await page.keyboard.press('Enter');
  await sleep(1000);
  flow = await expenseEur();
  // react-native-web blurs a single-line input on Enter (blurOnSubmit), as "done" does on Android.
  check('Enter in the note neither saves nor closes', (await sheetOpen()) && spentIs(flow, 32), flow);

  // 6. Escape outside the note closes without saving.
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Escape');
  await sleep(1200);
  flow = await expenseEur();
  check('Escape closes the sheet without saving', !(await sheetOpen()) && spentIs(flow, 32), flow);

  // 7. Ctrl+digit is left to the browser.
  await openSheet();
  await page.keyboard.down('Control');
  await page.keyboard.press('5');
  await page.keyboard.up('Control');
  amount = await amountBlock();
  check('Ctrl+5 does not type into the keypad', amount.startsWith('€0.00'), amount);
  await page.keyboard.press('Escape');
  await sleep(1200);

  // 8. The transaction list has exactly the two saved transactions.
  await page.evaluate(() =>
    [...document.querySelectorAll('[role=button],[role=link],a')].find((e) => e.textContent.trim().startsWith('All transactions') || e.textContent.trim() === 'View all →').click(),
  );
  await sleep(1500);
  await page.screenshot({ path: out + '/03-transactions.png' });
  if (baseline !== 0) { console.log('skip  transaction list check (database not empty)'); await browser.close(); console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`); process.exit(failures ? 1 : 0); }
  const list = await page.evaluate(() => document.body.innerText);
  check(
    'transaction list: one Food & Groceries, one Transport, no Bills',
    (list.match(/Food & Groceries/g) || []).length === 1 && (list.match(/Transport/g) || []).length === 1 && !list.includes('Bills'),
  );

  await browser.close();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures ? 1 : 0);
})();
