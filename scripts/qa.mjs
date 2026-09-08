import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:4321";
const OUT = "/tmp/qa";
fs.mkdirSync(OUT, { recursive: true });

const viewports = {
  mobile360: { width: 360, height: 780 },
  mobile390: { width: 390, height: 844 },
  mobile412: { width: 412, height: 915 },
  mobile430: { width: 430, height: 932 },
  desktop: { width: 1440, height: 900 },
};

async function run(name, viewport) {
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const consoleErrors = [];
  const pageErrors = [];

  const context = await browser.newContext({ viewport, hasTouch: name.startsWith("mobile") });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  await page.goto(`${BASE}/demo`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // 1. Cover state — no video playing, no audio yet
  const coverOverflow = await page.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
    };
  });
  await page.screenshot({ path: `${OUT}/${name}_1_cover.png` });

  const videoPausedBeforeTap = await page.evaluate(() => {
    const v = document.querySelector("video");
    return v ? v.paused : null;
  });

  // 2. Tap to reveal
  await page.click('button[aria-label="Tap to reveal the invitation"]');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}_2_video_start.png` });

  const stateAfterTap = await page.evaluate(() => {
    const v = document.querySelector("video");
    return { videoPaused: v ? v.paused : null, videoMuted: v ? v.muted : null, videoCurrentTime: v ? v.currentTime : null };
  });

  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/${name}_3_video_mid.png` });

  // Sound toggle mid-playback
  const soundBtn = await page.$('button[aria-pressed]');
  let toggleWorks = false;
  if (soundBtn) {
    const before = await page.evaluate(() => document.querySelector("video").muted);
    await soundBtn.click();
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => document.querySelector("video").muted);
    await soundBtn.click();
    await page.waitForTimeout(200);
    const after2 = await page.evaluate(() => document.querySelector("video").muted);
    toggleWorks = before !== after && after2 === before;
  }

  // Double-tap guard check: click cover area again (should be inert now)
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Tap to reveal the invitation"]');
    if (btn) btn.click();
  });

  // 3. Wait for video to end (~10.1s total) and card to appear
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${OUT}/${name}_4_transition.png` });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/${name}_5_card.png` });

  const stateAtCard = await page.evaluate(() => {
    return {
      cardVisible: !!document.body.innerText.includes("Bengaluru"),
      soundToggleGone: !document.querySelector('button[aria-pressed]'),
    };
  });

  await context.close();
  await browser.close();

  return {
    name,
    coverOverflow,
    videoPausedBeforeTap,
    stateAfterTap,
    stateAtCard,
    toggleWorks,
    consoleErrors,
    pageErrors,
  };
}

const results = [];
for (const [name, vp] of Object.entries(viewports)) {
  results.push(await run(name, vp));
}

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
