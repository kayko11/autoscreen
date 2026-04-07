import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { captureScreenshot } from "../dist/core/capture.js";
import { closeSharedBrowser } from "../dist/core/browser.js";

function createFixtureServer() {
  return createServer((request, response) => {
    if (request.url === "/fixture") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(`<!doctype html>
<html>
  <head>
    <style>
      body { margin: 0; font-family: sans-serif; }
      main { min-height: 2200px; background: linear-gradient(#fafafa, #d7e3ff); }
      [data-testid="fixture-ready"] { display: none; margin-top: 1400px; padding: 24px; background: #1d4ed8; color: white; }
    </style>
  </head>
  <body>
    <main>
      <h1>Autoscreen fixture</h1>
      <p>waiting for ready state...</p>
      <img src="/broken.png" alt="" />
      <section data-testid="fixture-ready">fixture ready</section>
      <script>
        setTimeout(() => {
          document.querySelector('[data-testid="fixture-ready"]').style.display = "block";
        }, 75);
      </script>
    </main>
  </body>
</html>`);
      return;
    }

    if (request.url === "/broken.png") {
      response.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
      response.end("broken");
      return;
    }

    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("not found");
  });
}

test("captureScreenshot works against a real browser fixture page", async () => {
  const server = createFixtureServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();

  try {
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind fixture server");
    }

    const baseUrl = `http://127.0.0.1:${address.port}`;
    const result = await captureScreenshot({
      url: "/fixture",
      baseUrl,
      readyTestIds: ["fixture-ready"],
      viewport: { width: 900, height: 700 },
      scrollTo: { x: 0, y: 100_000 },
      fullPage: false,
      timeoutMs: 5000
    });

    assert.equal(result.matchedTestId, "fixture-ready");
    assert.equal(result.finalUrl, `${baseUrl}/fixture`);
    assert.equal(result.image.byteLength > 0, true);
    assert.deepEqual(result.viewport, { width: 900, height: 700 });
    assert.equal(result.failedResponses.some((entry) => entry.url === `${baseUrl}/broken.png`), true);
  } finally {
    await closeSharedBrowser();
    server.close();
    await once(server, "close");
  }
});
