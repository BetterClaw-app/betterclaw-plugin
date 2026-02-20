import { Type } from "@sinclair/typebox";
import type { ContextManager } from "../context.js";

export function createGetContextTool(ctx: ContextManager) {
  return {
    name: "get_context",
    label: "Get Device Context",
    description:
      "Get the current physical context of the user's iPhone — battery, location, health metrics, activity zone, patterns, and trends. Call this when you need to know about the user's physical state.",
    parameters: Type.Object({
      include: Type.Optional(
        Type.Array(Type.String(), {
          description: "Sections to include. Omit for all. Options: device, activity, patterns, meta",
        }),
      ),
    }),
    async execute(_id: string, params: Record<string, unknown>) {
      const sections =
        Array.isArray(params.include) && params.include.every((s) => typeof s === "string")
          ? (params.include as string[])
          : ["device", "activity", "patterns", "meta"];

      const state = ctx.get();
      const patterns = await ctx.readPatterns();

      const result: Record<string, unknown> = {};
      if (sections.includes("device")) result.device = state.device;
      if (sections.includes("activity")) result.activity = state.activity;
      if (sections.includes("patterns") && patterns) result.patterns = patterns;
      if (sections.includes("meta")) result.meta = state.meta;

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  };
}
