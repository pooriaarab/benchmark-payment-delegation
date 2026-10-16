#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import {
  bootstrapCI,
  createCli,
  mockAdapter,
  openaiCompatAdapter,
  openrouterAdapter,
  renderMarkdown,
  run,
  type ModelAdapter,
  type RunReport,
} from "benchmark-core";
import { benchmark, createBenchmark } from "./benchmark.js";
import { attachGraderDetails, graderSummary, withGraderTotals } from "./details.js";
import { startMcp } from "./mcp.js";

const argv = process.argv.slice(2);
const flag = argv.indexOf("--tasks");
let active = benchmark;
const args = [...argv];
if (flag !== -1) {
  const path = argv[flag + 1];
  if (path === undefined || path.startsWith("--")) {
    console.error("--tasks needs a readable JSONL path.");
    process.exit(1);
  }
  active = createBenchmark({ tasksPath: path });
  args.splice(flag, 2);
} else if (process.env.BPDG_TASKS_PATH && (args[0] === "serve" || args[0] === "mcp")) {
  // The env allow-list is scoped to the serving surfaces; every other
  // subcommand needs an explicit --tasks to swap task files.
  const paths = process.env.BPDG_TASKS_PATH.split(":").filter(Boolean);
  if (paths.length) active = createBenchmark({ tasksPath: paths });
}

class UsageError extends Error {}

const usage = "Usage: benchmark-payment-delegation <list|show|run|score|card|provenance|index-entry|serve|mcp> [options]";

function isUsageError(error: unknown): boolean {
  if (error instanceof UsageError) return true;
  const code = error !== null && typeof error === "object" ? Reflect.get(error, "code") : undefined;
  return typeof code === "string" && code.startsWith("ERR_PARSE_ARGS");
}

function pickAdapter(provider: string, model: string, seed: number): ModelAdapter {
  if (provider === "mock") {
    const policies = active.definition.mockPolicies;
    return mockAdapter({ seed, ...(policies ? { policies } : {}) });
  }
  if (provider === "openrouter") return openrouterAdapter({ model });
  if (provider === "openai") return openaiCompatAdapter({ model });
  throw new UsageError("--provider must be openrouter, openai, or mock.");
}

function asReport(value: unknown): RunReport {
  if (value === null || typeof value !== "object" || Array.isArray(value) || !Array.isArray(Reflect.get(value, "rows"))) {
    throw new UsageError("File is not a run report.");
  }
  return value as RunReport;
}

function printReport(report: RunReport, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(report));
    return;
  }
  console.log(`${renderMarkdown(report)}- Grader details: ${graderSummary(report)}\n`);
}

// run, score and mcp are handled here so grader details reach every report;
// every other command goes through the shared benchmark-core CLI.
async function main(): Promise<number> {
  const command = args[0];
  const rest = args.slice(1);
  const json = rest.includes("--json");
  const clean = rest.filter((arg) => arg !== "--json");
  if (command === "run") {
    const parsed = parseArgs({
      args: clean,
      options: {
        model: { type: "string" },
        provider: { type: "string" },
        concurrency: { type: "string" },
        timeout: { type: "string" },
        retries: { type: "string" },
        seed: { type: "string" },
        "max-turns": { type: "string" },
        "max-tool-calls": { type: "string" },
        budget: { type: "string" },
      },
      strict: true,
    });
    const model = parsed.values.model;
    const provider = parsed.values.provider;
    if (!model || !provider) throw new UsageError("run needs --model and --provider.");
    const seed = Number(parsed.values.seed ?? 1);
    const report = await run(active, pickAdapter(provider, model, seed), {
      ...(parsed.values.concurrency ? { concurrency: Number(parsed.values.concurrency) } : {}),
      ...(parsed.values.timeout ? { timeoutMs: Number(parsed.values.timeout) } : {}),
      ...(parsed.values.retries ? { retries: Number(parsed.values.retries) } : {}),
      seed,
      ...(parsed.values["max-turns"] ? { maxTurns: Number(parsed.values["max-turns"]) } : {}),
      ...(parsed.values["max-tool-calls"] ? { maxToolCalls: Number(parsed.values["max-tool-calls"]) } : {}),
      ...(parsed.values.budget ? { budgetUsd: Number(parsed.values.budget) } : {}),
    });
    const detailed = await attachGraderDetails(active, report);
    printReport(detailed, json);
    return detailed.rows.some((row) => row.error) ? 2 : 0;
  }
  if (command === "score") {
    const file = clean[0];
    if (!file) throw new UsageError("score needs a results JSON file.");
    const original = asReport(JSON.parse(await readFile(file, "utf8")));
    const rows = [];
    for (const row of original.rows) {
      const task = await active.getTask(row.taskId);
      if (!task || row.submission === undefined) throw new UsageError(`Cannot score task ${row.taskId}.`);
      const grade = await active.score(task, row.submission, { seed: original.seed });
      rows.push({ ...row, score: grade.score, reason: grade.reason, ...(grade.details === undefined ? {} : { details: grade.details }) });
    }
    const scores = rows.map((row) => row.score);
    const rescored = {
      ...original,
      rows,
      mean: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      confidenceInterval95: bootstrapCI(scores, original.seed),
    };
    printReport(await withGraderTotals(active, rescored), json);
    return 0;
  }
  if (command === "mcp") {
    await startMcp(active);
    return 0;
  }
  return createCli(active, { bin: "benchmark-payment-delegation" }).main(args);
}

try {
  process.exitCode = await main();
} catch (caught) {
  const invalidUsage = isUsageError(caught);
  console.error(caught instanceof Error ? caught.message : String(caught));
  if (invalidUsage) console.error(usage);
  process.exitCode = invalidUsage ? 1 : 2;
}
