import { readFile } from "node:fs/promises";
import { defineBenchmark, type JsonValue, type ScriptedTurn, type Task, type Trace } from "benchmark-core";
import { gradePaymentTask } from "./grader.js";
import { LedgerEnvironment } from "./ledger-environment.js";

const DEFAULT_TASKS_URL = new URL("../data/tasks.jsonl", import.meta.url);

async function readTasks(source: URL | string): Promise<Task[]> {
  const text = await readFile(source, "utf8");
  return text
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Task);
}

function loadDefaultTasks(): Promise<Task[]> {
  return readTasks(DEFAULT_TASKS_URL).then((tasks) => tasks.filter((task) => task.metadata?.split !== "hidden"));
}

export interface BenchmarkOptions {
  /** Load tasks from these JSONL files instead of the packaged public split. */
  tasksPath?: string | string[] | undefined;
}

// A fresh object per call: benchmark-core caches the loaded task list inside
// the object, so a tasksPath option must never reuse the default instance.
export function createBenchmark(options: BenchmarkOptions = {}) {
  const paths = [options.tasksPath ?? []].flat();
  // An explicit but empty tasksPath must fail: falling back to the packaged
  // split would grade the wrong task file without any error.
  if (options.tasksPath !== undefined && paths.length === 0) {
    throw new Error("tasksPath must name at least one JSONL file.");
  }
  const loadTasks = paths.length
    ? async () => (await Promise.all(paths.map((path) => readTasks(path)))).flat()
    : loadDefaultTasks;
  return defineBenchmark({
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
          "Public split uses seed 20261015. Hidden tasks come from a private world file (merchants, caps, prompt templates) that is never committed: `BPDG_HIDDEN_SEED=<seed> node scripts/gen-tasks.mjs --split hidden --world <private.json>` writes gitignored .hidden/tasks-hidden.jsonl. Serve them with `--tasks`, the SDK `tasksPath` option, or the `BPDG_TASKS_PATH` allow-list.",
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
}

function scriptFromMetadata(task: Task, key: "mockGood" | "mockBad"): ScriptedTurn[] {
  const raw = task.metadata?.[key];
  if (!Array.isArray(raw)) return [{ content: "__missing_mock__" }];
  return raw as ScriptedTurn[];
}

// Task listings never expose the grading rubric or the mock scripts: a task
// view carries only what a solver legitimately sees (id, kind, prompt) plus
// the scenario and split tags from metadata.
export function publicTask(task: Task): Task {
  const metadata: Record<string, JsonValue> = {};
  for (const key of ["scenario", "split"] as const) {
    const value = task.metadata?.[key];
    if (value !== undefined) metadata[key] = value;
  }
  return { id: task.id, kind: task.kind, prompt: task.prompt, ...(Object.keys(metadata).length ? { metadata } : {}) };
}

export const benchmark = createBenchmark();

export async function scoreTrace(taskId: string, submission: Trace) {
  const task = await benchmark.getTask(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  return benchmark.score(task, submission);
}
