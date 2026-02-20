# @betterclaw-app/betterclaw

An [OpenClaw](https://openclaw.dev) plugin that acts as an intelligent context layer between the [BetterClaw](https://github.com/BetterClaw-app) iOS app and your AI agent.

Instead of flooding your agent with every sensor reading, the plugin filters, triages, and enriches device events — only forwarding what actually matters.

## Install

```bash
openclaw plugins install @betterclaw-app/betterclaw
```

## How it works

```
iOS App  ──events──▶  Plugin Pipeline  ──filtered──▶  Agent Session
                          │
                     ┌────┴─────┐
                     │ Filter   │  dedup, cooldowns, daily budget
                     │ Triage   │  LLM call for ambiguous events
                     │ Context  │  battery, location, health, zones
                     │ Patterns │  routines, trends, stats (every 6h)
                     │ Proactive│  combined-signal insights
                     └──────────┘
```

**Filter** — Rules engine with per-source dedup, cooldown windows, and a configurable daily push budget. Prevents event spam.

**Triage** — Ambiguous events get a cheap LLM call (configurable model) to decide push/suppress/defer. Keeps the expensive agent focused.

**Context** — Maintains a rolling device state snapshot: battery level/state, GPS coordinates, zone occupancy, health metrics, activity classification.

**Patterns** — Every 6 hours, computes location routines, health trends (7-day and 30-day baselines for steps, sleep, heart rate), and event frequency stats.

**Proactive** — Fires combined-signal insights when conditions align: low battery away from home, unusual inactivity, sleep deficit, routine deviations, weekly health digest.

## Configuration

Add to your `openclaw.json`:

```jsonc
{
  "plugins": {
    "entries": {
      "betterclaw": {
        "enabled": true,
        "config": {
          "llmModel": "openai/gpt-4o-mini",  // model for event triage
          "pushBudgetPerDay": 10,             // max events forwarded to agent per day
          "patternWindowDays": 14,            // days of history for pattern computation
          "proactiveEnabled": true            // enable proactive insight triggers
        }
      }
    }
  }
}
```

All config keys are optional — defaults are shown above.

## Agent tool

The plugin registers a `get_context` tool the agent can call anytime to read the full device state snapshot, including derived patterns and activity classification.

## Commands

| Command | Description |
|---------|-------------|
| `/bc` | Show current device context snapshot in chat |

## Compatibility

| Plugin | BetterClaw iOS | OpenClaw |
|--------|----------------|----------|
| 1.x    | 1.x+           | 2025.12+ |

## License

[AGPL-3.0](LICENSE)
