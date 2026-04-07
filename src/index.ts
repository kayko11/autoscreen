#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { captureScreenshot } from "./core/capture.js";
import { closeSharedBrowser } from "./core/browser.js";
import { ReadyStateTimeoutError, ValidationError } from "./core/errors.js";
import { validateScreenshotRequest } from "./validate/screenshot-request.js";

const server = new Server(
  { name: "autoscreen", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "screenshot",
      description:
        "Navigate to a URL, wait for one of the given data-testid elements to become visible (confirming real data has loaded), then return a screenshot for visual review. " +
        "Use ready_test_ids to gate the capture on actual content — e.g. ['market-ready', 'market-empty'] fires as soon as either appears. " +
        "Set base_url to point at your local dev server (default: http://localhost:3000).",
      inputSchema: {
        type: "object" as const,
        required: ["url", "ready_test_ids"],
        properties: {
          url: {
            type: "string",
            description: "Full URL or an absolute path like /dashboard?tab=overview"
          },
          base_url: {
            type: "string",
            description: "Base URL of the running app. Defaults to AUTOSCREEN_BASE_URL env var or http://localhost:3000"
          },
          ready_test_ids: {
            type: "array",
            items: { type: "string" },
            description: "data-testid values to wait for. Screenshot fires as soon as any one is visible."
          },
          viewport: {
            type: "object",
            properties: {
              width: { type: "number" },
              height: { type: "number" }
            },
            description: "Viewport size. Defaults to 1440×960."
          },
          scroll_to_bottom: {
            type: "boolean",
            description: "Scroll to the bottom of the page before capturing. Useful for revealing below-fold content."
          },
          full_page: {
            type: "boolean",
            description: "Capture the full scrollable page. Defaults to true."
          }
        }
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "screenshot") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  try {
    const validated = validateScreenshotRequest(request.params.arguments ?? {});
    const result = await captureScreenshot(validated);
    const meta = {
      url: result.finalUrl,
      ready_test_id_matched: result.matchedTestId,
      duration_ms: result.durationMs,
      viewport: result.viewport,
      size_bytes: result.image.byteLength,
      ...(result.failedRequests.length > 0 && { failed_requests: result.failedRequests }),
      ...(result.failedResponses.length > 0 && { failed_responses: result.failedResponses }),
      ...(result.droppedFailureEvents > 0 && { dropped_failure_events: result.droppedFailureEvents })
    };

    return {
      content: [
        { type: "image", data: result.image.toString("base64"), mimeType: "image/png" },
        { type: "text", text: JSON.stringify(meta, null, 2) }
      ]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const context =
      error instanceof ReadyStateTimeoutError || error instanceof ValidationError
        ? JSON.stringify(
            error instanceof ReadyStateTimeoutError ? error.context ?? {} : {},
            null,
            2
          )
        : null;

    return {
      isError: true,
      content: [
        {
          type: "text",
          text: context ? `${message}\n${context}` : message
        }
      ]
    };
  }
});

process.on("SIGINT", async () => {
  await closeSharedBrowser();
  process.exit(0);
});

const transport = new StdioServerTransport();
await server.connect(transport);
