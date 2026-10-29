# Payment delegation study plan

Date: 2026-10-29. Author: Pooria Arab. Budget: USD 0.
No study results exist at registration. Source inspection informs this plan.
The honesty pilot supplies only the unchanged template, not prose or metrics.
Registration is a git commit, not an independent timestamp or public registry.
No venue or archive submission is authorized.

## Questions and conditions
H1: The packaged good script passes more tasks than the packaged bad script.
H2: Removing ask_owner calls from the good script reduces success on approval tasks.
H3 (simulated): Increasing good-script selection probability increases mean success.
Use benchmark-payment-delegation 0.1.0 at ba184ffd6deccddd5640eb6f1f76f5997338bc00.
Run all public tasks through the exported SDK runner and native ledger grader.
Conditions: empty, constant OK, echo prompt, refuse, first-tool, packaged-good,
packaged-bad, and no-owner (packaged-good with ask_owner calls removed).
First-tool calls the first tool once and then returns OK.
Scripted references read task metadata; generic policies do not read hidden criteria.
No-owner retains remaining calls and final text. Remove empty tool-only turns.

## Simulated experiment
For probabilities 0, .25, .5, .75, 1, run 20 simulated agents (seeds 1 through 20).
For each seed and task ID, hash the seed and ID to a uniform number in [0,1).
Select the whole good script if this number is below the probability; else select bad.
Use the same draws across probabilities. These are simulated policies, not learned agents.
Repeat every condition once. Repeats check determinism and do not increase sample size.

## Measures and analysis
Primary: native binary success. Secondary: episodes with any policy violation,
ledger goal met, and success separately on decline and action goals.
Report Wilson 95% intervals for task proportions as descriptive sampling-model intervals.
Scenario siblings share templates. Also bootstrap whole scenario clusters for baseline success.
Use 2000 bootstrap draws. For H1 and H2, pair tasks and resample whole scenario clusters.
For the simulated sweep, bootstrap the 20 agent means, keeping tasks fixed.
Compare each simulated probability with zero using paired agent means.
Report bootstrap boundary collapse explicitly. No significance threshold or model ranking.
Plots: goal coverage, policy success versus violations, simulated sweep with intervals.

## Execution, exclusions, and failure cases
Seed 1, concurrency 1, retries 0, maxTurns 12, maxToolCalls 16, budgetUsd 0.
Empty output and refusal are scored normally. Never exclude a task for a low score.
Infrastructure errors halt the study; fix the runner, log the change, then rerun all conditions.
Check frozen source hashes, task IDs, raw scores against replay, and repeat semantic hashes.
Failure cases include scoring a blocked attempt as safe, treating inaction as task success,
counting repeats as new tasks, leaking criteria into generic policies, and mutating task input.
Stop after the fixed grid. Do not add conditions after seeing results without a deviation.
No hosted model is configured for this plan. No provider availability claim is made.
No human study, live charge, paid API, or external publication is part of this study.

## Release and deviations
Release full local runner reports, summaries, provenance, scripts, figures, and source paper.
Report all planned analyses, including nulls. Paper and figures: CC-BY-4.0.
Code retains MIT; synthetic tasks retain their source license.
Deviations: none at registration.
