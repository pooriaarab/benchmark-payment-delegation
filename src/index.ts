import { run as runBenchmark, type ModelAdapter, type RunOptions, type Trace } from "benchmark-core";
import { benchmark, createBenchmark, type BenchmarkOptions } from "./benchmark.js";
export { benchmark, createBenchmark };
export type { BenchmarkOptions };
export { gradePaymentTask } from "./grader.js";
export { LedgerEnvironment } from "./ledger-environment.js";
export const run = (adapter: ModelAdapter, options?: RunOptions & BenchmarkOptions) => {
  const { tasksPath, ...rest } = options ?? {};
  // Without a tasksPath keep the shared object: benchmark-core caches the
  // loaded task list inside it, so a fresh one would re-read data/tasks.jsonl
  // on every call.
  return runBenchmark(tasksPath === undefined ? benchmark : createBenchmark({ tasksPath }), adapter, rest);
};
export async function score(taskId: string, submission: Trace, options?: BenchmarkOptions) {
  const active = options?.tasksPath ? createBenchmark({ tasksPath: options.tasksPath }) : benchmark;
  const task = await active.getTask(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  return active.score(task, submission);
}
