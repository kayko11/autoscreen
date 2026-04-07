# AutoScreen

AutoScreen is a small tool for one very specific loop:

make UI change -> take screenshot -> let your agent look at it -> fix the weird thing -> repeat

That is the whole pitch.

It spins up a headless browser, opens your app, waits for a real ready-state `data-testid`, and grabs a screenshot only once the page is actually there. No random sleeps. No "looks broken because we captured the loading skeleton" nonsense.

Built for Claude first, now set up for Codex too.

## Why it exists

Most visual tools are built to catch regressions.

AutoScreen is built for the messy middle of actually making UI:

- you changed spacing and want to see if it still feels right
- you fixed an empty state and want eyes on it
- your agent says "should be good now" and you want proof
- you do not want to context-switch into Playwright tests for every tiny visual check

It is basically visual QA for the "just show me the page" phase.

## What it does

AutoScreen:

- opens a URL in Playwright
- waits for one of your ready-state `data-testid` values
- captures a screenshot
- returns it to the agent for review

That ready-state gate is the whole trick.

If you pass:

```text
significance-ready,significance-empty
```

the screenshot fires as soon as either real state is visible. So you get the populated screen or the real empty state, not a half-loaded lie.

## Install

### Claude Code

```bash
/plugin marketplace add kayko11/autoscreen
```

That is it.

Once installed, Claude can use it as part of normal UI work and visual review.

### Codex

There is not a nice one-command Codex install yet.

Do this:

```bash
git clone https://github.com/kayko11/autoscreen.git ~/.codex/plugins/autoscreen
```

Add this plugin entry to `~/.agents/plugins/marketplace.json`:

```json
{
  "name": "autoscreen",
  "source": { "source": "local", "path": "./.codex/plugins/autoscreen" },
  "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
  "category": "Productivity"
}
```

Then restart Codex.

## First run

First time through, Playwright may need to pull Chromium.

That is a one-time hit, roughly 130MB, usually a minute or two depending on your connection. After that, captures are fast.

## Usage

You can ask naturally:

> take a screenshot of the dashboard  
> check what the workspace looks like now  
> do a visual review of the right rail  
> capture the market lens after it loads

Claude also has the slash command:

```bash
/autoscreen /dashboard dashboard-ready,dashboard-empty
```

Under the hood, everything routes through one capture core. The MCP server and CLI just format the result differently.

The CLI adapter takes:

- `--url`
- `--ready-test-ids`
- optional `viewport`
- optional `--scroll-bottom`
- optional `--full-page`
- optional `--base-url`
- optional `--timeout-ms`

Example:

```bash
autoscreen-cli --url /dashboard --ready-test-ids dashboard-ready,dashboard-empty --width 1440 --height 960 --scroll-bottom
```

Legacy positional args still work for compatibility:

```bash
autoscreen-cli /dashboard dashboard-ready,dashboard-empty 1440 960 true
```

## The only contract that matters

Your app needs `data-testid` markers for real loaded states.

Good:

```tsx
<section data-testid="dashboard-ready">...</section>
<section data-testid="dashboard-empty">...</section>
```

Bad:

- waiting on a fixed timeout
- screenshotting while the page is still loading
- pretending "it looked broken" is a useful signal when the data had not rendered yet

If your screen does not have a test id yet, add one. It is usually a 5-second fix and makes the screenshots way more reliable.

## Base URL

Default base URL is:

```text
http://localhost:3000
```

Override it with `AUTOSCREEN_BASE_URL` if your app runs somewhere else.

## Why I like it

It keeps the loop tight.

Instead of:

1. make change
2. alt-tab
3. refresh manually
4. inspect page
5. explain what you saw back to the agent

you get:

1. make change
2. ask for screenshot
3. agent sees it too
4. keep moving

That sounds small, but it adds up fast when you are doing lots of UI cleanup.

## Tech

- Node
- TypeScript
- Playwright
- one shared capture pipeline used by both MCP and CLI

The capture logic is shared. Claude and Codex just use different wrappers on top.

## Status

Stable enough to extend: runtime validation, typed errors, bounded network diagnostics, and one capture path for both adapters.
