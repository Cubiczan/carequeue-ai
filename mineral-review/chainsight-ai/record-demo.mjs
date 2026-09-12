import { chromium } from 'playwright';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const VIDEO_DIR = '/home/z/my-project/download/video-recordings';
const OUTPUT = '/home/z/my-project/download/chainsight-ai-demo.mp4';

fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: VIDEO_DIR, size: { width: 1920, height: 1080 } }
});

const page = await context.newPage();
const BASE = 'http://localhost:3000';
const wait = (ms) => page.waitForTimeout(ms);
const smoothScroll = (y) => page.evaluate((t) => window.scrollTo({ top: t, behavior: 'smooth' }), y);

// ═══════════════════════════════════════════════
// SCENE 1: OVERVIEW TAB (~70s)
// ═══════════════════════════════════════════════
console.log('Scene 1: Overview...');
await page.goto(BASE, { waitUntil: 'networkidle' });
await wait(4000);

// Pan across the stat cards
await page.mouse.move(300, 180);
await wait(1500);
await page.mouse.move(600, 180);
await wait(1500);
await page.mouse.move(900, 180);
await wait(1500);
await page.mouse.move(1200, 180);
await wait(2000);

// Scroll to volume chart
await smoothScroll(350);
await wait(4000);

// Continue to anomaly distribution
await page.mouse.move(1200, 500);
await wait(2000);

// Scroll to recent anomalies section
await smoothScroll(700);
await wait(4000);

// Scroll to recent transactions
await smoothScroll(1100);
await wait(5000);

// ═══════════════════════════════════════════════
// SCENE 2: ANOMALIES TAB (~50s)
// ═══════════════════════════════════════════════
console.log('Scene 2: Anomalies...');
await smoothScroll(0);
await wait(2000);

await page.locator('button[role="tab"]:has-text("Anomalies")').first().click();
await wait(4000);

// Pan across anomaly cards
await page.mouse.move(400, 300);
await wait(2000);
await page.mouse.move(800, 400);
await wait(2000);
await page.mouse.move(600, 550);
await wait(2000);

await smoothScroll(500);
await wait(4000);

await smoothScroll(1000);
await wait(4000);

await smoothScroll(1500);
await wait(4000);

// ═══════════════════════════════════════════════
// SCENE 3: TRANSACTIONS TAB (~50s)
// ═══════════════════════════════════════════════
console.log('Scene 3: Transactions...');
await smoothScroll(0);
await wait(2000);

await page.locator('button[role="tab"]:has-text("Transactions")').first().click();
await wait(4000);

await page.mouse.move(960, 300);
await wait(2000);
await page.mouse.move(500, 450);
await wait(2000);

await smoothScroll(500);
await wait(4000);

await smoothScroll(1000);
await wait(4000);

await smoothScroll(1500);
await wait(4000);

// ═══════════════════════════════════════════════
// SCENE 4: AI ANALYSIS TAB (~40s)
// ═══════════════════════════════════════════════
console.log('Scene 4: AI Analysis...');
await smoothScroll(0);
await wait(2000);

await page.locator('button[role="tab"]:has-text("AI Analysis")').first().click();
await wait(4000);

await page.mouse.move(960, 300);
await wait(3000);
await page.mouse.move(600, 500);
await wait(3000);

await smoothScroll(500);
await wait(4000);

await smoothScroll(1000);
await wait(5000);

// ═══════════════════════════════════════════════
// SCENE 5: CLOSING - Back to Overview (~15s)
// ═══════════════════════════════════════════════
console.log('Scene 5: Closing...');
await smoothScroll(0);
await wait(2000);

await page.locator('button[role="tab"]:has-text("Overview")').first().click();
await wait(4000);

await page.mouse.move(960, 300);
await wait(3000);

console.log('Finalizing...');
await context.close();
await browser.close();

// Process video
const files = fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.webm'));
if (!files.length) { console.error('No video!'); process.exit(1); }

const raw = path.join(VIDEO_DIR, files[0]);
const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${raw}"`).toString().trim());
console.log(`Raw: ${(dur/60).toFixed(1)}min`);

// Slow down if needed to reach ~3 min
let vfilter = 'scale=1920:1080,fps=30';
if (dur < 160) {
  const speed = Math.max(0.3, (dur / 170)).toFixed(3);
  vfilter = `scale=1920:1080,setpts=${speed}*PTS,fps=30`;
  console.log(`Slowing ${speed}x`);
}

execSync(
  `ffmpeg -y -i "${raw}" -c:v libx264 -preset slow -crf 20 -vf "${vfilter}" -an -movflags +faststart "${OUTPUT}" < /dev/null`,
  { stdio: 'inherit', timeout: 300000 }
);

const outDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${OUTPUT}"`).toString().trim());
const outSize = fs.statSync(OUTPUT).size;
console.log(`Done! ${(outDur/60).toFixed(1)}min, ${(outSize/1024/1024).toFixed(1)} MB`);
