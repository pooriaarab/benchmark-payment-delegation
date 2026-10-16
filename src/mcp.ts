import { createMcpServer as create, startMcp as start } from "benchmark-core";
import { createBenchmark } from "./benchmark.js";

const allowed = process.env.BPDG_TASKS_PATH?.split(":").filter(Boolean);
const active = createBenchmark({ tasksPath: allowed?.length ? allowed : undefined });
export const createMcpServer = () => create(active);
export const startMcp = () => start(active);
