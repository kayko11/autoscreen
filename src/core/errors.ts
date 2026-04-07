export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NavigationError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "NavigationError";
  }
}

export class ReadyStateTimeoutError extends Error {
  constructor(message: string, public context?: Record<string, unknown>) {
    super(message);
    this.name = "ReadyStateTimeoutError";
  }
}

export class ScreenshotCaptureError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "ScreenshotCaptureError";
  }
}
