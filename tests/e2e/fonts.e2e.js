// Which fonts does Chrome actually render the app's text with? Usage: node tests/e2e/fonts.e2e.js [url] [screenshot-prefix]
// Uses CDP CSS.getPlatformFontsForNode on every element that has its own text, on several screens.
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const url = process.argv[2] || require('./helpers').DEFAULT_URL;
const shot = process.argv[3] || 'fonts';

(async () => {
  const browser = await puppeteer.launch({ executablePath: require('./helpers').chromePath(), headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const origin = new URL(url).origin;
  const fontRequests = [];
  const warnings = [];
  page.on('request', (r) => r.resourceType() === 'font' && fontRequests.push(r.url()));
  page.on('console', (m) => m.type() === 'warn' && warnings.push(m.text()));
  const cdp = await page.createCDPSession();
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');

  const fontsOnScreen = async (label) => {
    await sleep(800);
    const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
    const withText = [];
    const walk = (node) => {
      if (node.nodeType === 1 && (node.children || []).some((c) => c.nodeType === 3 && c.nodeValue.trim())) withText.push(node.nodeId);
      (node.children || []).forEach(walk);
    };
    walk(root);
    const families = {};
    for (const nodeId of withText) {
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId }).catch(() => ({ fonts: [] }));
      for (const f of fonts) families[f.familyName] = (families[f.familyName] || 0) + f.glyphCount;
      if (fonts.some((f) => !/^IBM Plex (Sans|Mono)/.test(f.familyName))) {
        const { outerHTML } = await cdp.send('DOM.getOuterHTML', { nodeId });
        const text = outerHTML.replace(/<[^>]+>/g, '');
        console.log(`  non-Plex glyphs in ${JSON.stringify(text)} (${[...text].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ')}): ${fonts.map((f) => `${f.familyName}×${f.glyphCount}`).join(', ')}`);
      }
    }
    console.log(`${label.padEnd(18)} ${withText.length} text elements → ${JSON.stringify(families)}`);
    return families;
  };

  await page.goto(url, { waitUntil: 'networkidle0' });
  await sleep(1500);
  const all = [];
  all.push(await fontsOnScreen('dashboard'));
  await page.screenshot({ path: `${require('./helpers').OUT}/${shot}-dashboard.png` });

  await require('./helpers').clickAdd(page);
  await page.waitForSelector('[aria-label="Delete one"]');
  await page.keyboard.type('12.5');
  all.push(await fontsOnScreen('quick-add'));
  await page.screenshot({ path: `${require('./helpers').OUT}/${shot}-quickadd.png` });
  await page.evaluate(() => [...document.querySelectorAll('[role=radio]')].find((e) => e.textContent.trim() === 'Transport').click());
  await page.keyboard.press('Enter');
  await sleep(1500);

  await page.evaluate(() => [...document.querySelectorAll('[role=button],[role=link],a')].find((e) => e.textContent.trim().startsWith('All transactions') || e.textContent.trim() === 'View all →').click());
  all.push(await fontsOnScreen('all transactions'));
  await page.goto(url, { waitUntil: 'networkidle0' });
  await sleep(1500);
  await require('./helpers').openSettings(page);
  all.push(await fontsOnScreen('settings'));
  await page.screenshot({ path: `${require('./helpers').OUT}/${shot}-settings.png` });

  const used = new Set(all.flatMap((f) => Object.keys(f)));
  const notPlex = [...used].filter((f) => !/^IBM Plex (Sans|Mono)/.test(f));
  console.log(`\nfont families rendered: ${[...used].join(', ')}`);
  console.log(`font requests: ${fontRequests.length}, other origins: ${fontRequests.filter((u) => !u.startsWith(origin)).length}`);
  fontRequests.forEach((u) => console.log(`  ${u.replace(origin, '')}`));
  console.log(`font warnings in console: ${warnings.filter((w) => /IBM Plex/.test(w)).length}`);
  console.log(notPlex.length === 0 ? '\nPASS  only IBM Plex rendered' : `\nFAIL  non-Plex fonts rendered: ${notPlex.join(', ')}`);
  await browser.close();
  process.exit(notPlex.length ? 1 : 0);
})();
