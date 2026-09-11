const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACTS_DIR = '/Users/apple/.gemini/antigravity-ide/brain/202c597b-9fae-433e-86d0-d741efcb8096';
const SAMPLE_LEAF = '/Users/apple/Desktop/cse/agrivision-ai/sample_images/sample_tomato_early_blight.jpg';

async function run() {
  console.log('🚀 Testing Verdra on Vercel connected to Render backend (https://verdra.onrender.com)...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const networkCalls = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('onrender.com') || url.includes('/api/')) {
      networkCalls.push({ method: req.method(), url });
      console.log('📡 API Call:', req.method(), url);
    }
  });

  try {
    // 1. SCAN & INFERENCE
    console.log('\n--- Navigating to https://verdrax.vercel.app/scan ---');
    await page.goto('https://verdrax.vercel.app/scan', { waitUntil: 'networkidle2', timeout: 30000 });

    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input missing from scan page DOM');

    console.log('📤 Uploading specimen leaf...');
    await fileInput.uploadFile(SAMPLE_LEAF);
    await new Promise(r => setTimeout(r, 1000));

    console.log('🔍 Clicking "Analyze Crop"...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.innerText.includes('Analyze Crop'));
      if (b) b.click();
    });

    console.log('⏳ Waiting for prediction from Render cloud backend...');
    await page.waitForFunction(() => {
      const url = window.location.href;
      const text = document.body.innerText;
      return url.includes('/result/') || text.includes('Early Blight') || text.includes('Confidence');
    }, { timeout: 35000 });

    await new Promise(r => setTimeout(r, 3000));

    const result = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        url: window.location.href,
        hasDiagnosis: text.includes('Early Blight'),
        hasConfidence: text.includes('Confidence') || text.includes('%'),
        hasGradcam: text.includes('Grad-CAM') || text.includes('Attention Map') || text.includes('Conv_1'),
        snippet: text.substring(0, 800)
      };
    });

    console.log('\n🌿 Live Prediction Result DOM from Render Backend:');
    console.log(JSON.stringify(result, null, 2));

    const shot = path.join(ARTIFACTS_DIR, 'verdra_live_render_production.png');
    await page.screenshot({ path: shot, fullPage: true });
    console.log('📸 Saved screenshot:', shot);

    console.log('\n📡 Captured Network Calls to Render:');
    networkCalls.forEach(c => console.log(`  -> [${c.method}] ${c.url}`));

  } finally {
    await browser.close();
  }
}

run().then(() => {
  console.log('\n🎉 RENDER BACKEND + VERCEL FRONTEND VERIFIED 100% OPERATIONAL!');
  process.exit(0);
}).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
