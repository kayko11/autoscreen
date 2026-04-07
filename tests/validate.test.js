import test from "node:test";
import assert from "node:assert/strict";
import { validateScreenshotRequest } from "../dist/validate/screenshot-request.js";
import { ValidationError } from "../dist/core/errors.js";

test("validateScreenshotRequest normalizes legacy MCP fields", () => {
  const result = validateScreenshotRequest({
    url: "/dashboard",
    ready_test_ids: ["dashboard-ready", "dashboard-empty"],
    viewport: { width: 1600, height: 900 },
    scroll_to_bottom: true
  });

  assert.equal(result.url, "/dashboard");
  assert.deepEqual(result.readyTestIds, ["dashboard-ready", "dashboard-empty"]);
  assert.deepEqual(result.viewport, { width: 1600, height: 900 });
  assert.deepEqual(result.scrollTo, { x: 0, y: 100_000 });
  assert.equal(result.fullPage, true);
});

test("validateScreenshotRequest rejects invalid viewport", () => {
  assert.throws(
    () =>
      validateScreenshotRequest({
        url: "/dashboard",
        ready_test_ids: ["dashboard-ready"],
        viewport: { width: 100, height: 900 }
      }),
    ValidationError
  );
});
