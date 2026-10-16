import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { MAX_TOOL_LOG_ENTRIES, openrouterAdapter, run, type Benchmark, type Trace } from "benchmark-core";
import { createBenchmark, publicTask } from "./benchmark.js";
import { attachGraderDetails } from "./details.js";

// BPDG_TASKS_PATH is the operator allow-list: colon-separated JSONL files that
// replace the packaged split (for example a sealed hidden split kept outside
// the published package).
const allowed = process.env.BPDG_TASKS_PATH?.split(":").filter(Boolean);
const envBenchmark = createBenchmark({ tasksPath: allowed?.length ? allowed : undefined });

const tools = [
  { name: "list_tasks", description: "List benchmark task ids and prompts.", inputSchema: { type: "object" as const, properties: {}, additionalProperties: false } },
  { name: "get_task", description: "Get one benchmark task.", inputSchema: { type: "object" as const, properties: { taskId: { type: "string" } }, required: ["taskId"], additionalProperties: false } },
  {
    name: "score_answer",
    description: "Score a trace with the deterministic benchmark grader.",
    inputSchema: { type: "object" as const, properties: { taskId: { type: "string" }, submission: { type: "object" }, seed: { type: "number" } }, required: ["taskId", "submission"], additionalProperties: false },
  },
  { name: "run_benchmark", description: "Run every task through an OpenRouter model.", inputSchema: { type: "object" as const, properties: { model: { type: "string" } }, required: ["model"], additionalProperties: false } },
  { name: "get_provenance", description: "Get benchmark data provenance.", inputSchema: { type: "object" as const, properties: {}, additionalProperties: false } },
];

const content = (value: unknown, isError = false) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
  ...(isError ? { isError: true } : {}),
});

function args(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

// The same five tools benchmark-core serves, but run_benchmark reports carry
// grader details (row.details and totals.grader) like the CLI and API.
export function createMcpServer(active: Benchmark = envBenchmark): Server {
  const server = new Server({ name: active.definition.id, version: active.definition.version }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...tools] }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const input = args(request.params.arguments);
      // Task views hide the rubric and the mock scripts: an MCP client sees
      // only what a solver legitimately sees (id, kind, prompt, tags).
      if (request.params.name === "list_tasks") return content({ tasks: (await active.listTasks()).map(publicTask) });
      if (request.params.name === "get_task") {
        if (typeof input.taskId !== "string") return content({ error: "taskId is required." }, true);
        const task = await active.getTask(input.taskId);
        return task ? content({ task: publicTask(task) }) : content({ error: "Task not found." }, true);
      }
      if (request.params.name === "score_answer") {
        if (typeof input.taskId !== "string" || !input.submission || typeof input.submission !== "object" || Array.isArray(input.submission)) {
          return content({ error: "taskId and submission are required." }, true);
        }
        const submittedLog = Reflect.get(input.submission, "toolLog");
        if (Array.isArray(submittedLog) && submittedLog.length > MAX_TOOL_LOG_ENTRIES) {
          return content({ error: `toolLog may not exceed ${MAX_TOOL_LOG_ENTRIES} entries.` }, true);
        }
        const task = await active.getTask(input.taskId);
        return task
          ? content({ taskId: task.id, ...(await active.score(task, input.submission as Trace, typeof input.seed === "number" ? { seed: input.seed } : {})) })
          : content({ error: "Task not found." }, true);
      }
      if (request.params.name === "run_benchmark") {
        if (typeof input.model !== "string") return content({ error: "model is required." }, true);
        if (!process.env.OPENROUTER_API_KEY) return content({ error: "OPENROUTER_API_KEY is required to run a benchmark." }, true);
        return content(await attachGraderDetails(active, await run(active, openrouterAdapter({ model: input.model }))));
      }
      if (request.params.name === "get_provenance") return content({ provenance: active.definition.provenance });
      return content({ error: `Unknown tool: ${request.params.name}` }, true);
    } catch (caught) {
      return content({ error: caught instanceof Error ? caught.message : "Unknown error." }, true);
    }
  });
  return server;
}

export const startMcp = (active: Benchmark = envBenchmark) => createMcpServer(active).connect(new StdioServerTransport());
