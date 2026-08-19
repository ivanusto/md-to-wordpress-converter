#!/usr/bin/env node
/**
 * Regenerates tests/golden/imageMeta.json from the reference implementation —
 * ivanusto/unmark-web's js/image_meta.js — and never from this project's own
 * TypeScript. Goldens produced by the code under test assert nothing; the point
 * of this file is to pin the port against something independently verified
 * (unmark-web is itself parity-tested against upstream's Python).
 *
 *   UNMARK_WEB_DIR=../unmark-web node --experimental-strip-types scripts/regen-golden.mjs
 *
 * Run this whenever scripts/upstream-sources.json records a new hash for
 * unmark-web/js/image_meta.js, in the same commit as the re-port.
 */
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// unmark-web was renamed from watermarks-remover-web in August 2026 and many
// existing checkouts still sit in a directory with the old name.
const CANDIDATES = process.env.UNMARK_WEB_DIR
  ? [process.env.UNMARK_WEB_DIR]
  : ['../unmark-web', '../watermarks-remover-web'];
const REF = CANDIDATES.map((d) => path.join(path.resolve(ROOT, d), 'js', 'image_meta.js')).find((f) => fs.existsSync(f));

if (!REF) {
  console.error('reference implementation not found; looked in:');
  for (const d of CANDIDATES) console.error(`  ${path.resolve(ROOT, d)}/js/image_meta.js`);
  console.error('clone https://github.com/ivanusto/unmark-web and point UNMARK_WEB_DIR at it');
  process.exit(2);
}

const ImageMeta = require(REF);
const { IMAGE_SAMPLES } = await import(path.join(ROOT, 'tests', 'samples.ts'));

const sha = (u8) => createHash('sha256').update(Buffer.from(u8)).digest('hex').slice(0, 16);

const golden = {};
for (const [name, data] of Object.entries(IMAGE_SAMPLES)) {
  const ins = ImageMeta.inspect(data);
  const entry = {
    format: ins.format,
    inspect: { hasC2pa: ins.has_c2pa, hasAiMetadata: ins.has_ai_metadata, findings: ins.findings },
    clean: {},
  };
  for (const stripAllMetadata of [true, false]) {
    const c = ImageMeta.clean(data, { stripAllMetadata });
    entry.clean[String(stripAllMetadata)] = { sha: sha(c.data), length: c.data.length, actions: c.actions };
  }
  golden[name] = entry;
}

const out = path.join(ROOT, 'tests', 'golden', 'imageMeta.json');
fs.writeFileSync(out, JSON.stringify(golden, null, 2) + '\n');
console.error(`wrote ${Object.keys(golden).length} entries to ${path.relative(ROOT, out)}`);
console.error(`reference: ${path.relative(ROOT, REF)} (sha256 ${createHash('sha256').update(fs.readFileSync(REF)).digest('hex').slice(0, 12)})`);
