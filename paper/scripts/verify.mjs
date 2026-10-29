import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { score } from '../../dist/index.js';
import { wilson } from '../template/stats.mjs';
const read = name => JSON.parse(readFileSync(`paper/data/${name}.generated.json`)), hash = x => createHash('sha256').update(x).digest('hex');
const s = read('summary'), runs = read('runs'), repeats = read('repeat'), provenance = read('provenance'), meta = JSON.parse(readFileSync('paper/meta.json'));
assert.equal(meta.license, 'CC-BY-4.0'); assert.ok(meta.abstract.length <= 1920 && /^[\x00-\x7f]*$/.test(meta.abstract));
assert.ok(!readFileSync('paper/paper.tex','utf8').includes('—'));
for (const [p,h] of Object.entries(provenance.files)) assert.equal(hash(readFileSync(p)), h, `Source drift: ${p}`);
assert.equal(hash(readFileSync('paper/data/runs.generated.json')), provenance.run_hash);
assert.equal(runs.length, s.conditions); assert.equal(repeats.length, s.conditions);
const semantic = r => r.rows.map(({ taskId, submission, episode, score, reason }) => ({ taskId, submission, episode, score, reason }));
for (const [i,r] of runs.entries()) {
  assert.equal(r.report.rows.length, s.tasks); assert.equal(new Set(r.report.rows.map(x => x.taskId)).size, s.tasks);
  assert.equal(hash(JSON.stringify(semantic(r.report))), repeats[i].sha256);
  assert.equal(hash(JSON.stringify(semantic(repeats[i].repeat))), repeats[i].repeatSha256); assert.equal(repeats[i].sha256, repeats[i].repeatSha256);
  for (const row of r.report.rows) assert.equal((await score(row.taskId, row.submission)).score, row.score);
  if (i < s.policies) assert.deepEqual(wilson(r.report.rows.filter(x => x.score === 1).length,s.tasks),s.stats[i].success);
}
const pdf = execFileSync('pdftotext', ['-layout', `paper/${meta.artifact_name}`, '-'], { encoding: 'utf8' }), pages = pdf.split('\f').filter(p => p.trim()).length;
assert.ok(pages >= 8); assert.ok(!pdf.includes('??')); assert.equal((pdf.match(/Figure \d:/g) ?? []).length, 3);
const planDate = execFileSync('git',['show','-s','--format=%cI',provenance.prereg_commit],{encoding:'utf8'}).trim();
assert.ok(runs.every(r => Date.parse(planDate) <= Date.parse(r.report.startedAt)));
const evidence = { pages, episodes: s.episodes, conditions: s.conditions, replayAgreement: true, semanticRepeatAgreement: true, sourceHashesVerified: true, generatedTables: 5, figures: 3, apiCostUsd: 0, pdfSha256: hash(readFileSync(`paper/${meta.artifact_name}`)) };
writeFileSync('paper/data/verification.generated.json', JSON.stringify(evidence,null,2)+'\n'); console.log(JSON.stringify(evidence));
