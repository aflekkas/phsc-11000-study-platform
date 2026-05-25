import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const baseUrl = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:5173";
const outputDir = new URL("../docs/assets/screenshots/", import.meta.url);

async function main() {
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.screenshot({ path: fileURLToPath(new URL("dashboard.png", outputDir)), fullPage: true });

  await page.getByRole("button", { name: "Freestyle Practice" }).click();
  await page.waitForSelector(".question-panel");
  await page.screenshot({ path: fileURLToPath(new URL("freestyle.png", outputDir)), fullPage: true });

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.screenshot({ path: fileURLToPath(new URL("mobile.png", outputDir)), fullPage: true });

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
