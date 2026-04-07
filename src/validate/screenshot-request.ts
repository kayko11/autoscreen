import { DEFAULT_TIMEOUT_MS, DEFAULT_VIEWPORT } from "../core/browser.js";
import { ValidationError } from "../core/errors.js";
import type { ScreenshotRequest } from "../core/types.js";

export interface ValidatedScreenshotRequest extends Required<Pick<ScreenshotRequest, "url" | "readyTestIds" | "viewport" | "fullPage" | "timeoutMs">> {
  baseUrl?: string;
  scrollTo?: NonNullable<ScreenshotRequest["scrollTo"]>;
}

const MIN_VIEWPORT = 200;
const MAX_VIEWPORT = 5000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 120_000;
const MAX_READY_TEST_IDS = 50;

type RawScreenshotRequest = {
  url?: unknown;
  ready_test_ids?: unknown;
  readyTestIds?: unknown;
  base_url?: unknown;
  baseUrl?: unknown;
  viewport?: unknown;
  scroll_to?: unknown;
  scrollTo?: unknown;
  scroll_to_bottom?: unknown;
  full_page?: unknown;
  fullPage?: unknown;
  timeout_ms?: unknown;
  timeoutMs?: unknown;
};

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("request must be an object");
  }

  return value as Record<string, unknown>;
}

function parseInteger(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ValidationError(`${field} must be an integer`);
  }

  if (value < min || value > max) {
    throw new ValidationError(`${field} must be between ${min} and ${max}`);
  }

  return value;
}

function parseOptionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new ValidationError(`${field} must be a boolean`);
  }

  return value;
}

function parseReadyTestIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError("ready_test_ids must be a non-empty array of strings");
  }

  if (value.length > MAX_READY_TEST_IDS) {
    throw new ValidationError(`ready_test_ids must contain at most ${MAX_READY_TEST_IDS} values`);
  }

  const readyTestIds = value.map((entry) => {
    if (typeof entry !== "string" || entry.trim() === "") {
      throw new ValidationError("ready_test_ids must contain only non-empty strings");
    }

    return entry.trim();
  });

  return Array.from(new Set(readyTestIds));
}

function parseViewport(value: unknown): ValidatedScreenshotRequest["viewport"] {
  if (value === undefined) {
    return { ...DEFAULT_VIEWPORT };
  }

  const record = asObject(value);
  return {
    width: parseInteger(record.width, "viewport.width", MIN_VIEWPORT, MAX_VIEWPORT),
    height: parseInteger(record.height, "viewport.height", MIN_VIEWPORT, MAX_VIEWPORT)
  };
}

function parseScrollTo(value: unknown): ValidatedScreenshotRequest["scrollTo"] | undefined {
  if (value === undefined) {
    return undefined;
  }

  const record = asObject(value);
  return {
    x: parseInteger(record.x, "scroll_to.x", 0, 100_000),
    y: parseInteger(record.y, "scroll_to.y", 0, 100_000)
  };
}

export function validateScreenshotRequest(input: unknown): ValidatedScreenshotRequest {
  const raw = asObject(input) as RawScreenshotRequest;
  const url = raw.url;

  if (typeof url !== "string" || url.trim() === "") {
    throw new ValidationError("url must be a non-empty string");
  }

  const readyTestIds = parseReadyTestIds(raw.readyTestIds ?? raw.ready_test_ids);
  const viewport = parseViewport(raw.viewport);
  const timeoutMs = raw.timeoutMs ?? raw.timeout_ms ?? DEFAULT_TIMEOUT_MS;
  const parsedTimeoutMs = parseInteger(timeoutMs, "timeout_ms", MIN_TIMEOUT_MS, MAX_TIMEOUT_MS);
  const fullPage = parseOptionalBoolean(raw.fullPage ?? raw.full_page, "full_page") ?? true;

  if (raw.baseUrl !== undefined && typeof raw.baseUrl !== "string") {
    throw new ValidationError("base_url must be a string");
  }

  if (raw.base_url !== undefined && typeof raw.base_url !== "string") {
    throw new ValidationError("base_url must be a string");
  }

  const explicitScrollTo = parseScrollTo(raw.scrollTo ?? raw.scroll_to);
  const scrollToBottom = parseOptionalBoolean(raw.scroll_to_bottom, "scroll_to_bottom") ?? false;

  return {
    url: url.trim(),
    readyTestIds,
    baseUrl: (raw.baseUrl ?? raw.base_url) as string | undefined,
    viewport,
    fullPage,
    timeoutMs: parsedTimeoutMs,
    scrollTo: explicitScrollTo ?? (scrollToBottom ? { x: 0, y: 100_000 } : undefined)
  };
}
