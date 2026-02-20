import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { DeviceContext, DeviceEvent } from "./types.js";

interface JudgmentResult {
  push: boolean;
  reason: string;
}

type RunEmbeddedPiAgentFn = (opts: Record<string, unknown>) => Promise<{ payloads?: unknown[] }>;

let _runFn: RunEmbeddedPiAgentFn | null = null;

async function loadRunEmbeddedPiAgent(): Promise<RunEmbeddedPiAgentFn> {
  if (_runFn) return _runFn;
  // Dynamic import from OpenClaw internals (same pattern as llm-task plugin)
  const mod = await import("../../../src/agents/pi-embedded.js").catch(() =>
    import("openclaw/agents/pi-embedded"),
  );
  if (typeof (mod as any).runEmbeddedPiAgent !== "function") {
    throw new Error("runEmbeddedPiAgent not available");
  }
  _runFn = (mod as any).runEmbeddedPiAgent as RunEmbeddedPiAgentFn;
  return _runFn;
}

export function buildPrompt(event: DeviceEvent, context: DeviceContext, pushesToday: number, budget: number): string {
  // Strip raw coordinates from context for privacy
  const sanitizedContext = {
    ...context,
    device: {
      ...context.device,
      location: context.device.location
        ? {
            label: context.device.location.label ?? "Unknown",
            updatedAt: context.device.location.updatedAt,
          }
        : null,
    },
  };

  return [
    "You are an event triage system for a personal AI assistant.",
    "Given the device context and a new event, decide: should the AI assistant be told about this?",
    "",
    "Respond with ONLY valid JSON: {\"push\": true/false, \"reason\": \"one sentence\"}",
    "",
    `Context: ${JSON.stringify(sanitizedContext)}`,
    `Event: ${JSON.stringify(event)}`,
    `Pushes today: ${pushesToday} of ~${budget} budget`,
    `Time: ${new Date().toISOString()}`,
  ].join("\n");
}

function extractText(payloads: unknown[]): string {
  for (const p of payloads) {
    if (typeof p === "string") return p;
    if (p && typeof p === "object" && "text" in p && typeof (p as any).text === "string") {
      return (p as any).text;
    }
    if (p && typeof p === "object" && "content" in p && Array.isArray((p as any).content)) {
      for (const c of (p as any).content) {
        if (c && typeof c.text === "string") return c.text;
      }
    }
  }
  return "";
}

export class JudgmentLayer {
  private api: OpenClawPluginApi;
  private config: { llmModel: string; pushBudgetPerDay: number };

  constructor(api: OpenClawPluginApi, config: { llmModel: string; pushBudgetPerDay: number }) {
    this.api = api;
    this.config = config;
  }

  async evaluate(event: DeviceEvent, context: DeviceContext): Promise<JudgmentResult> {
    const prompt = buildPrompt(event, context, context.meta.pushesToday, this.config.pushBudgetPerDay);

    const [provider, ...modelParts] = this.config.llmModel.split("/");
    const model = modelParts.join("/");

    if (!provider || !model) {
      this.api.logger.warn("betterclaw: invalid llmModel config, defaulting to push");
      return { push: true, reason: "llm model not configured — fail open" };
    }

    let tmpDir: string | null = null;
    try {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "betterclaw-judgment-"));
      const sessionId = `betterclaw-judgment-${Date.now()}`;
      const sessionFile = path.join(tmpDir, "session.json");

      const runEmbeddedPiAgent = await loadRunEmbeddedPiAgent();

      const result = await runEmbeddedPiAgent({
        sessionId,
        sessionFile,
        workspaceDir: (this.api as any).config?.agents?.defaults?.workspace ?? process.cwd(),
        config: (this.api as any).config,
        prompt,
        timeoutMs: 15_000,
        runId: `betterclaw-judgment-${Date.now()}`,
        provider,
        model,
        disableTools: true,
      });

      const text = extractText(result.payloads ?? []);
      if (!text) {
        this.api.logger.warn("betterclaw: LLM returned empty output, defaulting to push");
        return { push: true, reason: "llm returned empty — fail open" };
      }

      // Strip code fences if present
      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

      try {
        const parsed = JSON.parse(cleaned) as { push?: boolean; reason?: string };
        return {
          push: parsed.push === true,
          reason: typeof parsed.reason === "string" ? parsed.reason : "no reason given",
        };
      } catch {
        this.api.logger.warn(`betterclaw: LLM returned invalid JSON: ${text.slice(0, 200)}`);
        return { push: true, reason: "llm returned invalid json — fail open" };
      }
    } catch (err) {
      this.api.logger.error(`betterclaw: judgment call failed: ${err instanceof Error ? err.message : String(err)}`);
      return { push: true, reason: "llm call failed — fail open" };
    } finally {
      if (tmpDir) {
        try {
          await fs.rm(tmpDir, { recursive: true, force: true });
        } catch {
          // ignore
        }
      }
    }
  }
}
