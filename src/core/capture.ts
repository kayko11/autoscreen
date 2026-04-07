import type { Browser } from "playwright";
import { DEFAULT_TIMEOUT_MS, DEFAULT_VIEWPORT, getSharedBrowser } from "./browser.js";
import { NavigationError, ReadyStateTimeoutError, ScreenshotCaptureError } from "./errors.js";
import { attachNetworkTracker } from "./network.js";
import type { ScreenshotRequest, ScreenshotResult } from "./types.js";
import { waitForAnyReadyTestId } from "./wait.js";
import { resolveTargetUrl } from "../utils/url.js";

export interface CaptureDeps {
  getBrowser?: () => Promise<Browser>;
  now?: () => number;
}

export async function captureScreenshot(
  request: ScreenshotRequest,
  deps: CaptureDeps = {}
): Promise<ScreenshotResult> {
  const now = deps.now ?? Date.now;
  const startedAt = now();
  const browser = await (deps.getBrowser ?? getSharedBrowser)();
  const viewport = request.viewport ?? DEFAULT_VIEWPORT;
  const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const targetUrl = resolveTargetUrl(
    request.url,
    request.baseUrl ?? process.env.AUTOSCREEN_BASE_URL ?? "http://localhost:3000"
  );
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const tracker = attachNetworkTracker(page);

  try {
    try {
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    } catch (error) {
      throw new NavigationError(`Failed to navigate to ${targetUrl}`, error);
    }

    let matchedTestId: string;
    try {
      matchedTestId = await waitForAnyReadyTestId(page, request.readyTestIds, timeoutMs);
    } catch (error) {
      if (error instanceof ReadyStateTimeoutError) {
        error.context = {
          ...error.context,
          resolvedUrl: targetUrl,
          timeoutMs,
          failedRequestCount: tracker.failedRequests.length,
          failedResponseCount: tracker.failedResponses.length,
          droppedFailureEvents: tracker.droppedFailureEvents
        };
      }
      throw error;
    }

    if (request.scrollTo) {
      await page.evaluate(
        ({ x, y }) => window.scrollTo(x, y >= 100_000 ? document.body.scrollHeight : y),
        request.scrollTo
      );
      await page.waitForTimeout(300);
    }

    try {
      const image = await page.screenshot({ fullPage: request.fullPage ?? true, type: "png" });
      return {
        image,
        finalUrl: page.url(),
        matchedTestId,
        durationMs: now() - startedAt,
        failedRequests: tracker.failedRequests,
        failedResponses: tracker.failedResponses,
        droppedFailureEvents: tracker.droppedFailureEvents,
        viewport
      };
    } catch (error) {
      throw new ScreenshotCaptureError("Failed to capture screenshot", error);
    }
  } finally {
    tracker.dispose();
    await context.close().catch(() => {});
  }
}
