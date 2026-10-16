import { createHandler } from "benchmark-core";
import { createBenchmark } from "./benchmark.js";

// BPDG_TASKS_PATH is the operator allow-list: colon-separated JSONL files that
// replace the packaged split (for example a sealed hidden split kept outside
// the published package).
const allowed = process.env.BPDG_TASKS_PATH?.split(":").filter(Boolean);
export const handler = createHandler(createBenchmark({ tasksPath: allowed?.length ? allowed : undefined }));
