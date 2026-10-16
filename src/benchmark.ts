import { readFile } from "node:fs/promises";
import { defineBenchmark, type ScriptedTurn, type Task, type Trace } from "benchmark-core";
import { gradePaymentTask } from "./grader.js";
import { LedgerEnvironment } from "./ledger-environment.js";

async function loadTasks(): Promise<Task[]> {
  const text = await readFile(new URL("../data/tasks.jsonl", import.meta.url), "utf8");
  return text.trim().split("\n").map((line) => JSON.parse(line) as Task);
}

function scriptFromMetadata(task: Task, key: "mockGood" | "mockBad"): ScriptedTurn[] {
  const raw = task.metadata?.[key];
  if (!Array.isArray(raw)) return [{ content: "__missing_mock__" }];
  return raw as ScriptedTurn[];
}

export const benchmark = defineBenchmark({
  id: "benchmark-payment-delegation",
  name: "Payment Delegation",
  tagline: "Spend limits, merchant allowlists and disputes for an agent with a card.",
  tags: ["helpful"],
  category: "commerce",
  whatItMeasures:
    "Whether an agent respects spending caps, merchant allowlists, refund rules, and dispute policy when given a delegated card.",
  version: "0.1.0",
  status: "alpha",
  loadTasks,
  async grade(task, submission, context) {
    return gradePaymentTask(task, submission, context.seed);
  },
  environment: () => new LedgerEnvironment(),
  mockPolicies: {
    good: (task) => scriptFromMetadata(task, "mockGood"),
    bad: (task) => scriptFromMetadata(task, "mockBad"),
  },
  provenance: [
    {
      name: "Synthetic payment delegation scenarios",
      kind: "synthetic",
      url: "https://github.com/pooriaarab/benchmark-payment-delegation/blob/main/scripts/gen-tasks.mjs",
      licence: "CC0-1.0",
      howToGet: "Run `node scripts/gen-tasks.mjs --seed 20261015` from the repository root.",
      retrievedAt: "2026-10-15T00:00:00.000Z",
      contaminationNotes:
        "Public split uses seed 20261015. Hidden evaluation tasks use `node scripts/gen-tasks.mjs --seed 20261015 --split hidden` and are not committed.",
      refresh: "Edit scenario templates in scripts/gen-tasks.mjs, bump seed, regenerate JSONL, and review diffs.",
    },
    {
      name: "Scenario catalog (human-written)",
      kind: "human-written",
      url: "https://github.com/pooriaarab/benchmark-payment-delegation/blob/main/docs/scenario-catalog.md",
      licence: "MIT",
      howToGet: "Shipped in the repository docs/ folder.",
      retrievedAt: "2026-10-15T00:00:00.000Z",
      contaminationNotes: "Fictional merchants and policies only; no real PANs or live payment data.",
      refresh: "Update docs/scenario-catalog.md when adding new trap types.",
    },
  ],
  gradingMethod:
    "Deterministic ledger replay with policy engine; cap or allowlist breach scores 0. Reports policyViolations, goalMet, askedOwnerWhenNeeded, disputeHandledCorrectly.",
  shareCardTitle: "Payment Delegation",
});

export async function scoreTrace(taskId: string, submission: Trace) {
  const task = await benchmark.getTask(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  return benchmark.score(task, submission);
}
