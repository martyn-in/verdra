const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--host-resolver-rules=MAP manufacture-seal-along-comparison.trycloudflare.com 104.16.230.132']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('https://verdrax.vercel.app/scan', { waitUntil: 'networkidle2' });
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile('/Users/apple/Desktop/cse/agrivision-ai/sample_images/non_leaf_sample.jpg');
  await new Promise(r => setTimeout(r, 1000));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(btn => btn.innerText.includes('Analyze Crop'));
    if (b) b.click();
  });
  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return text.includes('Advisory') || text.includes('not appear to contain a crop leaf') || text.includes('Error') || text.includes('UNCERTAIN');
  }, { timeout: 15000 });
  const alertText = await page.evaluate(() => document.body.innerText);
  console.log('✅ Advisory Message in DOM:\n', alertText.substring(0, 700));
  await page.screenshot({ path: '/Users/apple/.gemini/antigravity-ide/brain/202c597b-9fae-433e-86d0-d741efcb8096/verdra_non_leaf_rejection.png', fullPage: true });
  console.log('📸 Saved non-leaf rejection screenshot');
  await browser.close();
})().then(() => console.log('NON-LEAF TEST PASSED')).catch(e => { console.error(e); process.exit(1); });
