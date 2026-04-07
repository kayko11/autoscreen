import { chromium } from "playwright";
import type { Browser } from "playwright";
import type { ViewportSize } from "./types.js";

export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_VIEWPORT: ViewportSize = { width: 1440, height: 960 };

let sharedBrowser: Browser | null = null;

export async function getSharedBrowser(): Promise<Browser> {
  if (!sharedBrowser || !sharedBrowser.isConnected()) {
    sharedBrowser = await chromium.launch({ headless: true });
  }

  return sharedBrowser;
}

export async function closeSharedBrowser(): Promise<void> {
  if (!sharedBrowser) {
    return;
  }

  await sharedBrowser.close().catch(() => {});
  sharedBrowser = null;
}
