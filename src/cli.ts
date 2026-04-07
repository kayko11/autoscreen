#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { captureScreenshot } from "./core/capture.js";
import { ValidationError } from "./core/errors.js";
import { validateScreenshotRequest } from "./validate/screenshot-request.js";

export function parseCliArgs(argv: string[]): Record<string, unknown> {
  const [url, testIdsArg, widthArg, heightArg, scrollArg] = argv;

  if (!url || !testIdsArg) {
    throw new ValidationError(
      "Usage: autoscreen-cli <url> <testid1,testid2> [width] [height] [scroll_bottom]"
    );
  }

  const viewport =
    widthArg || heightArg
      ? {
          width: Number(widthArg) || 1440,
          height: Number(heightArg) || 960
        }
      : undefined;

  return {
    url,
    ready_test_ids: testIdsArg.split(",").map((entry) => entry.trim()).filter(Boolean),
    viewport,
    scroll_to_bottom: scrollArg === "true"
  };
}

async function main(): Promise<void> {
  const request = validateScreenshotRequest(parseCliArgs(process.argv.slice(2)));
  const result = await captureScreenshot(request);
  const outPath = join(tmpdir(), `autoscreen-${Date.now()}.png`);
  writeFileSync(outPath, result.image);

  process.stdout.write(
    JSON.stringify({
      path: outPath,
      url: result.finalUrl,
      matchedTestId: result.matchedTestId,
      durationMs: result.durationMs,
      viewport: result.viewport,
      failedRequests: result.failedRequests,
      failedResponses: result.failedResponses,
      droppedFailureEvents: result.droppedFailureEvents,
      sizeBytes: result.image.byteLength
    }) + "\n"
  );
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
