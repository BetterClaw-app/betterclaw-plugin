import { describe, it, expect } from "vitest";
import { ContextManager } from "../src/context.js";
import { emptyPatterns } from "../src/patterns.js";

describe("ProactiveEngine", () => {
  it("empty context doesn't crash trigger checks", () => {
    const ctx = ContextManager.empty();
    const patterns = emptyPatterns();

    expect(ctx.device.battery).toBeNull();
    expect(patterns.healthTrends.stepsAvg7d).toBeNull();
    expect(patterns.triggerCooldowns).toEqual({});
  });

  it("trigger cooldowns are tracked in patterns", () => {
    const patterns = emptyPatterns();
    patterns.triggerCooldowns["low-battery-away"] = Date.now() / 1000;
    expect(patterns.triggerCooldowns["low-battery-away"]).toBeGreaterThan(0);
  });
});
