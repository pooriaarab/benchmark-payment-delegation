import { createHandler, serve, type Benchmark, type Task } from "benchmark-core";
import { createBenchmark, publicTask } from "./benchmark.js";

// BPDG_TASKS_PATH is the operator allow-list: colon-separated JSONL files that
// replace the packaged split (for example a sealed hidden split kept outside
// the published package). That opt-in alone is not a control, so:
// - task listings never carry input, expected or mock metadata (publicTask),
// - BPDG_API_TOKEN requires `Authorization: Bearer <token>` on every route,
// - serve warns loudly when extra task files are exposed without a token.
const envTasksPath = (): string[] | undefined => {
  const allowed = process.env.BPDG_TASKS_PATH?.split(":").filter(Boolean);
  return allowed?.length ? allowed : undefined;
};

const apiToken = () => process.env.BPDG_API_TOKEN || undefined;

export function createApiHandler(active: Benchmark, token = apiToken()) {
  const inner = createHandler(active);
  return async (request: Request): Promise<Response> => {
    if (token !== undefined && request.headers.get("authorization") !== `Bearer ${token}`) {
      return Response.json(
        { error: { code: "UNAUTHORIZED", message: "Set Authorization: Bearer <BPDG_API_TOKEN>." } },
        { status: 401 },
      );
    }
    const response = await inner(request);
    const url = new URL(request.url);
    if (request.method !== "GET" || response.status !== 200) return response;
    if (url.pathname === "/v1/tasks") {
      const body = (await response.json()) as { tasks?: Task[] };
      return Response.json({ tasks: (body.tasks ?? []).map(publicTask) }, { status: 200, headers: response.headers });
    }
    if (url.pathname.startsWith("/v1/tasks/")) {
      const body = (await response.json()) as { task?: Task };
      return Response.json({ task: body.task === undefined ? undefined : publicTask(body.task) }, { status: 200, headers: response.headers });
    }
    return response;
  };
}

// `serve` runs here (not through the shared CLI) so the bearer gate and the
// sanitized task views apply to the Node server exactly as to the handler.
export async function serveApi(active: Benchmark, argv: string[], extraTasks: boolean): Promise<number> {
  const json = argv.includes("--json");
  const clean = argv.filter((arg) => arg !== "--json");
  const positionals: string[] = [];
  let hostname = "127.0.0.1";
  for (let i = 0; i < clean.length; i++) {
    const arg = clean[i];
    if (arg === undefined) continue;
    if (arg === "--host") hostname = clean[++i] ?? "";
    else if (arg.startsWith("--")) {
      console.error(`Unknown option '${arg}'`);
      return 1;
    } else positionals.push(arg);
  }
  if (positionals.length > 1) {
    console.error("serve accepts at most one port.");
    return 1;
  }
  const port = Number(positionals[0] ?? process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error("serve port must be an integer from 0 to 65535.");
    return 1;
  }
  if (!hostname.trim()) {
    console.error("--host must not be empty.");
    return 1;
  }
  const token = apiToken();
  if (extraTasks && token === undefined) {
    console.error("warning: serving a non-default task file over an unauthenticated API; set BPDG_API_TOKEN to require a bearer token.");
  }
  await serve(createApiHandler(active, token), { port, hostname });
  console.log(json ? JSON.stringify({ listening: port, host: hostname }) : `Listening on http://${hostname}:${port}`);
  return 0;
}

export const handler = createApiHandler(createBenchmark({ tasksPath: envTasksPath() }));
