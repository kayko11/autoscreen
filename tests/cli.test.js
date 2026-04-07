import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { parseCliArgs } from "../dist/cli.js";
import { formatToolError } from "../dist/index.js";
import { ReadyStateTimeoutError, ValidationError } from "../dist/core/errors.js";

const execFileAsync = promisify(execFile);
const cliPath = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

function createFixtureServer() {
  const server = createServer((request, response) => {
    if (request.url === "/dashboard") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(`<!doctype html>
<html>
  <body style="margin:0">
    <div style="height:1600px;background:linear-gradient(#fff,#ddd)">
      <div id="status">loading</div>
      <div data-testid="dashboard-empty" style="display:none">empty</div>
      <script>
        setTimeout(() => {
          document.querySelector('[data-testid="dashboard-empty"]').style.display = "block";
          document.getElementById("status").textContent = "ready";
        }, 50);
      </script>
    </div>
  </body>
</html>`);
      return;
    }

    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("not found");
  });

  return server;
}

test("parseCliArgs parses legacy positional arguments into request input", () => {
  assert.deepEqual(parseCliArgs(["/dashboard", "ready,empty", "1600", "900", "true"]), {
    url: "/dashboard",
    ready_test_ids: ["ready", "empty"],
    viewport: { width: 1600, height: 900 },
    scroll_to_bottom: true
  });
});

test("parseCliArgs parses named flags into request input", () => {
  assert.deepEqual(
    parseCliArgs([
      "--url",
      "/dashboard",
      "--ready-test-ids",
      "ready,empty",
      "--width",
      "1600",
      "--height",
      "900",
      "--scroll-bottom",
      "--base-url",
      "http://localhost:3000",
      "--timeout-ms",
      "5000",
      "--full-page",
      "false"
    ]),
    {
      url: "/dashboard",
      ready_test_ids: ["ready", "empty"],
      viewport: { width: 1600, height: 900 },
      scroll_to_bottom: true,
      base_url: "http://localhost:3000",
      timeout_ms: 5000,
      full_page: false
    }
  );
});

test("parseCliArgs rejects missing required arguments", () => {
  assert.throws(() => parseCliArgs([]), ValidationError);
});

test("parseCliArgs rejects missing named flag values clearly", () => {
  assert.throws(
    () => parseCliArgs(["--url", "--width", "1440", "--ready-test-ids", "ready"]),
    /--url requires a value/
  );
});

test("parseCliArgs accepts flexible boolean flag values", () => {
  assert.deepEqual(
    parseCliArgs(["--url", "/dashboard", "--ready-test-ids", "ready", "--full-page", "0"]),
    {
      url: "/dashboard",
      ready_test_ids: ["ready"],
      full_page: false
    }
  );
});

test("formatToolError returns validation message without empty json", () => {
  assert.equal(formatToolError(new ValidationError("bad request")), "bad request");
});

test("formatToolError includes timeout context", () => {
  const error = new ReadyStateTimeoutError("timed out", { currentUrl: "http://localhost:3000" });
  assert.match(formatToolError(error), /currentUrl/);
});

test("autoscreen-cli supports named flags end to end", async () => {
  const server = createFixtureServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();

  try {
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind fixture server");
    }

    const { stdout } = await execFileAsync("node", [
      cliPath,
      "--url",
      "/dashboard",
      "--base-url",
      `http://127.0.0.1:${address.port}`,
      "--ready-test-ids",
      "dashboard-ready,dashboard-empty",
      "--width",
      "900",
      "--height",
      "700",
      "--scroll-bottom"
    ]);

    const result = JSON.parse(stdout);
    assert.equal(result.matchedTestId, "dashboard-empty");
    assert.match(result.url, /\/dashboard$/);
    assert.deepEqual(result.viewport, { width: 900, height: 700 });
    assert.equal(typeof result.path, "string");
  } finally {
    server.close();
    await once(server, "close");
  }
});
