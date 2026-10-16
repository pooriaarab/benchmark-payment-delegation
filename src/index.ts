import { run as runBenchmark, type ModelAdapter, type RunOptions, type Trace } from "benchmark-core";
import { benchmark, createBenchmark, type BenchmarkOptions } from "./benchmark.js";
export { benchmark, createBenchmark };
export type { BenchmarkOptions };
export { gradePaymentTask } from "./grader.js";
export { LedgerEnvironment } from "./ledger-environment.js";
export const run = (adapter: ModelAdapter, options?: RunOptions & BenchmarkOptions) => {
  const { tasksPath, ...rest } = options ?? {};
  return runBenchmark(createBenchmark({ tasksPath }), adapter, rest);
};
export async function score(taskId: string, submission: Trace, options?: BenchmarkOptions) {
  const active = options?.tasksPath ? createBenchmark({ tasksPath: options.tasksPath }) : benchmark;
  const task = await active.getTask(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  return active.score(task, submission);
}
