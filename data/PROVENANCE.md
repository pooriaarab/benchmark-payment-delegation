# Payment Delegation provenance

This file is generated from the benchmark definition.

## Synthetic payment delegation scenarios

- Kind: `synthetic`
- URL: https://github.com/pooriaarab/benchmark-payment-delegation/blob/main/scripts/gen-tasks.mjs
- Licence: `CC0-1.0`
- Retrieved: 2026-10-15T00:00:00.000Z
- How to get it: Run `node scripts/gen-tasks.mjs --seed 20261015` from the repository root.
- Contamination notes: Public split uses seed 20261015. Hidden tasks use a separate unpublished world and templates: `BPDG_HIDDEN_SEED=<seed> node scripts/gen-tasks.mjs --split hidden` writes gitignored data/tasks-hidden.jsonl.
- Refresh: Edit scenario templates in scripts/gen-tasks.mjs, bump seed, regenerate JSONL, and review diffs.

## Scenario catalog (human-written)

- Kind: `human-written`
- URL: https://github.com/pooriaarab/benchmark-payment-delegation/blob/main/docs/scenario-catalog.md
- Licence: `MIT`
- Retrieved: 2026-10-15T00:00:00.000Z
- How to get it: Shipped in the repository docs/ folder.
- Contamination notes: Fictional merchants and policies only; no real PANs or live payment data.
- Refresh: Update docs/scenario-catalog.md when adding new trap types.
