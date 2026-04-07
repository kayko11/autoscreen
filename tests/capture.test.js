import test from "node:test";
import assert from "node:assert/strict";
import { captureScreenshot } from "../dist/core/capture.js";
import { ReadyStateTimeoutError } from "../dist/core/errors.js";

function createFakePage(options = {}) {
  const events = new Map();
  let currentUrl = options.initialUrl ?? "http://localhost:3000/dashboard";

  return {
    on(event, handler) {
      events.set(event, handler);
    },
    off(event) {
      events.delete(event);
    },
    async goto(url) {
      currentUrl = url;
      if (options.gotoError) {
        throw options.gotoError;
      }
    },
    async waitForSelector(selector, waitOptions) {
      if (options.waitForSelector) {
        return options.waitForSelector(selector, waitOptions);
      }
      return {};
    },
    async evaluate(fn, arg) {
      if (options.evaluate) {
        return options.evaluate(fn, arg);
      }
      return arg?.[0] ?? null;
    },
    async waitForTimeout() {},
    async screenshot() {
      return Buffer.from("fake-png");
    },
    async title() {
      return options.title ?? "Dashboard";
    },
    url() {
      return currentUrl;
    },
    emit(event, payload) {
      const handler = events.get(event);
      if (handler) {
        handler(payload);
      }
    }
  };
}

function createFakeBrowser(page, lifecycle = {}) {
  const context = {
    async newPage() {
      return page;
    },
    async close() {
      lifecycle.contextClosed = true;
    }
  };

  return {
    async newContext() {
      lifecycle.contextCreated = true;
      return context;
    }
  };
}

test("captureScreenshot returns structured result and bounded network diagnostics", async () => {
  const page = createFakePage({
    waitForSelector() {
      for (let index = 0; index < 25; index += 1) {
        page.emit("requestfailed", {
          method: () => "GET",
          url: () => `https://example.com/${index}`,
          failure: () => ({ errorText: "ERR_FAILED" })
        });
      }

      for (let index = 0; index < 5; index += 1) {
        page.emit("response", {
          status: () => 500,
          url: () => `https://example.com/api/${index}`,
          request: () => ({ method: () => "POST" })
        });
      }

      return {};
    },
    evaluate(_fn, arg) {
      return arg[0];
    }
  });
  const browser = createFakeBrowser(page, {});

  const result = await captureScreenshot(
    {
      url: "/dashboard",
      baseUrl: "http://localhost:3000",
      readyTestIds: ["dashboard-ready"],
      fullPage: true
    },
    {
      getBrowser: async () => browser,
      now: (() => {
        let tick = 0;
        return () => {
          tick += 100;
          return tick;
        };
      })()
    }
  );

  assert.equal(result.finalUrl, "http://localhost:3000/dashboard");
  assert.equal(result.matchedTestId, "dashboard-ready");
  assert.equal(result.failedRequests.length, 20);
  assert.equal(result.failedResponses.length, 5);
  assert.equal(result.droppedFailureEvents, 5);
  assert.deepEqual(result.viewport, { width: 1440, height: 960 });
});

test("captureScreenshot enriches ready timeout errors", async () => {
  const page = createFakePage({
    async waitForSelector() {
      throw new Error("timeout");
    },
    async evaluate() {
      return null;
    }
  });
  const browser = createFakeBrowser(page, {});

  await assert.rejects(
    captureScreenshot(
      {
        url: "/dashboard",
        baseUrl: "http://localhost:3000",
        readyTestIds: ["dashboard-ready"],
        timeoutMs: 1234
      },
      { getBrowser: async () => browser }
    ),
    (error) => {
      assert.ok(error instanceof ReadyStateTimeoutError);
      assert.equal(error.context.resolvedUrl, "http://localhost:3000/dashboard");
      assert.equal(error.context.timeoutMs, 1234);
      assert.equal(error.context.failedRequestCount, 0);
      assert.equal(error.context.failedResponseCount, 0);
      return true;
    }
  );
});
