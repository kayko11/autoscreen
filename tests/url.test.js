import test from "node:test";
import assert from "node:assert/strict";
import { resolveTargetUrl } from "../dist/utils/url.js";
import { ValidationError } from "../dist/core/errors.js";

test("resolveTargetUrl keeps absolute URLs", () => {
  assert.equal(resolveTargetUrl("https://example.com/path?q=1"), "https://example.com/path?q=1");
});

test("resolveTargetUrl resolves relative paths against base url", () => {
  assert.equal(
    resolveTargetUrl("dashboard?tab=overview", "http://localhost:3000/app/"),
    "http://localhost:3000/dashboard?tab=overview"
  );
});

test("resolveTargetUrl rejects relative paths without base url", () => {
  assert.throws(() => resolveTargetUrl("/dashboard"), ValidationError);
});
