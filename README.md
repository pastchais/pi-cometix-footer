# pi-cometix-footer

[![npm](https://img.shields.io/npm/v/pi-cometix-footer?style=flat-square)](https://www.npmjs.com/package/pi-cometix-footer)
[![license](https://img.shields.io/npm/l/pi-cometix-footer?style=flat-square)](./LICENSE)
[![pi package](https://img.shields.io/badge/pi-package-8b5cf6?style=flat-square)](https://pi.dev)

Single-line **cometix-style** footer for [pi](https://pi.dev) — model, path, git, context window, session tokens, latest-response throughput, cost, and task time at a glance.

Look inspired by [CCometixLine](https://github.com/Haleclipse/CCometixLine) (MIT). Independent pi extension; own codebase.

---

## Preview

![cometix footer demo](assets/demo.png)

```text
π  GPT-5.6 Sol • max  |  > ~/agent/pi-cometix-footer  |  main ✓  |  2% 6.4k/372k  |  ↑13k ↓61 CH88.2%  |  󰄉 1m 23s · 42.3 tok/s  |  󰇁 0.284  |  MCP: 0/5 servers
```

| Segment | What it shows | Color |
| --- | --- | --- |
| **Model** | Model name + thinking level (`• high`) | cyan · level uses pi palette |
| **Directory** | CWD, `~`-relative | yellow icon / green path |
| **Git** | Branch · clean `✓` / dirty `●` / conflict `⚠` · ahead `↑n` / behind `↓n` | blue |
| **Context** | Window fill `pct tokens/window` | magenta → yellow (>70%) → red (>90%) |
| **Tokens** | Session `↑in ↓out` + latest cache hit `CH%` | cyan |
| **Cost** | Session cumulative USD cost reported by Pi (`󰇁 0.000`); omitted when zero/unavailable | yellow |
| **Activity** | Live task time (updated every second) + optional latest-response TPS; final values remain after the agent settles | magenta |
| **Statuses** | Extension / MCP status lines (if any) | theme default |

Segments are bold, separated by dim ` | `, with Nerd Font icons (emoji fallback available).

---

## Install

Install from this fork (not the upstream npm package):

```bash
pi install git:github.com/pastchais/pi-cometix-footer
```

Then in pi:

```text
/reload
```

Footer and TPS are **on by default**. Toggle the footer or TPS independently, or reload JSON config:

```text
/cometix-footer
/cometix-footer tps
/cometix-footer tps on
/cometix-footer tps off
/cometix-footer reload
```

TPS uses the final output-token count divided by the elapsed time from the first streamed output delta to response completion, so time to first token is excluded. It is omitted when a provider does not stream output deltas or report valid output-token usage.

> **Migrating from a loose file?**  
> If you previously copied `cometix-footer.ts` into `~/.pi/agent/extensions/`, remove that file first to avoid loading the footer twice.

---

## Customize

Do **not** edit `index.ts` for personal tweaks. Write JSON config instead.

Precedence, later wins:

1. Built-in defaults
2. `~/.pi/agent/pi-cometix-footer.json`
3. Project `.pi/pi-cometix-footer.json` (walks up from cwd)
4. Environment variables

Session start and `/cometix-footer reload` re-read these files.

```json
{
  "iconMode": "nerd",
  "showTps": true,
  "enabled": true,
  "gitTtlMs": 3000,
  "icons": {
    "nerd": { "model": "π" },
    "emoji": { "model": "🤖" }
  },
  "colors": {
    "cyan": 96,
    "yellow": 93,
    "green": 92,
    "blue": 94,
    "magenta": 95,
    "cost": 33,
    "duration": 95,
    "red": 91,
    "warn": 93
  }
}
```

All keys are optional; omitted fields keep defaults. Icon maps merge per key.

| Knob | JSON / env | Purpose |
| --- | --- | --- |
| `iconMode` | `PI_COMETIX_ICON_MODE` | `"nerd"` (default) or `"emoji"` if no Nerd Font |
| `showTps` | `PI_COMETIX_SHOW_TPS` | show latest-response TPS by default |
| `enabled` | `PI_COMETIX_ENABLED` | install footer on session start |
| `gitTtlMs` | `PI_COMETIX_GIT_TTL` | git status refresh interval (ms, default `3000`) |
| `icons.nerd.*` / `icons.emoji.*` | — | per-segment glyphs |
| `colors.*` | — | 16-color SGR codes per segment |

See `pi-cometix-footer.example.json`.

Nerd Font cheatsheet: <https://www.nerdfonts.com/cheat-sheet>

---

## Requirements

- [pi](https://pi.dev) (peer: `@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`)
- A [Nerd Font](https://www.nerdfonts.com/) in your terminal — or set `"iconMode": "emoji"` in config

---

## Credits

- Visual language borrowed from [CCometixLine](https://github.com/Haleclipse/CCometixLine) by Haleclipse (MIT)
- Built as a [pi](https://pi.dev) extension package

## License

[MIT](./LICENSE) © Xichun123
