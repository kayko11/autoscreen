---
name: autoscreen
description: Use when the user asks for a screenshot, visual review, UI audit, layout check, or when you've just changed UI and should verify the result visually.
---

# AutoScreen

Use AutoScreen when visual context matters: screenshotting a running app, checking a layout bug, verifying a UI change, or doing a quick UX audit.

For Codex, AutoScreen is intentionally simple: no MCP setup, no extra server registration. The skill runs the packaged screenshot script directly, then you inspect the resulting image.

## When to use it

- After making frontend or styling changes
- When the user reports a visual bug
- When the user asks for a screenshot, capture, or UI review
- When diagnosing spacing, empty-state, or hierarchy issues that are easier to see than infer from code

## How to run it

Run the packaged script using the skill-local path:

```bash
node "<path-to-skill>/../../scripts/screenshot.mjs" "/your/path" "ready-id,empty-id"
```

Then parse the JSON output, take the `path`, and read the image file.

## Full signature

```bash
node "<path-to-skill>/../../scripts/screenshot.mjs" \
  <url>              \
  <testid1,testid2>  \
  [width]            \
  [height]           \
  [scroll_bottom]
```

The script outputs JSON:

```json
{ "path": "/tmp/autoscreen-123.png", "url": "http://localhost:3000/workspace", "matchedTestId": "workspace-ready", "durationMs": 812 }
```

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

## Failure mode

If the script times out waiting for the test ids:

- confirm the app is actually running
- confirm the route is correct
- confirm the component exposes stable `data-testid` markers

If there are no test ids yet, add them to the component root before trying again.
