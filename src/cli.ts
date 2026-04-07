#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { captureScreenshot } from "./core/capture.js";
import { closeSharedBrowser } from "./core/browser.js";
import { ValidationError } from "./core/errors.js";
import { validateScreenshotRequest } from "./validate/screenshot-request.js";

function splitReadyTestIds(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function parseFlagBoolean(rawValue: string | undefined, flagName: string): boolean {
  if (rawValue === undefined) {
    return true;
  }

  const normalized = rawValue.toLowerCase();

  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (normalized === "false" || normalized === "0") {
    return false;
  }

  throw new ValidationError(`${flagName} must be true/false or 1/0 when a value is provided`);
}

function isFlagToken(value: string | undefined): boolean {
  return value?.startsWith("--") ?? false;
}

function requireFlagValue(next: string | undefined, flagName: string): string {
  if (next === undefined || isFlagToken(next)) {
    throw new ValidationError(`${flagName} requires a value`);
  }

  return next;
}

function parseNamedCliArgs(argv: string[]): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (!argument.startsWith("--")) {
      throw new ValidationError(`Unknown positional argument: ${argument}`);
    }

    const flagName = argument.slice(2);
    const next = argv[index + 1];

    switch (flagName) {
      case "url":
        parsed.url = requireFlagValue(next, "--url");
        index += 1;
        break;
      case "ready-test-ids":
        parsed.ready_test_ids = splitReadyTestIds(requireFlagValue(next, "--ready-test-ids"));
        index += 1;
        break;
      case "base-url":
        parsed.base_url = requireFlagValue(next, "--base-url");
        index += 1;
        break;
      case "width":
        parsed.viewport = {
          ...(parsed.viewport as Record<string, unknown> | undefined),
          width: Number(requireFlagValue(next, "--width"))
        };
        index += 1;
        break;
      case "height":
        parsed.viewport = {
          ...(parsed.viewport as Record<string, unknown> | undefined),
          height: Number(requireFlagValue(next, "--height"))
        };
        index += 1;
        break;
      case "scroll-bottom":
        parsed.scroll_to_bottom = parseFlagBoolean(
          isFlagToken(next) ? undefined : next,
          "--scroll-bottom"
        );
        if (!isFlagToken(next) && next !== undefined) {
          index += 1;
        }
        break;
      case "full-page":
        parsed.full_page = parseFlagBoolean(
          isFlagToken(next) ? undefined : next,
          "--full-page"
        );
        if (!isFlagToken(next) && next !== undefined) {
          index += 1;
        }
        break;
      case "timeout-ms":
        parsed.timeout_ms = Number(requireFlagValue(next, "--timeout-ms"));
        index += 1;
        break;
      default:
        throw new ValidationError(`Unknown CLI flag: --${flagName}`);
    }
  }

  return parsed;
}

function parseLegacyCliArgs(argv: string[]): Record<string, unknown> {
  const [url, testIdsArg, widthArg, heightArg, scrollArg] = argv;

  if (!url || !testIdsArg) {
    throw new ValidationError(
      "Usage: autoscreen-cli --url <url> --ready-test-ids <id1,id2> [--width <px>] [--height <px>] [--scroll-bottom] [--base-url <url>] [--timeout-ms <ms>] [--full-page <true|false>]"
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
    ready_test_ids: splitReadyTestIds(testIdsArg),
    viewport,
    scroll_to_bottom: scrollArg === "true"
  };
}

export function parseCliArgs(argv: string[]): Record<string, unknown> {
  if (argv.length === 0) {
    throw new ValidationError(
      "Usage: autoscreen-cli --url <url> --ready-test-ids <id1,id2> [--width <px>] [--height <px>] [--scroll-bottom] [--base-url <url>] [--timeout-ms <ms>] [--full-page <true|false>]"
    );
  }

  return argv[0].startsWith("--") ? parseNamedCliArgs(argv) : parseLegacyCliArgs(argv);
}

async function main(): Promise<void> {
  try {
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
  } finally {
    await closeSharedBrowser();
  }
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
