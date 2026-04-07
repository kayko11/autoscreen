export interface ViewportSize {
  width: number;
  height: number;
}

export interface ScrollPosition {
  x: number;
  y: number;
}

export interface ScreenshotRequest {
  url: string;
  readyTestIds: string[];
  baseUrl?: string;
  viewport?: ViewportSize;
  fullPage?: boolean;
  scrollTo?: ScrollPosition;
  timeoutMs?: number;
}

export interface FailedRequestInfo {
  method: string;
  url: string;
  errorText: string;
}

export interface FailedResponseInfo {
  status: number;
  method: string;
  url: string;
}

export interface ScreenshotResult {
  image: Buffer;
  finalUrl: string;
  matchedTestId: string;
  durationMs: number;
  failedRequests: FailedRequestInfo[];
  failedResponses: FailedResponseInfo[];
  droppedFailureEvents: number;
  viewport: ViewportSize;
}
