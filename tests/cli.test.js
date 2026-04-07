import test from "node:test";
import assert from "node:assert/strict";
import { parseCliArgs } from "../dist/cli.js";
import { formatToolError } from "../dist/index.js";
import { ReadyStateTimeoutError, ValidationError } from "../dist/core/errors.js";

test("parseCliArgs parses CLI arguments into request input", () => {
  assert.deepEqual(parseCliArgs(["/dashboard", "ready,empty", "1600", "900", "true"]), {
    url: "/dashboard",
    ready_test_ids: ["ready", "empty"],
    viewport: { width: 1600, height: 900 },
    scroll_to_bottom: true
  });
});

test("parseCliArgs rejects missing required arguments", () => {
  assert.throws(() => parseCliArgs([]), ValidationError);
});

test("formatToolError returns validation message without empty json", () => {
  assert.equal(formatToolError(new ValidationError("bad request")), "bad request");
});

test("formatToolError includes timeout context", () => {
  const error = new ReadyStateTimeoutError("timed out", { currentUrl: "http://localhost:3000" });
  assert.match(formatToolError(error), /currentUrl/);
});
