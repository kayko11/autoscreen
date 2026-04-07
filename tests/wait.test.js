import test from "node:test";
import assert from "node:assert/strict";
import { buildReadySelector } from "../dist/core/wait.js";

test("buildReadySelector joins test ids into one selector", () => {
  assert.equal(
    buildReadySelector(["dashboard-ready", "dashboard-empty"]),
    '[data-testid="dashboard-ready"], [data-testid="dashboard-empty"]'
  );
});
