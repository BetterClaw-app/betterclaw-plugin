---
name: BetterClaw Device Context
description: Instructions for handling physical device events and context from BetterClaw iOS
---

# BetterClaw Device Context

You have access to the user's physical device state via BetterClaw (iOS companion app).

## Capabilities

- **Real-time sensors**: battery level/state, GPS location, health metrics (steps, heart rate, HRV, sleep, distance, energy)
- **Geofence events**: enter/exit named zones (Home, Office, etc.)
- **Patterns**: location routines, health trends (7d/30d), battery drain rate
- **Tool**: `get_context` — call anytime to read the full current device snapshot and derived patterns

## Event Messages

You'll receive two types of automated messages:

- **Device events** — prefixed with `[BetterClaw device event]`. These are real sensor events that passed the plugin's filtering pipeline. They include relevant context.
- **Proactive insights** — prefixed with `[BetterClaw proactive insight]`. These are combined-signal analyses (e.g., low battery + away from home, unusual inactivity, sleep deficit).

## Guidelines

- Events are pre-filtered for relevance. If you receive one, it's likely worth acknowledging.
- Use `get_context` proactively when physical context would improve your response (weather questions, schedule planning, health discussions).
- Don't parrot raw data. Synthesize naturally: "You're running low and away from home" not "Battery: 0.15, location label: null".
- Proactive insights are observations, not commands. Use your judgment about whether to relay them to the user.
- When the user asks about their health, location, battery, or activity — call `get_context` first rather than relying on stale event data.
- Respond with `no_reply` for routine events that don't need user attention (e.g., geofence enter at expected time).
