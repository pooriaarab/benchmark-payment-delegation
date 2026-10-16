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
// (createBenchmark throws) instead of silently grading the public split. The
// cache is bounded: a long-lived process given many distinct paths keeps at
// most MAX_CACHED_BENCHMARKS parsed task sets.
const MAX_CACHED_BENCHMARKS = 16;
const byTasksPath = new Map<string, Benchmark>();
const benchmarkFor = (tasksPath?: string | string[]): Benchmark => {
  if (tasksPath === undefined) return benchmark;
  const key = JSON.stringify([tasksPath].flat());
  let cached = byTasksPath.get(key);
  if (cached) {
    // Refresh recency: Map keeps insertion order, so the oldest key evicts first.
    byTasksPath.delete(key);
    byTasksPath.set(key, cached);
    return cached;
  }
  cached = createBenchmark({ tasksPath });
  if (byTasksPath.size >= MAX_CACHED_BENCHMARKS) {
    const oldest = byTasksPath.keys().next().value;
    if (oldest !== undefined) byTasksPath.delete(oldest);
  }
  byTasksPath.set(key, cached);
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
