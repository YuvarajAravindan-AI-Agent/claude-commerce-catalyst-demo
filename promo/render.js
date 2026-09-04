const { chromium } = require('playwright');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('node:child_process');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1080, height: 1080 }, recordVideo: { dir: path.join(__dirname, 'recordings'), size: { width: 1080, height: 1080 } } });
  const page = await context.newPage();
  await page.goto(`file://${path.join(__dirname, 'scene.html')}`);
  await page.waitForTimeout(79000);
  const recorded = await page.video().path();
  await context.close(); await browser.close();
  const out = '/home/yuvaraj/Documents/project-podcast-thumbnails/zoho-catalyst-3.0-promo/claude-commerce-catalyst-promo.mp4';
  const child = spawn(ffmpeg, ['-y', '-i', recorded, '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: 'inherit' });
  child.on('exit', (code) => { if (code) process.exit(code); console.log(out); });
})();
