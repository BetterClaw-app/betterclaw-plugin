import { describe, it, expect } from "vitest";
import { buildPrompt } from "../src/judgment.js";
import { ContextManager } from "../src/context.js";
import type { DeviceEvent } from "../src/types.js";

describe("JudgmentLayer", () => {
  it("builds prompt with sanitized context (no raw coordinates)", () => {
    const context = ContextManager.empty();
    context.device.location = {
      latitude: 48.1351,
      longitude: 11.582,
      horizontalAccuracy: 15,
      label: "Home",
      updatedAt: 1740000000,
    };

    const event: DeviceEvent = {
      subscriptionId: "custom.test",
      source: "custom.source",
      data: { value: 42 },
      firedAt: 1740000000,
    };

    const prompt = buildPrompt(event, context, 3, 10);

    // Should contain label but NOT raw coordinates
    expect(prompt).toContain("Home");
    expect(prompt).not.toContain("48.1351");
    expect(prompt).not.toContain("11.582");
    expect(prompt).toContain("Pushes today: 3 of ~10");
  });

  it("handles null location gracefully", () => {
    const context = ContextManager.empty();
    const event: DeviceEvent = {
      subscriptionId: "test",
      source: "test",
      data: {},
      firedAt: 1740000000,
    };
    const prompt = buildPrompt(event, context, 0, 10);
    expect(prompt).toContain("null");
  });
});
