# Working on benchmark-payment-delegation

## Commands

- Install with `npm ci`.
- Run the full gate with `npm run ci:local`.
- Generate tasks with `npm run generate:tasks` (add `--seed N` and `--split hidden` via `node scripts/gen-tasks.mjs`).
- Generate provenance after building with `npm run provenance`.
- Add no unit tests. Extend `scripts/e2e.mjs` through a public surface.

## Contracts

Keep tasks, deterministic grading, and provenance in sync. Episode environments must be seeded. Grade episode traces by replaying their tool log.

Hidden tasks generate into gitignored `.hidden/`, never `data/` (the package `files` list includes `data/`). Run them with CLI `--tasks <path>`, the SDK `tasksPath` option, or the `BPDG_TASKS_PATH` colon-separated allow-list on `serve` and `mcp`.

Never read provider keys from repository files. OpenRouter uses `OPENROUTER_API_KEY`. OpenAI-compatible providers use `OPENAI_BASE_URL` and `OPENAI_API_KEY`.

Open an issue before a branch. Use `bpdg-<issue>-<slug>` and `[bpdg-<issue>] Imperative subject`. Keep pull requests below 500 counted lines. Do not merge your own pull request or push `release`.
