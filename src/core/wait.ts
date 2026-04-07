import type { Page } from "playwright";
import { ReadyStateTimeoutError, ValidationError } from "./errors.js";

function escapeAttributeValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function buildReadySelector(testIds: string[]): string {
  if (testIds.length === 0) {
    throw new ValidationError("readyTestIds must contain at least one value");
  }

  return testIds.map((testId) => `[data-testid="${escapeAttributeValue(testId)}"]`).join(", ");
}

export async function waitForAnyReadyTestId(
  page: Page,
  testIds: string[],
  timeoutMs: number
): Promise<string> {
  const selector = buildReadySelector(testIds);

  try {
    await page.waitForSelector(selector, { state: "visible", timeout: timeoutMs });
  } catch (error) {
    const title = await page.title().catch(() => "");
    throw new ReadyStateTimeoutError(
      `Timed out after ${timeoutMs}ms waiting for any ready test id`,
      {
        expectedReadyTestIds: testIds,
        currentUrl: page.url(),
        pageTitle: title || undefined,
        selector
      }
    );
  }

  const matched = await page.evaluate((ids) => {
    for (const id of ids) {
      const element = document.querySelector<HTMLElement>(`[data-testid="${CSS.escape(id)}"]`);
      if (!element) {
        continue;
      }

      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const visible =
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none";

      if (visible) {
        return id;
      }
    }

    return null;
  }, testIds);

  if (!matched) {
    throw new ReadyStateTimeoutError("Ready selector matched but no visible test id could be resolved", {
      expectedReadyTestIds: testIds,
      currentUrl: page.url(),
      selector
    });
  }

  return matched;
}
