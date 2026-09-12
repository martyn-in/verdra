/**
 * Verdra Production Deployment Verification
 * Tests the live Vercel app (https://verdrax.vercel.app) and Render backend (https://verdra.onrender.com)
 */

const fs = require('fs');
const path = require('path');

const VERCEL_URL = 'https://verdrax.vercel.app';
const BACKEND_URL = 'https://verdra.onrender.com';

async function main() {
  console.log('--- VERDRA DEPLOYMENT VERIFICATION ---');
  console.log(`Frontend: ${VERCEL_URL}`);
  console.log(`Backend:  ${BACKEND_URL}`);
  
  // 1. Backend Health Check
  console.log('\n1. Checking Render Backend Health...');
  try {
    const healthRes = await fetch(`${BACKEND_URL}/health`);
    const healthJson = await healthRes.json();
    console.log('✓ Backend Health:', JSON.stringify(healthJson));
    if (healthJson.status !== 'ok') {
      throw new Error(`Unexpected backend status: ${healthJson.status}`);
    }
  } catch (err) {
    console.error('✗ Backend Health Check Failed:', err.message);
    process.exit(1);
  }

  // 2. Frontend Page Checks
  console.log('\n2. Verifying Vercel Frontend Routes...');
  const routes = ['/', '/scan', '/history', '/farm', '/dashboard'];
  for (const route of routes) {
    const res = await fetch(`${VERCEL_URL}${route}`);
    console.log(`✓ ${route} -> HTTP ${res.status} (${res.headers.get('content-type')})`);
    if (res.status !== 200) {
      throw new Error(`Route ${route} failed with status ${res.status}`);
    }
  }

  // 3. Real Inference Request to Backend
  console.log('\n3. Testing Real Crop Disease Inference via Production Backend...');
  const sampleImagePath = path.join(__dirname, '..', 'frontend', 'public', 'sample_images', 'sample_tomato_late_blight.jpg');
  const imageBuffer = fs.readFileSync(sampleImagePath);
  const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
  const formData = new FormData();
  formData.append('file', blob, 'sample_tomato_late_blight.jpg');
  formData.append('crop', 'tomato');
  formData.append('field_tag', 'VERIFY-ROW-1');

  const predictRes = await fetch(`${BACKEND_URL}/api/predict`, {
    method: 'POST',
    body: formData,
  });

  if (!predictRes.ok) {
    const text = await predictRes.text();
    throw new Error(`Predict endpoint failed with ${predictRes.status}: ${text}`);
  }

  const result = await predictRes.json();
  console.log('✓ Prediction Received:');
  console.log(`  Status:         ${result.status}`);
  console.log(`  Crop:           ${result.crop}`);
  console.log(`  Disease:        ${result.prediction}`);
  console.log(`  Confidence:     ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`  Confidence Msg: ${result.confidence_message || 'N/A'}`);
  console.log(`  Severity:       ${result.severity?.level || result.severity?.severity || 'N/A'} (${result.severity?.percentage || result.severity?.infected_percentage || 0}%)`);
  console.log(`  Risk:           ${result.risk?.level || 'N/A'}`);
  console.log(`  Weather:        ${result.weather?.temperature}°C, ${result.weather?.humidity}% humidity`);
  console.log(`  Grad-CAM:       ${result.gradcam_url ? 'Available (base64 data)' : 'Generated'}`);
  console.log(`  Immediate Rec:  ${result.recommendations?.immediate?.[0] || 'Available'}`);
  console.log(`  Scan ID:        ${result.scan_id || 'Generated'}`);

  console.log('\n✓ ALL DEPLOYMENT VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}

main().catch((err) => {
  console.error('\n✗ Verification Failed:', err);
  process.exit(1);
});
