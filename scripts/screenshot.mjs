#!/usr/bin/env node
/**
 * AutoScreen screenshot script.
 * Usage: node screenshot.mjs <url> <testid1,testid2,...> [width] [height] [scroll_bottom]
 * Outputs: JSON { path, url, matchedTestId, durationMs } to stdout
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT ?? dirname(SCRIPT_DIR);

// Ensure playwright is available, installing if needed
async function loadPlaywright() {
  try {
    const req = createRequire(join(PLUGIN_ROOT, "package.json"));
    return req("playwright");
  } catch {
    process.stderr.write("AutoScreen: installing playwright (one-time setup)...\n");
    execSync("npm install --prefix " + JSON.stringify(PLUGIN_ROOT) + " playwright", { stdio: "inherit" });
    execSync("npx --prefix " + JSON.stringify(PLUGIN_ROOT) + " playwright install chromium", { stdio: "inherit" });
    const req = createRequire(join(PLUGIN_ROOT, "package.json"));
    return req("playwright");
  }
}

const [, , url, testIdsArg, widthArg, heightArg, scrollArg] = process.argv;

if (!url || !testIdsArg) {
  process.stderr.write("Usage: screenshot.mjs <url> <testid1,testid2> [width] [height] [scroll_bottom]\n");
  process.exit(1);
}

const baseUrl = process.env.AUTOSCREEN_BASE_URL ?? "http://localhost:3000";
const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;
const testIds = testIdsArg.split(",").map((s) => s.trim()).filter(Boolean);
const viewport = { width: Number(widthArg) || 1440, height: Number(heightArg) || 960 };
const scrollToBottom = scrollArg === "true";

const outPath = join(tmpdir(), `autoscreen-${Date.now()}.png`);

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
const page = await context.newPage();

const start = Date.now();
try {
  await page.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

  const deadline = Date.now() + 30_000;
  let matchedTestId = null;
  while (Date.now() < deadline) {
    for (const id of testIds) {
      const visible = await page.getByTestId(id).first().isVisible().catch(() => false);
      if (visible) { matchedTestId = id; break; }
    }
    if (matchedTestId) break;
    await page.waitForTimeout(150);
  }

  if (!matchedTestId) {
    throw new Error(`Timed out waiting for testIds: [${testIds.join(", ")}]`);
  }

  if (scrollToBottom) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
  }

  const buffer = await page.screenshot({ fullPage: true, type: "png" });
  writeFileSync(outPath, buffer);

  process.stdout.write(JSON.stringify({
    path: outPath,
    url: page.url(),
    matchedTestId,
    durationMs: Date.now() - start
  }) + "\n");
} finally {
  await browser.close();
}
