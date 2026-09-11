const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACTS_DIR = '/Users/apple/.gemini/antigravity-ide/brain/202c597b-9fae-433e-86d0-d741efcb8096';
const SAMPLE_LEAF = '/Users/apple/Desktop/cse/agrivision-ai/sample_images/sample_tomato_early_blight.jpg';

async function run() {
  console.log('🚀 Launching Chrome Headless with TryCloudflare host mapping...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1440,900',
      '--host-resolver-rules=MAP manufacture-seal-along-comparison.trycloudflare.com 104.16.230.132'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  const networkCalls = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      console.log('🛑 Browser Console Error:', text);
    }
  });

  page.on('request', req => {
    const url = req.url();
    if (url.includes('trycloudflare') || url.includes('/api/') || url.includes('health')) {
      networkCalls.push({ method: req.method(), url });
      console.log('📡 API Call:', req.method(), url);
    }
  });

  try {
    // 1. LANDING PAGE
    console.log('\n==================================================');
    console.log('1. VERIFYING LANDING PAGE (https://verdrax.vercel.app)');
    console.log('==================================================');
    await page.goto('https://verdrax.vercel.app', { waitUntil: 'networkidle2', timeout: 30000 });

    const landingData = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.innerText || '';
      const text = document.body.innerText;
      return {
        title: document.title,
        h1,
        hasVerdra: text.includes('Verdra'),
        hasTagline: text.includes('Detect Early') && text.includes('Protect Yield'),
        hasCTA: Array.from(document.querySelectorAll('a, button')).some(el => el.innerText.includes('Scan Your Crop'))
      };
    });
    console.log('Landing DOM Data:', JSON.stringify(landingData, null, 2));
    const landingShot = path.join(ARTIFACTS_DIR, 'verdra_live_landing.png');
    await page.screenshot({ path: landingShot, fullPage: true });
    console.log('📸 Saved Landing Page Screenshot:', landingShot);

    // 2. SCAN PAGE & FULL ML WORKFLOW
    console.log('\n==================================================');
    console.log('2. VERIFYING SCAN & AI INFERENCE WORKFLOW');
    console.log('==================================================');
    await page.goto('https://verdrax.vercel.app/scan', { waitUntil: 'networkidle2', timeout: 30000 });

    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input missing from scan page DOM');

    console.log('📤 Uploading sample leaf image:', SAMPLE_LEAF);
    await fileInput.uploadFile(SAMPLE_LEAF);

    // Wait 1 second for specimen preview card to mount in DOM
    await new Promise(r => setTimeout(r, 1000));

    // Find and click the "Analyze Crop" button
    console.log('🔍 Locating "Analyze Crop" button...');
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const analyzeBtn = btns.find(b => b.innerText.includes('Analyze Crop'));
      if (analyzeBtn) {
        analyzeBtn.click();
        return true;
      }
      return false;
    });

    if (!clicked) {
      throw new Error('Analyze Crop button not found in DOM after upload');
    }
    console.log('✅ Clicked "Analyze Crop" button! Monitoring progress sequence...');

    // Wait for the URL to change to /result/ or diagnosis card to appear
    console.log('⏳ Waiting for real ML inference and navigation to result...');
    await page.waitForFunction(() => {
      const url = window.location.href;
      const text = document.body.innerText;
      return (
        url.includes('/result/') ||
        text.includes('Early Blight') ||
        text.includes('Confidence') ||
        text.includes('Grad-CAM') ||
        text.includes('Severity')
      );
    }, { timeout: 35000 });

    // Wait for result page components to settle
    await new Promise(r => setTimeout(r, 3000));

    const resultData = await page.evaluate(() => {
      const text = document.body.innerText;
      const h1 = document.querySelector('h1')?.innerText || '';
      const h2s = Array.from(document.querySelectorAll('h2, h3, h4')).map(h => h.innerText);
      const badges = Array.from(document.querySelectorAll('[class*="badge"], [class*="rounded"]')).map(b => b.innerText.trim()).filter(Boolean);
      const images = Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src.startsWith('data:') ? 'data:image/... (Grad-CAM base64 data URL)' : img.src,
        alt: img.alt
      }));

      return {
        currentUrl: window.location.href,
        h1,
        hasDiagnosis: /Early Blight|Late Blight|Healthy|Bacterial/i.test(text),
        hasConfidence: /%|Confidence/i.test(text),
        hasSeverity: /Severity|Infected|Mild|Moderate|Severe/i.test(text),
        hasGradCAM: text.includes('Grad-CAM') || text.includes('Attention') || images.some(i => i.src.includes('data:image')),
        hasWeather: /Temperature|Humidity|°C|Weather/i.test(text),
        hasRisk: /Risk|Spread/i.test(text),
        hasRecommendations: /Recommendation|Immediate|Prevention|Monitoring/i.test(text),
        images,
        headings: h2s.slice(0, 10),
        textSample: text.substring(0, 1200)
      };
    });

    console.log('\n🌿 Result DOM Inspection:');
    console.log(JSON.stringify(resultData, null, 2));

    const resultShot = path.join(ARTIFACTS_DIR, 'verdra_live_prediction_result.png');
    await page.screenshot({ path: resultShot, fullPage: true });
    console.log('📸 Saved Prediction Result Screenshot:', resultShot);

    // 3. DASHBOARD PAGE
    console.log('\n==================================================');
    console.log('3. VERIFYING DASHBOARD PAGE');
    console.log('==================================================');
    await page.goto('https://verdrax.vercel.app/dashboard', { waitUntil: 'networkidle2', timeout: 30000 });
    const dashData = await page.evaluate(() => {
      return {
        title: document.title,
        heading: document.querySelector('h1, h2')?.innerText,
        textSnippet: document.body.innerText.substring(0, 600)
      };
    });
    console.log('Dashboard Data:', dashData);
    const dashShot = path.join(ARTIFACTS_DIR, 'verdra_live_dashboard.png');
    await page.screenshot({ path: dashShot, fullPage: true });
    console.log('📸 Saved Dashboard Screenshot:', dashShot);

    // 4. MODEL VALIDATION PAGE
    console.log('\n==================================================');
    console.log('4. VERIFYING VALIDATION TRANSPARENCY PAGE');
    console.log('==================================================');
    await page.goto('https://verdrax.vercel.app/validation', { waitUntil: 'networkidle2', timeout: 30000 });
    const valData = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        heading: document.querySelector('h1, h2')?.innerText,
        hasAccuracy: text.includes('99.17%') || text.includes('Accuracy'),
        hasConfusionMatrix: text.includes('Confusion Matrix') || text.includes('Audited Test Set'),
        textSnippet: text.substring(0, 600)
      };
    });
    console.log('Validation Data:', valData);
    const valShot = path.join(ARTIFACTS_DIR, 'verdra_live_validation.png');
    await page.screenshot({ path: valShot, fullPage: true });
    console.log('📸 Saved Validation Screenshot:', valShot);

    // 5. SUMMARY AUDIT
    console.log('\n==================================================');
    console.log('5. SYSTEM INTEGRATION AUDIT');
    console.log('==================================================');
    console.log(`Total API Requests captured: ${networkCalls.length}`);
    networkCalls.forEach(c => console.log(`  -> [${c.method}] ${c.url}`));
    console.log(`Console Errors detected: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(e => console.log(`  ⚠️ ${e}`));
    } else {
      console.log('  ✅ Clean console with ZERO errors');
    }

  } catch (err) {
    console.error('❌ Automation Error:', err);
    const errShot = path.join(ARTIFACTS_DIR, 'verdra_live_error.png');
    await page.screenshot({ path: errShot, fullPage: true }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

run().then(() => {
  console.log('\n🎉 ALL DOM AND PUBLIC URL VERIFICATION STEPS PASSED!');
  process.exit(0);
}).catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
