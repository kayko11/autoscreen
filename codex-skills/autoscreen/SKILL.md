---
name: autoscreen
description: Use when the user asks for a screenshot, visual review, UI audit, layout check, or when you've just changed UI and should verify the result visually.
---

# AutoScreen

Use AutoScreen when visual context matters: screenshotting a running app, checking a layout bug, verifying a UI change, or doing a quick UX audit.

AutoScreen exposes an MCP tool that opens a live page, waits for one of the supplied `data-testid` ready-state markers, and returns a screenshot. This avoids capturing loading skeletons or half-rendered states.

## When to use it

- After making frontend or styling changes
- When the user reports a visual bug
- When the user asks for a screenshot, capture, or UI review
- When diagnosing empty-state or spacing problems that are easier to see than infer from code

## Tool usage

Call the `autoscreen` MCP server's `screenshot` tool.

Required inputs:

- `url`: full URL or absolute app path like `/workspace?activeLens=market`
- `ready_test_ids`: array of `data-testid` values that indicate the page is ready

Optional inputs:

- `base_url`: base app URL if not using `http://localhost:3000`
- `viewport`: width/height object
- `scroll_to_bottom`: set true to reveal below-the-fold content
- `full_page`: set false for viewport-only capture

## Ready-state contract

Always gate captures on `data-testid` values tied to real rendered states. Prefer passing both the populated and empty variants:

- `market-ready`
- `market-empty`

The screenshot should fire as soon as either one becomes visible.

Do not gate on loading markers or arbitrary delays unless the user explicitly wants that behavior.

## Good defaults

- Use `http://localhost:3000` unless the project clearly runs elsewhere
- Default viewport: `1440x960`
- Include both ready and empty variants whenever the component has them

## Example asks

- "Take a screenshot of `/dashboard` after it loads."
- "Check what the workspace looks like now."
- "Audit the right rail after my CSS changes."
