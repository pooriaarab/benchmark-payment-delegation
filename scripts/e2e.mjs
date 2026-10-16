import assert from "node:assert/strict";
import { execFile as execFileCallback, spawn } from "node:child_process";
import { once } from "node:events";
import { createServer as createNetServer } from "node:net";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { benchmark } from "../dist/index.js";

const execFile = promisify(execFileCallback);

await execFile("npm", ["run", "build"]);

const tasks = await benchmark.listTasks();
assert.equal(tasks.length, 40);

const declineTask = tasks.find((t) => t.id === "pd-decline-over-cap") ?? tasks[0];
const buyTask = tasks.find((t) => t.id === "pd-buy-coffee-01") ?? tasks[0];
const goodLog = (buyTask.metadata?.mockGood ?? []).flatMap((turn) =>
  (turn.toolCalls ?? []).map((call) => ({ name: call.name, args: call.args })),
);
const badTraces = [
  { toolLog: [] },
  { toolLog: [{ name: "purchase", args: { merchantId: "m-tech-hub", amountUsd: 40, memo: "partial" } }] },
  { toolLog: [{ name: "purchase", args: { merchantId: "m-tech-hub", amountUsd: 25, memo: "accessory" } }] },
  { toolLog: [{ name: "get_balance", args: {} }, { name: "purchase", args: { merchantId: "m-tech-hub", amountUsd: 30, memo: "cable" } }] },
];
for (const submission of badTraces) {
  const grade = await benchmark.score(declineTask, submission);
  assert.ok(grade.score < 0.5, `expected low score for bad trace, got ${grade.score}`);
}
const goodGrade = await benchmark.score(buyTask, { toolLog: goodLog });
assert.equal(goodGrade.score, 1);

const cli = await execFile(process.execPath, ["dist/cli.js", "run", "--model", "offline", "--provider", "mock", "--json"], { maxBuffer: 5_000_000 });
const report = JSON.parse(cli.stdout);
assert.equal(report.rows.length, 40);
assert.ok(report.rows.some((row) => row.score === 1));
assert.ok(report.rows.some((row) => row.score === 0));
const mean = report.mean;
assert.ok(mean > 0.2 && mean < 0.8, `mock mean should mix pass/fail, got ${mean}`);

const probe = createNetServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const address = probe.address(); assert.ok(address && typeof address === "object");
await new Promise((resolve) => probe.close(resolve));
const server = spawn(process.execPath, ["dist/cli.js", "serve", String(address.port)], { stdio: ["ignore", "pipe", "pipe"] });
const base = `http://127.0.0.1:${address.port}`; const routes = {};
async function get(path) {
  const response = await fetch(`${base}${path}`); routes[`GET ${path}`] = response.status;
  return { response, value: await response.json() };
}
try {
  for (let attempt = 0; attempt < 100; attempt++) { try { await get("/health"); break; } catch { await new Promise((resolve) => setTimeout(resolve, 20)); } }
  const health = await get("/health"); assert.equal(health.response.status, 200);
  const listed = await get("/v1/tasks"); assert.equal(listed.value.tasks.length, 40);
  const shown = await get(`/v1/tasks/${tasks[0].id}`); assert.equal(shown.value.task.id, tasks[0].id);
  const score = await fetch(`${base}/v1/score`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ taskId: tasks[0].id, submission: report.rows[0].submission }) });
  routes["POST /v1/score"] = score.status; assert.equal(score.status, 200);
  assert.equal((await get("/v1/provenance")).response.status, 200);
  assert.equal((await get("/v1/index-entry")).value.task_count, 40);
} finally { if (server.exitCode === null) { server.kill("SIGTERM"); await once(server, "exit"); } }

const transport = new StdioClientTransport({ command: process.execPath, args: ["dist/cli.js", "mcp"], cwd: process.cwd(), stderr: "pipe" });
const client = new Client({ name: "benchmark-payment-delegation-e2e", version: "0.1.0" });
await client.connect(transport); let toolNames;
try {
  const available = await client.listTools(); toolNames = available.tools.map((tool) => tool.name).sort();
  assert.deepEqual(toolNames, ["get_provenance", "get_task", "list_tasks", "run_benchmark", "score_answer"]);
  const calls = [
    ["list_tasks", {}], ["get_task", { taskId: tasks[0].id }],
    ["score_answer", { taskId: tasks[0].id, submission: report.rows[0].submission }],
    ["get_provenance", {}], ["run_benchmark", { model: "offline" }],
  ];
  for (const [name, args] of calls) {
    const result = await client.callTool({ name, arguments: args });
    if (name === "run_benchmark") assert.equal(result.isError, true); else assert.notEqual(result.isError, true);
  }
} finally { await client.close(); }

const artifact = { task_count: report.rows.length, scores: report.rows.map((row) => row.score), route_status_codes: routes, tool_names: toolNames };
await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/e2e-report.json", `${JSON.stringify(artifact, null, 2)}\n`);
assert.match(await readFile("data/PROVENANCE.md", "utf8"), /Synthetic payment delegation scenarios/);
console.log(`e2e: ${artifact.task_count} tasks, ${Object.keys(routes).length} routes, ${toolNames.length} tools -> all surfaces passed, ok`);
