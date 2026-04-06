---
name: autoscreen
description: Use this skill when taking screenshots of running web apps for visual review, UI audits, or verifying UI changes. Triggers when the user asks to "screenshot", "capture", "check the UI", "do a visual review", when you've just made UI changes and want to verify them visually, or when visual context would help diagnose a problem.
---

# AutoScreen — AI-Native Visual UI Review

AutoScreen takes screenshots of your running app mid-conversation using a headless browser. Captures are gated on `data-testid` ready-state elements so you always see real populated data, not loading skeletons.

## How to take a screenshot

Run the script with Bash, then read the output image:

**Step 1 — capture:**
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/screenshot.mjs" "/your/path" "testid-ready,testid-empty"
```

**Step 2 — read the image:**
Parse the JSON output for the `path` field, then use the Read tool on that path to view the screenshot.

## Full signature

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/screenshot.mjs" \
  <url>              \  # path (/dashboard) or full URL
  <testid1,testid2>  \  # comma-separated data-testid values to wait for
  [width]            \  # viewport width (default: 1440)
  [height]           \  # viewport height (default: 960)
  [scroll_bottom]       # "true" to scroll before capturing
```

The script outputs JSON: `{ path, url, matchedTestId, durationMs }`

## The ready-state contract

Gate every capture on `data-testid` attributes — never use arbitrary timeouts. Pass both the ready and empty variant:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/screenshot.mjs" "/workspace" "significance-ready,significance-empty"
```

The capture fires as soon as either testId is visible. This guarantees you see a real populated or empty state, never a skeleton.

**Convention:**
- `foo-ready` — data loaded and rendered
- `foo-empty` — component loaded, no data available  
- `foo-loading` — still fetching (do NOT use as a ready gate)

If the app doesn't have `data-testid` attributes yet, add them to the component root first:
```tsx
<section data-testid="dashboard-ready">...</section>
```

## When to use it proactively

- After making any UI change — capture and verify before calling it done
- When diagnosing a layout or rendering bug
- When asked to do a UI/UX review or audit
- When a user describes a visual problem and you need to see it

## First run

On first use, the script automatically installs Playwright and downloads Chromium (~130MB, one-time). This takes 1-2 minutes. Subsequent calls are fast (~700ms).

## Base URL

Defaults to `http://localhost:3000`. Set `AUTOSCREEN_BASE_URL` in your environment to change it.
