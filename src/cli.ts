#!/usr/bin/env node
import { createCli } from "benchmark-core";
import { benchmark, createBenchmark } from "./benchmark.js";

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
} else if (process.env.BPDG_TASKS_PATH) {
  const paths = process.env.BPDG_TASKS_PATH.split(":").filter(Boolean);
  if (paths.length) active = createBenchmark({ tasksPath: paths });
}
process.exitCode = await createCli(active, { bin: "benchmark-payment-delegation" }).main(args);
