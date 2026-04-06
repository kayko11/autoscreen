# AutoScreen

AI-native visual UI review for coding agents. Screenshot your running app mid-conversation with a ready-state gate, so captures show real data instead of loading skeletons.

## Install

### Claude Code

```bash
/plugin marketplace add kayko11/autoscreen
```

That's it. Claude will start using AutoScreen automatically after UI changes and when asked for visual review.

### Codex

Build the MCP server, then add it to Codex:

```bash
npm install
npm run build
codex mcp add autoscreen --env AUTOSCREEN_BASE_URL=http://localhost:3000 -- node /absolute/path/to/autoscreen/dist/index.js
```

If you cloned this repo to `/home/kay/autoscreen`, the command is:

```bash
codex mcp add autoscreen --env AUTOSCREEN_BASE_URL=http://localhost:3000 -- node /home/kay/autoscreen/dist/index.js
```

The repo now also includes Codex plugin metadata in [`.codex-plugin/plugin.json`](./.codex-plugin/plugin.json) and a local MCP config in [`.mcp.json`](./.mcp.json), so it can be packaged as a Codex plugin without splitting into a second repo.

On first use, the script downloads Chromium (~130MB, one-time, ~1-2 min). Every capture after that is ~700ms.

## How it works

AutoScreen navigates to a URL in a headless browser, waits for a `data-testid` ready-state element to become visible (confirming real data has loaded), then returns a screenshot for Claude to review.

The `data-testid` gate is the key design — captures always show populated state, never loading skeletons.

## Usage

Ask your agent naturally:

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
