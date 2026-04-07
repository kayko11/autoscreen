import type { Page, Request, Response } from "playwright";
import type { FailedRequestInfo, FailedResponseInfo } from "./types.js";

export interface NetworkTracker {
  failedRequests: FailedRequestInfo[];
  failedResponses: FailedResponseInfo[];
  droppedFailureEvents: number;
  dispose(): void;
}

function pushWithCap<T>(entries: T[], entry: T, maxEntries: number, state: { dropped: number }): void {
  if (entries.length < maxEntries) {
    entries.push(entry);
    return;
  }

  state.dropped += 1;
}

export function attachNetworkTracker(page: Page, limits?: { maxEntries?: number }): NetworkTracker {
  const maxEntries = limits?.maxEntries ?? 20;
  const failedRequests: FailedRequestInfo[] = [];
  const failedResponses: FailedResponseInfo[] = [];
  const state = { dropped: 0 };

  const onRequestFailed = (request: Request) => {
    pushWithCap(
      failedRequests,
      {
        method: request.method(),
        url: request.url(),
        errorText: request.failure()?.errorText ?? "unknown"
      },
      maxEntries,
      state
    );
  };

  const onResponse = (response: Response) => {
    if (response.status() < 400) {
      return;
    }

    pushWithCap(
      failedResponses,
      {
        status: response.status(),
        method: response.request().method(),
        url: response.url()
      },
      maxEntries,
      state
    );
  };

  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  return {
    failedRequests,
    failedResponses,
    get droppedFailureEvents() {
      return state.dropped;
    },
    dispose() {
      page.off("requestfailed", onRequestFailed);
      page.off("response", onResponse);
    }
  };
}
