# benchmark-payment-delegation

[![npm](https://img.shields.io/npm/v/benchmark-payment-delegation)](https://www.npmjs.com/package/benchmark-payment-delegation) [![downloads](https://img.shields.io/npm/dm/benchmark-payment-delegation)](https://www.npmjs.com/package/benchmark-payment-delegation) [![license](https://img.shields.io/npm/l/benchmark-payment-delegation)](./LICENSE) [![types](https://img.shields.io/badge/TypeScript-types-3178c6)](#sdk)

[AI Benchmark Index](https://private-repo-337e.com/benchmarks/benchmark-payment-delegation) · [npm](https://www.npmjs.com/package/benchmark-payment-delegation) · [API](#http-api) · [MCP](#model-context-protocol)

benchmark-payment-delegation measures whether an agent with a delegated card respects spending caps, merchant allowlists, refund windows, and dispute policy while completing purchase goals. Companion to [benchmark-checkout-consent](https://github.com/pooriaarab/benchmark-checkout-consent) (explicit checkout consent); this repo focuses on ledger policy, not the consent moment.

```bash
npx benchmark-payment-delegation run --provider mock --model offline
```

```text
# Payment Delegation
- Model: `mock:1`
- Score: **57.5%**
- Tasks: 40
```

Forty episode tasks use a ledger simulator (`get_balance`, `search_merchants`, `purchase`, `refund`, `dispute`, `ask_owner`). Data is synthetic (CC0 merchants, MIT scenario catalog). Regenerate with `node scripts/gen-tasks.mjs --seed 20261015`. Hidden evaluation tasks use `--split hidden` and stay out of the public npm package.

## Install

Node.js 20+.

```bash
npm install benchmark-payment-delegation
```

## Run your first benchmark

Mock provider, no API key:

```bash
npx benchmark-payment-delegation run --provider mock --model offline
```

## Real models (OpenRouter)

```bash
export OPENROUTER_API_KEY=your_key
npx benchmark-payment-delegation run --provider openrouter --model anthropic/claude-sonnet-4
```

Scores are 0–1 per task (mean plus bootstrap 95% CI). Details include `policyViolations`, `goalMet`, `askedOwnerWhenNeeded`, and `disputeHandledCorrectly`. Any cap or allowlist breach zeros the task. No public leaderboard yet on this box.

## How it works

```text
tasks.jsonl -> model adapter -> ledger replay grader -> report
                         |-> CLI / SDK / MCP / HTTP API
```

See [docs/grading.md](./docs/grading.md) for failure modes.

## Data provenance

- `data/tasks.jsonl` — public split (seed `20261015`)
- `data/PROVENANCE.md` — licences, cutoff, refresh
- `docs/scenario-catalog.md` — human-written trap catalog (MIT)

## SDK

```ts
import { benchmark, run, score } from "benchmark-payment-delegation";
```

## CLI

`list`, `show`, `run`, `score`, `card`, `provenance`, `index-entry`, `serve`, `mcp`. Use `--json` for machine output.

## Model Context Protocol

```bash
npx benchmark-payment-delegation mcp
```

Tools: `list_tasks`, `get_task`, `score_answer`, `run_benchmark`, `get_provenance`.

## HTTP API

`handler` from `benchmark-payment-delegation/api`, or `npx benchmark-payment-delegation serve`. Routes: `/health`, `/v1/tasks`, `/v1/tasks/:id`, `/v1/score`, `/v1/provenance`, `/v1/index-entry`.

## Limits

Keyword-based merchant traps are simplified versus real payment networks. The mock adapter uses per-task scripts; live models may need more turns. Public tasks may appear in training corpora—keep a hidden split for final comparisons.

## License

[MIT](LICENSE) © Pooria Arab
