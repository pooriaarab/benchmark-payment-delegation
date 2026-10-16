#!/usr/bin/env node
import { createCli } from "benchmark-core";
import { serveApi } from "./api.js";
import { benchmark, createBenchmark } from "./benchmark.js";

const argv = process.argv.slice(2);
const flag = argv.indexOf("--tasks");
let active = benchmark;
let extraTasks = false;
const args = [...argv];
if (flag !== -1) {
  const path = argv[flag + 1];
  if (path === undefined || path.startsWith("--")) {
    console.error("--tasks needs a readable JSONL path.");
    process.exit(1);
  }
  active = createBenchmark({ tasksPath: path });
  extraTasks = true;
  args.splice(flag, 2);
} else if (process.env.BPDG_TASKS_PATH && (args[0] === "serve" || args[0] === "mcp")) {
  // The env allow-list is scoped to the serving surfaces; every other
  // subcommand needs an explicit --tasks to swap task files.
  const paths = process.env.BPDG_TASKS_PATH.split(":").filter(Boolean);
  if (paths.length) {
    active = createBenchmark({ tasksPath: paths });
    extraTasks = true;
  }
}
process.exitCode =
  args[0] === "serve"
    ? await serveApi(active, args.slice(1), extraTasks)
    : await createCli(active, { bin: "benchmark-payment-delegation" }).main(args);
