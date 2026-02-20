import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { EventLog } from "../src/events.js";
import type { EventLogEntry } from "../src/types.js";

describe("EventLog", () => {
  let tmpDir: string;
  let log: EventLog;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "betterclaw-events-"));
    log = new EventLog(tmpDir);
  });

  it("starts empty", async () => {
    const entries = await log.readAll();
    expect(entries).toHaveLength(0);
  });

  it("appends and reads entries", async () => {
    const entry: EventLogEntry = {
      event: {
        subscriptionId: "test",
        source: "device.battery",
        data: { level: 0.5 },
        firedAt: 1740000000,
      },
      decision: "push",
      reason: "test",
      timestamp: 1740000000,
    };
    await log.append(entry);
    await log.append({ ...entry, decision: "drop" });

    const entries = await log.readAll();
    expect(entries).toHaveLength(2);
    expect(entries[0].decision).toBe("push");
    expect(entries[1].decision).toBe("drop");
  });

  it("filters by timestamp", async () => {
    const entry: EventLogEntry = {
      event: { subscriptionId: "test", source: "test", data: {}, firedAt: 100 },
      decision: "push",
      reason: "test",
      timestamp: 100,
    };
    await log.append({ ...entry, timestamp: 100 });
    await log.append({ ...entry, timestamp: 200 });
    await log.append({ ...entry, timestamp: 300 });

    const recent = await log.readSince(200);
    expect(recent).toHaveLength(2);
  });
});
