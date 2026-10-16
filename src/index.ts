import { run as runBenchmark, type Benchmark, type ModelAdapter, type RunOptions, type Trace } from "benchmark-core";
import { benchmark, createBenchmark, type BenchmarkOptions } from "./benchmark.js";
export { benchmark, createBenchmark };
export type { BenchmarkOptions };
export { gradePaymentTask } from "./grader.js";
export { LedgerEnvironment } from "./ledger-environment.js";

// benchmark-core caches the loaded task list inside the object, so every call
// builds a fresh benchmark: a memoised object would keep serving the tasks it
// first parsed even after the file at that path was rewritten. An empty
// tasksPath fails identically in every caller (createBenchmark throws)
// instead of silently grading the public split.
const benchmarkFor = (tasksPath?: string | string[]): Benchmark => createBenchmark({ tasksPath });

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
