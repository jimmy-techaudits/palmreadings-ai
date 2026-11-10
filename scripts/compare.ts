/**
 * Blind side-by-side comparison of AI providers on real palm photos.
 *
 *   npm run compare                      # uses ./test-photos, compares anthropic and openai
 *   npm run compare -- ./my-photos       # another folder
 *   npm run compare -- --providers anthropic,mock
 *
 * Folder layout: one subfolder per person, containing
 *   left.jpg   right.jpg   (both palms, required; .jpeg/.png/.heic also work on a Mac)
 *   side.jpg               (optional: pinky-side edge of the dominant hand; turns on marriage & children)
 *   person.json            (optional) {"dominantHand":"right","age":34,"name":"Sam","focus":"love","includeFamily":true}
 *
 * Keys and models come from .dev.vars: ANTHROPIC_API_KEY, OPENAI_API_KEY, and optionally
 * ANTHROPIC_MODEL (default claude-opus-5-5) and OPENAI_MODEL (default gpt-5.6-sol).
 *
 * Output: compare-report/index.html (open in a browser) and compare-report/results.json.
 * Providers are shown as "Reading A" / "Reading B" in random order; the key is at the bottom.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import OpenAI from 'openai';
import type { Env } from '../server/env';
import { runReading } from '../server/pipeline';
import { getProvider } from '../server/providers';
import type { Focus, Hand, PersonObservation, PhotoInput, Reading, ReadingRequest, SlotId } from '../shared/types';

// ---------- inputs ----------

const args = process.argv.slice(2);
const providersArg = args.indexOf('--providers');
const providers = (providersArg >= 0 ? args[providersArg + 1] : 'anthropic,openai').split(',').map((s) => s.trim());
const folder = path.resolve(args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--providers') ?? 'test-photos');
const outDir = path.resolve('compare-report');

function loadDevVars(): Record<string, string> {
  if (!existsSync('.dev.vars')) return {};
  const vars: Record<string, string> = {};
  for (const line of readFileSync('.dev.vars', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return vars;
}
const vars = { ...loadDevVars(), ...process.env } as Record<string, string | undefined>;

const MODELS: Record<string, string> = {
  anthropic: vars.ANTHROPIC_MODEL || 'claude-opus-5-5',
  openai: vars.OPENAI_MODEL || 'gpt-5.6-sol',
  mock: 'mock',
};

function envFor(provider: string): Env {
  return {
    AI_PROVIDER: provider,
    OBSERVE_MODEL: MODELS[provider],
    INTERPRET_MODEL: MODELS[provider],
    ANTHROPIC_API_KEY: vars.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: vars.OPENAI_API_KEY,
  } as Env;
}

interface PersonConfig {
  dominantHand?: Hand;
  age?: number;
  name?: string;
  focus?: Focus;
  includeFamily?: boolean;
}

const IMAGE_EXT = /\.(jpe?g|png|heic|heif|webp)$/i;
const tmp = mkdtempSync(path.join(tmpdir(), 'palm-compare-'));

/** Returns base64 JPEG, resized to at most 1600px like the browser does. Uses macOS `sips` when available. */
function toJpegBase64(file: string): string {
  const out = path.join(tmp, `${path.basename(file).replace(/\W/g, '_')}-${Math.random().toString(36).slice(2)}.jpg`);
  try {
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '85', '-Z', '1600', file, '--out', out], { stdio: 'ignore' });
    return readFileSync(out).toString('base64');
  } catch {
    if (!/\.jpe?g$/i.test(file)) throw new Error(`${file}: convert it to JPEG first (automatic conversion needs a Mac).`);
    return readFileSync(file).toString('base64');
  }
}

function findPhoto(dir: string, base: string): string | null {
  const f = readdirSync(dir).find((n) => IMAGE_EXT.test(n) && path.parse(n).name.toLowerCase() === base);
  return f ? path.join(dir, f) : null;
}

interface Person {
  id: string;
  req: ReadingRequest;
  thumbs: { label: string; data: string }[];
}

function loadPeople(): Person[] {
  if (!existsSync(folder)) {
    console.error(`No folder at ${folder}. Create it with one subfolder per person (see the top of scripts/compare.ts).`);
    process.exit(1);
  }
  const people: Person[] = [];
  for (const id of readdirSync(folder).sort()) {
    const dir = path.join(folder, id);
    if (!existsSync(path.join(dir)) || !readdirSync(dir, { withFileTypes: true }).length) continue;
    const left = findPhoto(dir, 'left');
    const right = findPhoto(dir, 'right');
    if (!left || !right) {
      console.warn(`Skipping ${id}: needs left.* and right.* photos.`);
      continue;
    }
    const side = findPhoto(dir, 'side');
    const cfgPath = path.join(dir, 'person.json');
    const cfg: PersonConfig = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, 'utf8')) : {};
    const dominant: Hand = cfg.dominantHand ?? 'right';
    const includeFamily = cfg.includeFamily ?? Boolean(side);

    const photos: PhotoInput[] = [
      { slot: 'p0-left-palm', data: toJpegBase64(left) },
      { slot: 'p0-right-palm', data: toJpegBase64(right) },
    ];
    if (side) photos.push({ slot: `p0-${dominant}-side` as SlotId, data: toJpegBase64(side) });
    if (includeFamily && !side) {
      console.warn(`Skipping ${id}: includeFamily needs a side.* photo.`);
      continue;
    }
    people.push({
      id,
      req: {
        mode: 'solo',
        focus: cfg.focus ?? 'overall',
        includeFamily,
        people: [{ name: cfg.name, age: cfg.age, dominantHand: dominant }],
        photos,
      },
      thumbs: photos.map((p) => ({ label: p.slot.split('-').slice(1).join(' '), data: p.data })),
    });
  }
  return people;
}

// ---------- run ----------

interface Result {
  provider: string;
  model: string;
  seconds: number;
  reading?: Reading;
  observations?: PersonObservation[];
  photoIssues?: { slot: string; reason: string }[];
  error?: string;
}

async function runOne(person: Person, provider: string): Promise<Result> {
  const started = Date.now();
  const result: Result = { provider, model: MODELS[provider], seconds: 0 };
  try {
    await runReading(
      person.req,
      getProvider(envFor(provider)),
      (e) => {
        if (e.type === 'observations') result.observations = e.observations;
        if (e.type === 'photo_issues') result.photoIssues = e.issues;
        if (e.type === 'reading') result.reading = e.reading;
      },
      async () => 'local',
    );
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
  }
  result.seconds = Math.round((Date.now() - started) / 100) / 10;
  return result;
}

async function listOpenAIModels() {
  try {
    const client = new OpenAI({ apiKey: vars.OPENAI_API_KEY });
    const ids: string[] = [];
    for await (const m of client.models.list()) if (/^(gpt|o\d)/.test(m.id)) ids.push(m.id);
    console.error(`\nModels your OpenAI key can use:\n  ${ids.sort().join('\n  ')}\nSet OPENAI_MODEL=<one of these> in .dev.vars and run again.`);
  } catch (e) {
    console.error('Could not list OpenAI models:', e instanceof Error ? e.message : e);
  }
}

// ---------- report ----------

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const prose = (s: string) =>
  s
    .split(/\n\s*\n/)
    .map((p) => `<p>${esc(p.trim()).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`)
    .join('');

function readingHtml(label: string, r: Result): string {
  if (r.error) return `<div class="col"><h3>${label}</h3><p class="err">Failed: ${esc(r.error)}</p></div>`;
  if (r.photoIssues) {
    return `<div class="col"><h3>${label}</h3><p class="err">Rejected the photos:</p><ul>${r.photoIssues
      .map((i) => `<li>${esc(i.slot)}: ${esc(i.reason)}</li>`)
      .join('')}</ul></div>`;
  }
  const rd = r.reading!;
  const hands = (r.observations ?? [])
    .flatMap((o) => o.hands)
    .map(
      (h) =>
        `<li><b>${h.hand}</b>: ${h.element}; ` +
        Object.entries(h.lines)
          .map(([k, l]) => `${k} ${l.visibility === 'not_visible' ? 'not visible' : `${l.length}/${l.depth}/${l.shape}${l.features.length ? ` (${l.features.join(', ')})` : ''}`}`)
          .join('; ') +
        (h.relationship_lines.length ? `; relationship lines: ${h.relationship_lines.length}; children lines: ${h.children_lines_visible}` : '') +
        `</li>`,
    )
    .join('');
  return `<div class="col">
    <h3>${label} <span class="time">${r.seconds}s</span></h3>
    <h4 class="headline">${esc(rd.headline)}</h4>
    <p>${esc(rd.summary)}</p>
    <p class="traits">${rd.traits.map((t) => `<span>${esc(t.label)}: <b>${esc(t.value)}</b></span>`).join('')}</p>
    <details><summary>What it saw in the photos</summary><ul class="obs">${hands}</ul></details>
    ${rd.sections
      .map((s) => `<section><h5>${esc(s.title)}</h5>${prose(s.body)}<p class="ev">Based on: ${s.evidence.map(esc).join(' · ')}</p></section>`)
      .join('')}
    ${
      rd.family
        ? `<section><h5>Marriage & Family</h5><p>Marriages: <b>${esc(rd.family.marriages.range)}</b> (${rd.family.marriages.confidence}) – ${esc(rd.family.marriages.explanation)}</p>
           <p>Children: <b>${esc(rd.family.children.range)}</b> (${rd.family.children.confidence}) – ${esc(rd.family.children.explanation)}</p><p>${esc(rd.family.timing)}</p></section>`
        : ''
    }
    <section><h5>Action steps</h5><ol>${rd.action_steps.map((a) => `<li>${esc(a)}</li>`).join('')}</ol></section>
    <p class="closing">“${esc(rd.closing.text)}”</p>
  </div>`;
}

function writeReport(rows: { person: Person; order: Result[] }[]) {
  const key: string[] = [];
  const body = rows
    .map(({ person, order }) => {
      key.push(`<li>${esc(person.id)}: ${order.map((r, i) => `Reading ${'AB'[i]} = ${r.provider} (${esc(r.model)})`).join(', ')}</li>`);
      return `<article>
        <h2>${esc(person.id)} <small>${person.req.focus}${person.req.includeFamily ? ' + marriage & children' : ''}, dominant ${person.req.people[0].dominantHand}</small></h2>
        <div class="thumbs">${person.thumbs.map((t) => `<figure><img src="data:image/jpeg;base64,${t.data}"><figcaption>${t.label}</figcaption></figure>`).join('')}</div>
        <div class="cols">${order.map((r, i) => readingHtml(`Reading ${'AB'[i]}`, r)).join('')}</div>
        <p class="vote">Which is better? A / B — more specific to these hands, more accurate to what you see, better to read.</p>
      </article>`;
    })
    .join('');

  writeFileSync(
    path.join(outDir, 'index.html'),
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Palm reading comparison</title>
<style>
body{font:16px/1.6 system-ui,sans-serif;margin:0;background:#f6f4fb;color:#1f1633}
main{max-width:1400px;margin:auto;padding:24px}
article{background:#fff;border-radius:16px;padding:24px;margin:0 0 32px;box-shadow:0 1px 3px #0001}
h2 small{font-weight:400;color:#6b6385;font-size:.8em}
.thumbs{display:flex;gap:12px;flex-wrap:wrap}.thumbs img{height:180px;border-radius:8px}figure{margin:0}figcaption{font-size:12px;color:#6b6385;text-align:center}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:16px}@media(max-width:900px){.cols{grid-template-columns:1fr}}
.col{border:1px solid #e4def5;border-radius:12px;padding:16px}.time{font-weight:400;color:#6b6385;font-size:.8em}
.headline{font-size:1.2em;margin:.2em 0}.traits span{display:inline-block;background:#f1ecfd;border-radius:999px;padding:2px 10px;margin:2px;font-size:13px}
h5{font-size:1em;margin:1.2em 0 .3em;color:#581c87}.ev{font-size:13px;color:#6b6385}.obs{font-size:13px}.closing{font-style:italic}
.err{color:#b91c1c}.vote{background:#fff7e6;padding:8px 12px;border-radius:8px}
</style></head><body><main>
<h1>Palm reading comparison</h1>
<p>Each person’s photos were read by both providers. Read both, pick the better one, then check the key at the bottom.</p>
${body}
<details><summary><b>Reveal which reading came from which provider</b></summary><ul>${key.join('')}</ul></details>
</main></body></html>`,
  );
}

// ---------- main ----------

async function main() {
  for (const p of providers) {
    if (!(p in MODELS)) throw new Error(`Unknown provider "${p}" (use anthropic, openai, mock)`);
    if (p === 'anthropic' && !vars.ANTHROPIC_API_KEY) throw new Error('Set ANTHROPIC_API_KEY in .dev.vars');
    if (p === 'openai' && !vars.OPENAI_API_KEY) throw new Error('Set OPENAI_API_KEY in .dev.vars');
  }
  const people = loadPeople();
  if (!people.length) throw new Error(`No usable people found in ${folder}`);
  console.log(`Comparing ${providers.join(' vs ')} on ${people.length} people (${providers.map((p) => `${p}: ${MODELS[p]}`).join(', ')})`);

  mkdirSync(outDir, { recursive: true });
  const rows: { person: Person; order: Result[] }[] = [];
  let openaiModelError = false;
  for (const person of people) {
    process.stdout.write(`  ${person.id}… `);
    const results = await Promise.all(providers.map((p) => runOne(person, p)));
    console.log(results.map((r) => `${r.provider} ${r.error ? 'FAILED' : r.photoIssues ? 'photos rejected' : 'ok'} (${r.seconds}s)`).join(', '));
    for (const r of results) {
      if (r.error) console.log(`    ${r.provider}: ${r.error}`);
      if (r.provider === 'openai' && r.error && /model/i.test(r.error)) openaiModelError = true;
    }
    rows.push({ person, order: results.sort(() => Math.random() - 0.5) });
  }

  writeReport(rows);
  writeFileSync(
    path.join(outDir, 'results.json'),
    JSON.stringify(rows.map((r) => ({ person: r.person.id, request: { ...r.person.req, photos: undefined }, results: r.order })), null, 2),
  );
  console.log(`\nReport: ${path.join(outDir, 'index.html')}`);
  if (openaiModelError) await listOpenAIModels();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
