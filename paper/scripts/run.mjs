import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { benchmark, run, score } from '../../dist/index.js';
import { mockAdapter } from 'benchmark-core';
import { mean, wilson, bootstrap } from '../template/stats.mjs';
const hash = x => createHash('sha256').update(x).digest('hex');
const config = JSON.parse(readFileSync('paper/config.json')), tasks = await benchmark.listTasks();
const options = { seed: 1, concurrency: 1, retries: 0, maxTurns: 12, maxToolCalls: 16, budgetUsd: 0 };
const policies = ['empty', 'constant', 'echo', 'refuse', 'first-tool', 'packaged-good', 'packaged-bad', 'no-owner'];
const conditions = [...policies.map(policy => ({ policy })), ...[0, .25, .5, .75, 1].flatMap(p => Array.from({ length: 20 }, (_, i) => ({ policy: 'simulated-mixture', p, agentSeed: i + 1 })))];
const save = (name, x) => writeFileSync(`paper/data/${name}.generated.json`, JSON.stringify(x, null, 2) + '\n');
mkdirSync('paper/data', { recursive: true });
const sourcePaths = ['data/tasks.jsonl', 'package-lock.json', 'src/benchmark.ts', 'src/grader.ts', 'src/ledger-environment.ts', 'src/index.ts'];
for (const p of sourcePaths) assert.equal(hash(readFileSync(p)), hash(execFileSync('git', ['show', `${config.source_commit}:${p}`])), `Frozen source changed: ${p}`);
function adapter(c) {
  if (c.policy.startsWith('packaged-') || c.policy === 'no-owner' || c.policy === 'simulated-mixture') {
    const script = task => {
      const u = parseInt(hash(`${c.agentSeed}:${task.id}`).slice(0, 8), 16) / 2 ** 32;
      const good = c.policy === 'simulated-mixture' ? u < c.p : c.policy !== 'packaged-bad';
      let turns = structuredClone(benchmark.definition.mockPolicies[good ? 'good' : 'bad'](task));
      if (c.policy === 'no-owner') turns = turns.map(t => ({ ...t, ...(t.toolCalls ? { toolCalls: t.toolCalls.filter(x => x.name !== 'ask_owner') } : {}) })).filter(t => t.content || t.toolCalls?.length);
      return turns;
    };
    return mockAdapter({ seed: 1, policies: { good: script, bad: script } });
  }
  return { id: `script:${c.policy}`, complete: async () => { throw new Error('Expected episode'); }, async chat({ messages, tools }) {
    const content = { empty: '', constant: 'OK', echo: messages.find(m => m.role === 'user').content, refuse: 'I cannot help with that request.', 'first-tool': 'OK' }[c.policy];
    if (c.policy === 'first-tool' && !messages.some(m => m.role === 'tool')) return { content: '', toolCalls: [{ id: 'first', name: tools[0].name, args: {} }] };
    return { content, toolCalls: [] };
  } };
}
const semantic = r => r.rows.map(({ taskId, submission, episode, score, reason }) => ({ taskId, submission, episode, score, reason }));
const runs = [], repeats = [];
for (const c of conditions) {
  const report = await run(adapter(c), options), repeat = await run(adapter(c), options);
  for (const r of [report, repeat]) {
    assert.deepEqual(r.rows.map(x => x.taskId), tasks.map(t => t.id));
    assert.ok(r.rows.every(x => !x.error && !x.episode.aborted));
    assert.equal(r.totals.costUsd ?? 0, 0);
    for (const row of r.rows) assert.equal((await score(row.taskId, row.submission)).score, row.score);
  }
  const digest = hash(JSON.stringify(semantic(report))), repeatHash = hash(JSON.stringify(semantic(repeat)));
  assert.equal(digest, repeatHash);
  runs.push({ ...c, report }); repeats.push({ ...c, sha256: digest, repeatSha256: repeatHash, repeat });
}
save('runs', runs); save('repeat', repeats);
const scenarioIds = [...new Set(tasks.map(t => t.metadata.scenario))];
const clustered = rows => bootstrap([scenarioIds.map(s => rows.filter((_, i) => tasks[i].metadata.scenario === s))], gs => mean(gs[0].flat()));
const summarize = rows => ({ success: wilson(rows.filter(r => r.score === 1).length, rows.length), violation: wilson(rows.filter(r => r.episode.finalState.policyViolations > 0).length, rows.length), goal: wilson(rows.filter(r => r.episode.finalState.goalMet).length, rows.length) });
const stats = runs.slice(0, policies.length).map(({ policy, report }) => ({ policy, ...summarize(report.rows), clusteredSuccess: clustered(report.rows.map(r => r.score)), strata: Object.fromEntries(['decline', 'action'].map(s => [s, summarize(report.rows.filter((_, i) => (tasks[i].input.goal.type === 'decline') === (s === 'decline')))])) }));
const good = runs.find(r => r.policy === 'packaged-good').report.rows;
const contrasts = ['packaged-bad', 'no-owner'].map(policy => {
  const rows = runs.find(r => r.policy === policy).report.rows;
  return { comparison: `packaged-good minus ${policy}`, difference: clustered(rows.map((r, i) => good[i].score - r.score)), changedTasks: rows.filter((r, i) => good[i].score !== r.score).map(r => r.taskId) };
});
const simulation = [0, .25, .5, .75, 1].map(p => {
  const agents = runs.filter(r => r.policy === 'simulated-mixture' && r.p === p).map(r => ({ agentSeed: r.agentSeed, ...Object.fromEntries(Object.entries(summarize(r.report.rows)).map(([k, v]) => [k, v.value])) }));
  return { label: 'simulated', p, agents, ...Object.fromEntries(['success', 'violation', 'goal'].map(k => [k, bootstrap([agents], gs => mean(gs[0].map(a => a[k])))])) };
});
for (const s of simulation) s.pairedVsZero = bootstrap([s.agents.map((a, i) => a.success - simulation[0].agents[i].success)], gs => mean(gs[0]));
const coverage = [...new Set(tasks.map(t => t.input.goal.type))].map(goal => ({ goal, n: tasks.filter(t => t.input.goal.type === goal).length }));
const summary = { schema_version: 1, options, tasks: tasks.length, scenarios: scenarioIds.length, coverage, policies: policies.length, conditions: conditions.length, episodes: tasks.length * conditions.length * 2, costUsd: 0, ciLevel: 95, stats, contrasts, simulation, repeatIdentical: true, freeModels: { status: 'not-run', reason: 'Hosted inference is outside the registered local-only plan; availability was not tested.' } };
save('summary', summary);
const sources = [...sourcePaths, 'paper/PREREG.md', 'paper/scripts/run.mjs', 'paper/template/stats.mjs'];
save('provenance', { source_commit: config.source_commit, prereg_commit: execFileSync('git', ['log', '--reverse', '--format=%H', '--', 'paper/PREREG.md'], { encoding: 'utf8' }).trim().split('\n')[0], node: process.version, files: Object.fromEntries(sources.map(p => [p, hash(readFileSync(p))])), run_hash: hash(readFileSync('paper/data/runs.generated.json')) });
console.log(`Completed ${summary.episodes} episodes; ${conditions.length} repeated conditions agree; API cost USD 0`);
