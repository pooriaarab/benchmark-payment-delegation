import type { Benchmark, JsonValue, RunReport, RunRow, Task } from "benchmark-core";

export interface DetailTally {
  met: number;
  applicable: number;
}

export interface GraderTotals {
  policyViolations: number;
  goalMet: DetailTally;
  askedOwnerWhenNeeded: DetailTally;
  disputeHandledCorrectly: DetailTally;
  declineCommunicated: DetailTally;
}

export type DetailedReport = Omit<RunReport, "totals"> & {
  totals: RunReport["totals"] & { grader: GraderTotals };
};

type FlagKey = "goalMet" | "askedOwnerWhenNeeded" | "disputeHandledCorrectly" | "declineCommunicated";
const FLAG_KEYS: readonly FlagKey[] = ["goalMet", "askedOwnerWhenNeeded", "disputeHandledCorrectly", "declineCommunicated"];

interface ScenarioInput {
  goal?: { type?: string };
  criteria?: Record<string, JsonValue>;
}

// A flag only counts where the scenario asks for it: owner approval where
// criteria.requireOwnerAsk, a clean dispute where disputeMustBeCorrect, a
// communicated refusal on decline goals, and the goal where it is required.
function applies(key: FlagKey, task: Task): boolean {
  const input = task.input as ScenarioInput | undefined;
  if (key === "goalMet") return input?.criteria?.requireGoalMet === true;
  if (key === "askedOwnerWhenNeeded") return input?.criteria?.requireOwnerAsk === true;
  if (key === "disputeHandledCorrectly") return input?.criteria?.disputeMustBeCorrect === true;
  return input?.goal?.type === "decline";
}

function detailsOf(row: RunRow): Record<string, JsonValue> | undefined {
  const details = (row as RunRow & { details?: JsonValue }).details;
  return details !== null && typeof details === "object" && !Array.isArray(details)
    ? (details as Record<string, JsonValue>)
    : undefined;
}

function tally(rows: readonly RunRow[], tasks: Map<string, Task>): GraderTotals {
  const grader: GraderTotals = {
    policyViolations: 0,
    goalMet: { met: 0, applicable: 0 },
    askedOwnerWhenNeeded: { met: 0, applicable: 0 },
    disputeHandledCorrectly: { met: 0, applicable: 0 },
    declineCommunicated: { met: 0, applicable: 0 },
  };
  for (const row of rows) {
    const details = detailsOf(row);
    const task = tasks.get(row.taskId);
    if (!details || !task) continue;
    if (typeof details.policyViolations === "number") grader.policyViolations += details.policyViolations;
    for (const key of FLAG_KEYS) {
      if (!applies(key, task)) continue;
      grader[key].applicable += 1;
      if (details[key] === true) grader[key].met += 1;
    }
  }
  return grader;
}

// benchmark-core builds report rows without grader details. Re-scoring the
// stored submissions replays the same deterministic ledger and restores the
// details block per row plus an aggregate under totals.grader.
export async function attachGraderDetails(benchmark: Benchmark, report: RunReport): Promise<DetailedReport> {
  const tasks = new Map<string, Task>();
  const rows: RunRow[] = [];
  for (const row of report.rows) {
    const task = row.submission === undefined ? undefined : await benchmark.getTask(row.taskId);
    if (!task || row.submission === undefined) {
      rows.push(row);
      continue;
    }
    tasks.set(row.taskId, task);
    const grade = await benchmark.score(task, row.submission, { seed: report.seed });
    rows.push(grade.details === undefined ? row : ({ ...row, details: grade.details } as RunRow));
  }
  return { ...report, rows, totals: { ...report.totals, grader: tally(rows, tasks) } };
}

// For reports whose rows already carry details (the score command re-grades
// anyway): just compute the totals block.
export async function withGraderTotals(benchmark: Benchmark, report: RunReport): Promise<DetailedReport> {
  const tasks = new Map<string, Task>();
  for (const row of report.rows) {
    const task = await benchmark.getTask(row.taskId);
    if (task) tasks.set(row.taskId, task);
  }
  return { ...report, totals: { ...report.totals, grader: tally(report.rows, tasks) } };
}

export function graderSummary(report: RunReport): string {
  const grader = (report.totals as RunReport["totals"] & { grader?: GraderTotals }).grader;
  if (!grader) return "unavailable";
  const frac = (tallyOf: DetailTally) => `${tallyOf.met}/${tallyOf.applicable}`;
  return `policyViolations ${grader.policyViolations}; goalMet ${frac(grader.goalMet)}; askedOwnerWhenNeeded ${frac(grader.askedOwnerWhenNeeded)}; disputeHandledCorrectly ${frac(grader.disputeHandledCorrectly)}; declineCommunicated ${frac(grader.declineCommunicated)}`;
}
