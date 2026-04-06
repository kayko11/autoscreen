import { chromium } from "playwright";
import type { Browser, Page } from "playwright";

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }
}

export type ScreenshotResult = {
  base64: string;
  url: string;
  readyTestId: string;
  durationMs: number;
  failedRequests: string[];
  failedResponses: string[];
};

export async function takeScreenshot(args: {
  url: string;
  baseUrl?: string;
  readyTestIds: string[];
  viewport?: { width: number; height: number };
  scrollToBottom?: boolean;
  fullPage?: boolean;
}): Promise<ScreenshotResult> {
  const start = Date.now();
  const baseUrl = args.baseUrl ?? process.env.AUTOSCREEN_BASE_URL ?? "http://localhost:3000";
  const viewport = args.viewport ?? { width: 1440, height: 960 };
  const fullUrl = args.url.startsWith("http") ? args.url : `${baseUrl}${args.url}`;

  const b = await getBrowser();
  const context = await b.newContext({ viewport, ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const failedRequests: string[] = [];
  const failedResponses: string[] = [];

  page.on("requestfailed", (req) => {
    failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText ?? "unknown"}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 400) {
      failedResponses.push(`${res.status()} ${res.request().method()} ${res.url()}`);
    }
  });

  try {
    await page.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

    const readyTestId = await waitForAnyTestId(page, args.readyTestIds, 30_000);

    if (args.scrollToBottom) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);
    }

    const buffer = await page.screenshot({ fullPage: args.fullPage ?? true, type: "png" });

    return {
      base64: buffer.toString("base64"),
      url: page.url(),
      readyTestId,
      durationMs: Date.now() - start,
      failedRequests,
      failedResponses
    };
  } finally {
    await context.close().catch(() => {});
  }
}

async function waitForAnyTestId(page: Page, testIds: string[], timeout: number): Promise<string> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    for (const testId of testIds) {
      const visible = await page.getByTestId(testId).first().isVisible().catch(() => false);
      if (visible) return testId;
    }
    await page.waitForTimeout(150);
  }

  throw new Error(`Timed out waiting for testIds: [${testIds.join(", ")}]`);
}
