# Payment delegation paper

Install Node 20+, npm, Python 3, Tectonic, and Poppler. From the repository root, run `npm ci`, then `sh paper/template/reproduce.sh`.
The output is `paper/payment-delegation-paper.pdf`. PDFs, build logs, and downloaded styles remain untracked.
The shared `template/` is copied unchanged from honesty pilot PR 24. All study prose and metrics are payment-specific.
The build checks the official style archive hash. Its first run can download TeX dependencies.
Experiments use local scripts through the exported runner. They need no network, credentials, or paid model.

`PREREG.md` precedes result collection. It is not an independent registry timestamp. `config.json` freezes the benchmark source commit.
The baseline study includes generic controls, good and bad references, and removal of owner consultation.
The extra simulated study mixes whole reference scripts across five probabilities and twenty artificial agent seeds.
Wilson intervals describe hypothetical task sampling. Scenario bootstraps preserve related templates. Simulated intervals resample agent means.
Repeated runs verify semantic equality and do not increase sample size. Endpoint bootstrap intervals can collapse.
`data/runs.generated.json` and `data/repeat.generated.json` contain full reports and traces. `summary.generated.json` contains all planned analyses.
`provenance.generated.json` binds inputs and execution code to hashes. `verification.generated.json` records replay and PDF checks.
`render.mjs` generates metadata, citation fields, tables, macros, and figure CSVs. Do not edit generated files manually.

Constant OK receives partial decline credit. It demonstrates a scorer limitation, not informed refusal or useful payment action.
No learned model, human baseline, hidden-world evaluation, live processor, or independent validation is present.
Paper text and figures use CC-BY-4.0. Code remains MIT; synthetic task provenance declares CC0-1.0.
Do not publish or merge automatically. The parent handles publication and review.
Local CI passes with Node 22.23.4 and its bundled npm. npm 12 changes pack JSON and breaks the existing E2E parser.
