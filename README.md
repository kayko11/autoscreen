# AutoScreen

AI-native visual UI review for Claude Code. Screenshot your running app mid-conversation — no config, no test runner, no context switching.

## Install

```bash
/plugin install kayko11/autoscreen
```

That's it. Claude will start using AutoScreen automatically after UI changes and when asked for visual review.

On first use, the script downloads Chromium (~130MB, one-time, ~1-2 min). Every capture after that is ~700ms.

## How it works

AutoScreen navigates to a URL in a headless browser, waits for a `data-testid` ready-state element to become visible (confirming real data has loaded), then returns a screenshot for Claude to review.

The `data-testid` gate is the key design — captures always show populated state, never loading skeletons.

## Usage

Just ask Claude naturally:

> "take a screenshot of the dashboard"  
> "do a visual audit of the workspace"  
> "check what the market lens looks like now"

Or use the slash command:

```
/autoscreen /dashboard dashboard-ready,dashboard-empty
```

## The ready-state contract

Every capture needs `data-testid` attributes to gate on. Pass both the ready and empty variant:

```
significance-ready,significance-empty
```

The screenshot fires as soon as either is visible. If your component doesn't have testIds yet, add one to the root element — it's a 5-second change:

```tsx
<section data-testid="dashboard-ready">...</section>
```

## Base URL

Defaults to `http://localhost:3000`. Override with `AUTOSCREEN_BASE_URL` in your environment.

## Why this is different

Most visual testing tools are regression detectors — they tell you when something changed. AutoScreen is an on-demand visual inspector for AI. Claude reviews screenshots with design judgment: layout, empty states, information hierarchy, UX quality. Not pixel diffs.

The loop: make a change → capture → Claude reviews → fix → capture again. Tight, no context switching.
