#!/usr/bin/env node
/**
 * Regenerates tests/golden/imageMeta.json and tests/golden/layerA.json from the
 * reference implementation —
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
const REF_DIR = CANDIDATES.map((d) => path.join(path.resolve(ROOT, d), 'js')).find((f) => fs.existsSync(path.join(f, 'image_meta.js')));

if (!REF_DIR) {
  console.error('reference implementation not found; looked in:');
  for (const d of CANDIDATES) console.error(`  ${path.resolve(ROOT, d)}/js/image_meta.js`);
  console.error('clone https://github.com/ivanusto/unmark-web and point UNMARK_WEB_DIR at it');
  process.exit(2);
}

const REF = path.join(REF_DIR, 'image_meta.js');
const REF_TEXT = path.join(REF_DIR, 'layer_a.js');
const ImageMeta = require(REF);
const LayerA = require(REF_TEXT);
const { IMAGE_SAMPLES, TEXT_CASES, TEXT_OPTION_SETS } = await import(path.join(ROOT, 'tests', 'samples.ts'));

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

// ---------------------------------------------------------------- Layer A
//
// The text golden cannot come from a single reference call, because this
// project diverges from unmark-web in exactly one place: private-use characters
// are kept unless `stripPrivateUse` is set, since icon fonts live there and
// silently deleting a glyph from a published post is worse than leaving a rare
// carrier in. So the loop below drives the reference's own exported decide()
// and applies that one divergence explicitly, where it can be seen.
//
// Two cross-checks keep the loop honest, and both throw rather than write a
// plausible wrong golden:
//
//   1. When no private-use character is involved, the loop's output must equal
//      what the reference's own clean() produced for the same case.
//   2. When one is, the loop's output must equal the reference's output with
//      the private-use characters put back at their original offsets. Those two
//      derivations only disagree if a surviving private-use character moved the
//      "previous kept character" cursor and changed a later decision, which is
//      a case a human needs to look at.
const isPrivateUse = (cp) =>
  (cp >= 0xe000 && cp <= 0xf8ff) || (cp >= 0xf0000 && cp <= 0xffffd) || (cp >= 0x100000 && cp <= 0x10fffd);

/** Indices inside complete subdivision-flag tag sequences (🏴 + tags + U+E007F). */
function validFlagTagIndices(cps) {
  const valid = new Set();
  let i = 0;
  while (i < cps.length) {
    if (cps[i] !== 0x1f3f4) { i++; continue; }
    let j = i + 1;
    while (j < cps.length && cps[j] >= 0xe0020 && cps[j] <= 0xe007e) j++;
    if (j > i + 1 && j < cps.length && cps[j] === 0xe007f) {
      for (let k = i + 1; k <= j; k++) valid.add(k);
      i = j + 1;
    } else {
      i++;
    }
  }
  return valid;
}

/** Indices belonging to balanced LRE/RLE…PDF pairs (overrides excluded). */
function validBidiEmbeddingIndices(cps) {
  const valid = new Set();
  const stack = [];
  for (let index = 0; index < cps.length; index++) {
    const cp = cps[index];
    if (cp === 0x202a || cp === 0x202b || cp === 0x202d || cp === 0x202e) stack.push([cp, index]);
    else if (cp === 0x202c) {
      const top = stack.pop();
      if (!top) continue;
      if (top[0] === 0x202a || top[0] === 0x202b) { valid.add(top[1]); valid.add(index); }
    }
  }
  return valid;
}

const REF_OPTION_KEYS = ['normalizeSpaces', 'aggressiveHomoglyphs', 'stripEmojiGlue', 'stripBidi', 'nfkc'];
const toRefOptions = (options) => {
  const out = { normalizeSpaces: false, aggressiveHomoglyphs: false, stripEmojiGlue: false, stripBidi: false, nfkc: false };
  for (const k of REF_OPTION_KEYS) if (options[k] === true) out[k] = true;
  return out;
};

function cleanViaReference(text, options, label) {
  const stripPrivateUse = options.stripPrivateUse === true;
  const refOptions = toRefOptions(options);
  const cps = Array.from(text, (ch) => ch.codePointAt(0));
  const flagTags = validFlagTagIndices(cps);
  const bidiEmbeddings = validBidiEmbeddingIndices(cps);

  let removedCount = 0;
  let replacedSpaceCount = 0;
  let replacedConfusableCount = 0;
  let diverged = false;
  const chars = [];
  const keptPrivateUse = [];
  let prevKept = null;

  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i];
    const [action, outChar, kind] = LayerA.decide(
      cp,
      prevKept,
      i > 0 ? cps[i - 1] : null,
      i + 1 < cps.length ? cps[i + 1] : null,
      {
        validFlagTag: flagTags.has(i),
        validBidiEmbedding: bidiEmbeddings.has(i),
        normalizeSpaces: refOptions.normalizeSpaces,
        treatConfusables: refOptions.aggressiveHomoglyphs,
        stripEmojiGlue: refOptions.stripEmojiGlue,
        stripBidi: refOptions.stripBidi,
      }
    );

    if (action === 'strip') {
      if (!stripPrivateUse && isPrivateUse(cp)) {
        diverged = true;
        keptPrivateUse.push([chars.length, String.fromCodePoint(cp)]);
        chars.push(String.fromCodePoint(cp));
        if (!LayerA.isGlue(cp)) prevKept = cp;
        continue;
      }
      removedCount++;
      continue;
    }
    if (action === 'replace') {
      if (kind === 'space') replacedSpaceCount++;
      else replacedConfusableCount++;
      chars.push(outChar);
      prevKept = outChar.codePointAt(0);
      continue;
    }
    chars.push(outChar);
    if (!LayerA.isGlue(cp)) prevKept = cp;
  }

  // Cross-check against the reference's own clean(), pre-NFKC so the two are
  // comparable character for character.
  const bare = LayerA.clean(text, { ...refOptions, nfkc: false });
  const cleaned = chars.join('');
  if (!diverged) {
    if (cleaned !== bare.cleaned) {
      throw new Error(`${label}: loop and reference clean() disagree\n  loop: ${JSON.stringify(cleaned)}\n  ref : ${JSON.stringify(bare.cleaned)}`);
    }
    if (removedCount !== bare.stats.removed_count) {
      throw new Error(`${label}: removed count ${removedCount} != reference ${bare.stats.removed_count}`);
    }
  } else {
    const rebuilt = Array.from(bare.cleaned);
    for (const [at, ch] of keptPrivateUse) rebuilt.splice(at, 0, ch);
    if (rebuilt.join('') !== cleaned) {
      throw new Error(`${label}: a surviving private-use character changed a later decision; regenerate this case by hand\n  loop     : ${JSON.stringify(cleaned)}\n  reinsert : ${JSON.stringify(rebuilt.join(''))}`);
    }
  }

  // NFKC is applied to the already-cleaned text, so the reference's own count is
  // only usable when the cleaned texts match. When a private-use character
  // survived they do not, and the count is taken from the reference only after
  // checking that NFKC leaves the surviving characters alone.
  let nfkcChangedCount = 0;
  let finalText = cleaned;
  if (refOptions.nfkc) {
    const normalized = cleaned.normalize('NFKC');
    if (normalized !== cleaned) {
      if (diverged) {
        throw new Error(`${label}: NFKC rewrites a case that also keeps private-use characters; the reference count cannot be reused here`);
      }
      const withNfkc = LayerA.clean(text, refOptions);
      nfkcChangedCount = withNfkc.stats.replaced.NFKC_normalize ?? 0;
      finalText = normalized;
    }
  }

  return { cleaned: finalText, removedCount, replacedSpaceCount, replacedConfusableCount, nfkcChangedCount };
}

const textGolden = {};
for (const set of TEXT_OPTION_SETS) {
  TEXT_CASES.forEach((text, i) => {
    textGolden[`${set.name}#${i}`] = cleanViaReference(text, set.options, `${set.name}#${i}`);
  });
}

const textOut = path.join(ROOT, 'tests', 'golden', 'layerA.json');
fs.writeFileSync(textOut, JSON.stringify(textGolden, null, 2) + '\n');
console.error(`wrote ${Object.keys(textGolden).length} entries to ${path.relative(ROOT, textOut)}`);
console.error(`reference: ${path.relative(ROOT, REF_TEXT)} (sha256 ${createHash('sha256').update(fs.readFileSync(REF_TEXT)).digest('hex').slice(0, 12)})`);
