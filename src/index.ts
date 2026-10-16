import { run as runBenchmark, type Benchmark, type ModelAdapter, type RunOptions, type Trace } from "benchmark-core";
import { benchmark, createBenchmark, type BenchmarkOptions } from "./benchmark.js";
export { benchmark, createBenchmark };
export type { BenchmarkOptions };
export { gradePaymentTask } from "./grader.js";
export { LedgerEnvironment } from "./ledger-environment.js";

// benchmark-core caches the loaded task list inside the object, so memoize one
// benchmark per tasksPath key: rescoring many rows against one split must not
// re-read the JSONL per call, and a tasksPath object must never reuse the
// packaged instance. An empty tasksPath fails identically in every caller
// (the task file read throws) instead of silently grading the public split.
const byTasksPath = new Map<string, Benchmark>();
const benchmarkFor = (tasksPath?: string | string[]): Benchmark => {
  if (tasksPath === undefined) return benchmark;
  const key = JSON.stringify([tasksPath].flat());
  let cached = byTasksPath.get(key);
  if (!cached) {
    cached = createBenchmark({ tasksPath });
    byTasksPath.set(key, cached);
  }
  return cached;
};

export const run = (adapter: ModelAdapter, options?: RunOptions & BenchmarkOptions) => {
  const { tasksPath, ...rest } = options ?? {};
  return runBenchmark(benchmarkFor(tasksPath), adapter, rest);
};
export async function score(taskId: string, submission: Trace, options?: BenchmarkOptions) {
  const active = benchmarkFor(options?.tasksPath);
  const task = await active.getTask(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  return active.score(task, submission);
}
