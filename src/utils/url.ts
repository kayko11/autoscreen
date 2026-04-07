import { ValidationError } from "../core/errors.js";

function isAbsoluteUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveTargetUrl(pathOrUrl: string, baseUrl?: string): string {
  if (typeof pathOrUrl !== "string" || pathOrUrl.trim() === "") {
    throw new ValidationError("url must be a non-empty string");
  }

  const trimmed = pathOrUrl.trim();

  if (isAbsoluteUrl(trimmed)) {
    return new URL(trimmed).toString();
  }

  if (!baseUrl) {
    throw new ValidationError("baseUrl is required when url is not absolute");
  }

  let resolvedBase: URL;
  try {
    resolvedBase = new URL(baseUrl);
  } catch {
    throw new ValidationError(`Invalid baseUrl: ${baseUrl}`);
  }

  if (resolvedBase.protocol !== "http:" && resolvedBase.protocol !== "https:") {
    throw new ValidationError(`Unsupported baseUrl protocol: ${resolvedBase.protocol}`);
  }

  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return new URL(normalizedPath, resolvedBase).toString();
}
