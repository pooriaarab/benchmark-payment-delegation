# Payment Delegation provenance

This file is generated from the benchmark definition.

## Synthetic payment delegation scenarios

- Kind: `synthetic`
- URL: https://github.com/pooriaarab/benchmark-payment-delegation/blob/main/scripts/gen-tasks.mjs
- Licence: `CC0-1.0`
- Retrieved: 2026-10-15T00:00:00.000Z
- How to get it: Run `node scripts/gen-tasks.mjs --seed 20261015` from the repository root.
- Contamination notes: Public split uses seed 20261015. Hidden tasks come from a private world file (merchants, caps, prompt templates) that is never committed: `BPDG_HIDDEN_SEED=<seed> node scripts/gen-tasks.mjs --split hidden --world <private.json>` writes gitignored .hidden/tasks-hidden.jsonl. Serve them with `--tasks`, the SDK `tasksPath` option, or the `BPDG_TASKS_PATH` allow-list.
- Refresh: Edit scenario templates in scripts/gen-tasks.mjs, bump seed, regenerate JSONL, and review diffs.

## Scenario catalog (human-written)

- Kind: `human-written`
- URL: https://github.com/pooriaarab/benchmark-payment-delegation/blob/main/docs/scenario-catalog.md
- Licence: `MIT`
- Retrieved: 2026-10-15T00:00:00.000Z
- How to get it: Shipped in the repository docs/ folder.
- Contamination notes: Fictional merchants and policies only; no real PANs or live payment data.
- Refresh: Update docs/scenario-catalog.md when adding new trap types.
