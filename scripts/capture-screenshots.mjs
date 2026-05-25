import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const baseUrl = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:5173";
const outputDir = new URL("../docs/assets/screenshots/", import.meta.url);
const storageKey = "phsc-11000-study-progress-v1";
const screenshotSeed = process.env.SCREENSHOT_RANDOM_SEED ?? "phsc-11000-screenshots";

async function seedRandom(page) {
  await page.addInitScript((seedValue) => {
    let state = 0;
    for (let index = 0; index < seedValue.length; index += 1) {
      state = Math.imul(31, state) + seedValue.charCodeAt(index) | 0;
    }
    if (state === 0) state = 0x6d2b79f5;

    Math.random = () => {
      state |= 0;
      state = state + 0x6d2b79f5 | 0;
      let result = Math.imul(state ^ state >>> 15, 1 | state);
      result = result + Math.imul(result ^ result >>> 7, 61 | result) ^ result;
      return ((result ^ result >>> 14) >>> 0) / 4294967296;
    };
  }, screenshotSeed);
}

async function resetProgress(page, progress = null) {
  await page.evaluate(
    ({ key, value }) => {
      if (value) {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.removeItem(key);
      }
    },
    { key: storageKey, value: progress }
  );
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
      deviceScaleFactor: 1
    });
    await seedRandom(page);

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await resetProgress(page);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    await page.screenshot({ path: fileURLToPath(new URL("dashboard.png", outputDir)), fullPage: true });

    await page.getByRole("button", { name: "Mock Exam" }).click();
    await page.waitForSelector(".question-panel");
    await page.waitForTimeout(300);
    await page.screenshot({ path: fileURLToPath(new URL("mock-exam.png", outputDir)), fullPage: true });

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await resetProgress(page);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(".dashboard-hero");

    await page.getByRole("button", { name: "Freestyle" }).click();
    await page.waitForSelector(".question-panel");
    await page.waitForTimeout(300);
    await page.screenshot({ path: fileURLToPath(new URL("freestyle.png", outputDir)), fullPage: true });
    await page.locator(".choice").first().click();
    await page.waitForSelector(".feedback");
    await page.waitForTimeout(1800);
    await page.screenshot({ path: fileURLToPath(new URL("freestyle-feedback.png", outputDir)), fullPage: true });

    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await resetProgress(page);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    await page.screenshot({ path: fileURLToPath(new URL("mobile.png", outputDir)), fullPage: true });
    await page.getByRole("button", { name: "Freestyle" }).click();
    await page.waitForSelector(".question-panel");
    await page.waitForTimeout(300);
    await page.screenshot({ path: fileURLToPath(new URL("mobile-freestyle.png", outputDir)), fullPage: true });

    await page.close();
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
