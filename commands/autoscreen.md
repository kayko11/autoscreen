---
description: Take a screenshot of a live page for visual review. Usage: /autoscreen [url] [testid1,testid2]
argument-hint: "[url] [ready-testids]"
allowed-tools: Bash, Read
---

Take a screenshot of the running app and review it visually.

1. Parse the arguments: first arg is the URL (default "/"), second is comma-separated testIds (default "app-ready,page-ready,main-ready")
2. Run: `node "${CLAUDE_PLUGIN_ROOT}/scripts/screenshot.mjs" "<url>" "<testids>"`
3. Parse the JSON output to get the `path`
4. Use the Read tool on that path to view the screenshot
5. Describe what you see: what's working, layout issues, empty state problems, anything that needs fixing

If the script fails with a testId timeout, suggest adding `data-testid` attributes to the component.
