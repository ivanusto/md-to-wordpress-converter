/**
 * AI Invisible Watermark & Provenance Cleaner (Layer A)
 * Strips zero-width chars, invisible unicode markers, bidi overrides, tag
 * characters, variation selectors, private-use characters, any other format
 * (Cf) character, and homoglyphs used by LLMs (ChatGPT, Claude, Gemini, etc.)
 *
 * Full port of the decision procedure in `text_unicode.py` from
 * guillaumemeyer/watermarks-remover (MIT), including its "preserve multilingual
 * Unicode" pass: characters that are load-bearing in real text — emoji ZWJ/VS
 * sequences, ZWNJ/ZWJ inside Arabic, Indic, Khmer or Mongolian words, complete
 * flag tag sequences, CJK and Mongolian variation sequences, orthographic
 * Arabic/Syriac format marks, RTL directional marks and balanced LRE/RLE…PDF
 * pairs — are kept, while the same characters used as stray carriers are still
 * removed. `stripEmojiGlue` and `stripBidi` turn those exemptions off.
 */

// Invisible / format codepoints commonly used for AI steganography or dirty copy-pastes
export const STRIP_CODEPOINTS = new Set<number>([
  0x00ad, // soft hyphen
  0x034f, // combining grapheme joiner
  0x061c, // Arabic letter mark
  0x115f, // Hangul choseong filler
  0x1160, // Hangul jungseong filler
  0x17b4, // Khmer vowel inherent AQ
  0x17b5, // Khmer vowel inherent AA
  0x180b, // Mongolian free variation selector-1
  0x180c,
  0x180d,
  0x180e, // Mongolian vowel separator
  0x200b, // zero width space (ZWSP)
  0x200c, // zero width non-joiner (ZWNJ)
  0x200d, // zero width joiner (ZWJ)
  0x200e, // Left-to-Right Mark (LRM)
  0x200f, // Right-to-Left Mark (RLM)
  0x202a, // Left-to-Right Embedding (LRE)
  0x202b, // Right-to-Left Embedding (RLE)
  0x202c, // Pop Directional Formatting (PDF)
  0x202d, // Left-to-Right Override (LRO)
  0x202e, // Right-to-Left Override (RLO)
  0x2060, // word joiner
  0x2061, // function application
  0x2062, // invisible times
  0x2063, // invisible separator
  0x2064, // invisible plus
  0x2066, // Left-to-Right Isolate (LRI)
  0x2067, // Right-to-Left Isolate (RLI)
  0x2068, // First Strong Isolate (FSI)
  0x2069, // Pop Directional Isolate (PDI)
  0x206a, // inhibit symmetric swapping
  0x206b,
  0x206c,
  0x206d,
  0x206e,
  0x206f,
  0xfeff, // Byte Order Mark (BOM) / ZWNBSP
  0xfe00, // Variation Selector-1
  0xfe01,
  0xfe02,
  0xfe03,
  0xfe04,
  0xfe05,
  0xfe06,
  0xfe07,
  0xfe08,
  0xfe09,
  0xfe0a,
  0xfe0b,
  0xfe0c,
  0xfe0d,
  0xfe0e,
  0xfe0f,
  0xfff9, // Interlinear annotation anchor
  0xfffa, // Interlinear annotation separator
  0xfffb, // Interlinear annotation terminator
]);

// Spaces that look like (or substitute for) standard ASCII U+0020 space
export const SPACE_HOMOGLYPHS: Record<number, string> = {
  0x00a0: ' ', // no-break space (NBSP)
  0x1680: ' ', // Ogham space mark
  0x2000: ' ', // en quad
  0x2001: ' ', // em quad
  0x2002: ' ', // en space
  0x2003: ' ', // em space
  0x2004: ' ', // three-per-em space
  0x2005: ' ', // four-per-em space
  0x2006: ' ', // six-per-em space
  0x2007: ' ', // figure space
  0x2008: ' ', // punctuation space
  0x2009: ' ', // thin space
  0x200a: ' ', // hair space
  0x202f: ' ', // narrow no-break space
  0x205f: ' ', // medium mathematical space
  0x3000: ' ', // ideographic space
};

// Cyrillic and fullwidth letters that read as ASCII. Aggressive: enabling this can
// alter legitimate non-Latin text, so it is opt-in.
export const LATIN_CONFUSABLES: Record<number, string> = {
  0x0410: 'A', 0x0412: 'B', 0x0415: 'E', 0x041a: 'K', 0x041c: 'M',
  0x041d: 'H', 0x041e: 'O', 0x0420: 'P', 0x0421: 'C', 0x0422: 'T',
  0x0425: 'X', 0x0430: 'a', 0x0435: 'e', 0x043e: 'o', 0x0440: 'p',
  0x0441: 'c', 0x0443: 'y', 0x0445: 'x', 0x0456: 'i',
};
for (let i = 0; i < 26; i++) {
  LATIN_CONFUSABLES[0xff21 + i] = String.fromCharCode(0x41 + i); // fullwidth A-Z
  LATIN_CONFUSABLES[0xff41 + i] = String.fromCharCode(0x61 + i); // fullwidth a-z
}

// Format characters that carry meaning in Arabic, Syriac and Kaithi orthography.
// Without this exemption the Cf catch-all below would delete them.
const ORTHOGRAPHIC_CF = new Set<number>([
  0x0600, 0x0601, 0x0602, 0x0603, 0x0604, 0x0605, 0x06dd, 0x070f, 0x08e2, 0x110bd, 0x110cd,
]);

// Directional marks and isolates are legitimate in mixed RTL/LTR prose. Embeddings
// and overrides stay destructive unless they form a balanced LRE/RLE…PDF pair.
const PRESERVABLE_BIDI = new Set<number>([0x061c, 0x200e, 0x200f, 0x2066, 0x2067, 0x2068, 0x2069]);
const EMOJI_GLUE = new Set<number>([0x200d, 0xfe0e, 0xfe0f]);
const SCRIPT_JOINERS = new Set<number>([0x200c, 0x200d]);
const MONGOLIAN_FVS = new Set<number>([0x180b, 0x180c, 0x180d]);
const KHMER_VOWELS = new Set<number>([0x17b4, 0x17b5]);
const HANGUL_FILLERS = new Set<number>([0x115f, 0x1160]);

// Broad script groups where ZWNJ/ZWJ can be orthographic rather than a carrier.
const JOINING_SCRIPTS: Array<[number, number, string]> = [
  [0x0600, 0x08ff, 'arabic'],
  [0x0900, 0x0dff, 'indic'],
  [0x0f00, 0x109f, 'south-asian'],
  [0x1780, 0x17ff, 'khmer'],
  [0x1800, 0x18af, 'mongolian'],
];

const RE_LM = /^[\p{L}\p{M}]$/u;
const RE_L = /^\p{L}$/u;
const RE_CF = /^\p{Cf}$/u;
const chr = (cp: number): string => String.fromCodePoint(cp);

const isTagChar = (cp: number): boolean => cp >= 0xe0001 && cp <= 0xe007f;
const isVarSelectorSupp = (cp: number): boolean => cp >= 0xe0100 && cp <= 0xe01ef;
const isPrivateUse = (cp: number): boolean =>
  (cp >= 0xe000 && cp <= 0xf8ff) || (cp >= 0xf0000 && cp <= 0xffffd) || (cp >= 0x100000 && cp <= 0x10fffd);

const isEmojiBase = (cp: number): boolean =>
  (cp >= 0x1f000 && cp <= 0x1faff) ||
  (cp >= 0x2190 && cp <= 0x25ff) ||
  (cp >= 0x2600 && cp <= 0x27bf) ||
  (cp >= 0x2b00 && cp <= 0x2bff) ||
  cp === 0x00a9 ||
  cp === 0x00ae ||
  cp === 0x2122 ||
  cp === 0x3030 ||
  cp === 0x303d ||
  cp === 0x3297 ||
  cp === 0x3299 ||
  cp === 0x23 ||
  cp === 0x2a ||
  (cp >= 0x30 && cp <= 0x39);

const isCjkIdeograph = (cp: number): boolean =>
  (cp >= 0x3400 && cp <= 0x4dbf) ||
  (cp >= 0x4e00 && cp <= 0x9fff) ||
  (cp >= 0xf900 && cp <= 0xfaff) ||
  (cp >= 0x20000 && cp <= 0x323af);

const isMongolianBase = (cp: number): boolean => cp >= 0x1800 && cp <= 0x18af;
const isMongolianLetter = (cp: number): boolean => isMongolianBase(cp) && RE_L.test(chr(cp));
const isKhmerLetter = (cp: number): boolean => cp >= 0x1780 && cp <= 0x17ff && RE_L.test(chr(cp));
const isHangulJamo = (cp: number): boolean =>
  (cp >= 0x1100 && cp <= 0x11ff) || (cp >= 0xa960 && cp <= 0xa97c) || (cp >= 0xd7b0 && cp <= 0xd7c6);

function joiningScript(cp: number): string | null {
  for (const [start, end, name] of JOINING_SCRIPTS) {
    if (cp >= start && cp <= end && RE_LM.test(chr(cp))) return name;
  }
  return null;
}

/** Glue never advances the "previous kept character" cursor. */
const isGlue = (cp: number): boolean =>
  EMOJI_GLUE.has(cp) ||
  isVarSelectorSupp(cp) ||
  (cp >= 0xfe00 && cp <= 0xfe0f) ||
  (cp >= 0x180b && cp <= 0x180d) ||
  SCRIPT_JOINERS.has(cp) ||
  isTagChar(cp) ||
  MONGOLIAN_FVS.has(cp) ||
  KHMER_VOWELS.has(cp) ||
  HANGUL_FILLERS.has(cp);

/** Indices inside complete subdivision-flag tag sequences (🏴 + tags + U+E007F). */
function validFlagTagIndices(cps: number[]): Set<number> {
  const valid = new Set<number>();
  let i = 0;
  while (i < cps.length) {
    if (cps[i] !== 0x1f3f4) {
      i++;
      continue;
    }
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
function validBidiEmbeddingIndices(cps: number[]): Set<number> {
  const valid = new Set<number>();
  const stack: Array<[number, number]> = [];
  for (let index = 0; index < cps.length; index++) {
    const cp = cps[index];
    if (cp === 0x202a || cp === 0x202b || cp === 0x202d || cp === 0x202e) {
      stack.push([cp, index]);
    } else if (cp === 0x202c) {
      const top = stack.pop();
      if (!top) continue;
      if (top[0] === 0x202a || top[0] === 0x202b) {
        valid.add(top[1]);
        valid.add(index);
      }
    }
  }
  return valid;
}

export interface CleanAiWatermarksOptions {
  normalizeSpaces?: boolean;
  /** Paranoid mode: also strip load-bearing emoji/script glue. */
  stripEmojiGlue?: boolean;
  /** Also strip RTL directional marks and balanced embeddings (independent of the above). */
  stripBidi?: boolean;
  /** Map Cyrillic/fullwidth lookalikes to ASCII letters. Can alter legitimate text. */
  aggressiveHomoglyphs?: boolean;
  /** Apply Unicode NFKC after cleaning (fullwidth → ASCII, ligatures, …). */
  nfkc?: boolean;
}

export interface CleanAiWatermarksResult {
  cleanedText: string;
  removedCount: number;
  replacedSpaceCount: number;
  /** Cyrillic/fullwidth lookalikes mapped to ASCII (only when aggressiveHomoglyphs). */
  replacedConfusableCount: number;
  /** Characters changed by NFKC normalization (only when nfkc). */
  nfkcChangedCount: number;
  totalModifications: number;
  details: Record<string, number>;
}

type Action = 'keep' | 'strip' | 'space' | 'confusable';

interface DecideContext {
  prevKept: number | null;
  prevInput: number | null;
  nextInput: number | null;
  validFlagTag: boolean;
  validBidiEmbedding: boolean;
  normalizeSpaces: boolean;
  stripEmojiGlue: boolean;
  stripBidi: boolean;
  treatConfusables: boolean;
}

function decide(cp: number, ctx: DecideContext): Action {
  const { prevKept, prevInput, nextInput, stripEmojiGlue, stripBidi } = ctx;

  if (ctx.validBidiEmbedding && !stripBidi) return 'keep';
  if (PRESERVABLE_BIDI.has(cp) && !stripBidi) return 'keep';

  if (prevInput !== null && !stripEmojiGlue) {
    if (isVarSelectorSupp(cp) && isCjkIdeograph(prevInput)) return 'keep';
    if (cp >= 0x180b && cp <= 0x180d && isMongolianBase(prevInput)) return 'keep';
    if (cp >= 0xfe00 && cp <= 0xfe0d && isCjkIdeograph(prevInput)) return 'keep';
  }

  if (EMOJI_GLUE.has(cp) && !stripEmojiGlue) {
    if ((cp === 0xfe0e || cp === 0xfe0f) && prevInput !== null && isEmojiBase(prevInput)) return 'keep';
    if (
      cp === 0x200d &&
      prevKept !== null &&
      nextInput !== null &&
      isEmojiBase(prevKept) &&
      isEmojiBase(nextInput)
    ) {
      return 'keep';
    }
  }

  if (!stripEmojiGlue) {
    if (SCRIPT_JOINERS.has(cp) && prevInput !== null && nextInput !== null) {
      const prevScript = joiningScript(prevInput);
      if (prevScript !== null && prevScript === joiningScript(nextInput)) return 'keep';
    }
    if (isTagChar(cp) && ctx.validFlagTag) return 'keep';
    if (MONGOLIAN_FVS.has(cp) && prevKept !== null && isMongolianLetter(prevKept)) return 'keep';
    if (KHMER_VOWELS.has(cp) && prevKept !== null && isKhmerLetter(prevKept)) return 'keep';
    if (HANGUL_FILLERS.has(cp) && prevKept !== null && isHangulJamo(prevKept)) return 'keep';
    if (ORTHOGRAPHIC_CF.has(cp)) return 'keep';
  }

  if (STRIP_CODEPOINTS.has(cp) || isVarSelectorSupp(cp) || isTagChar(cp) || isPrivateUse(cp)) return 'strip';
  if (ctx.normalizeSpaces && SPACE_HOMOGLYPHS[cp] !== undefined) return 'space';
  if (ctx.treatConfusables && LATIN_CONFUSABLES[cp] !== undefined) return 'confusable';
  if (RE_CF.test(chr(cp)) && SPACE_HOMOGLYPHS[cp] === undefined) return 'strip';
  return 'keep';
}

const hex = (cp: number): string => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;

/**
 * Characters NFKC actually rewrote, counted the way upstream does: the input
 * positions difflib.SequenceMatcher would report as non-equal, i.e. the input
 * length minus the total size of its matching blocks.
 */
function nfkcChangedChars(before: number[], after: number[]): number {
  const index = new Map<number, number[]>();
  for (let j = 0; j < after.length; j++) {
    const list = index.get(after[j]);
    if (list) list.push(j);
    else index.set(after[j], [j]);
  }

  const longestMatch = (alo: number, ahi: number, blo: number, bhi: number): [number, number, number] => {
    let besti = alo;
    let bestj = blo;
    let bestsize = 0;
    let j2len = new Map<number, number>();
    for (let i = alo; i < ahi; i++) {
      const next = new Map<number, number>();
      for (const j of index.get(before[i]) ?? []) {
        if (j < blo) continue;
        if (j >= bhi) break;
        const k = (j2len.get(j - 1) ?? 0) + 1;
        next.set(j, k);
        if (k > bestsize) {
          besti = i - k + 1;
          bestj = j - k + 1;
          bestsize = k;
        }
      }
      j2len = next;
    }
    return [besti, bestj, bestsize];
  };

  let matched = 0;
  const queue: Array<[number, number, number, number]> = [[0, before.length, 0, after.length]];
  while (queue.length) {
    const [alo, ahi, blo, bhi] = queue.pop() as [number, number, number, number];
    const [i, j, k] = longestMatch(alo, ahi, blo, bhi);
    if (!k) continue;
    matched += k;
    if (alo < i && blo < j) queue.push([alo, i, blo, j]);
    if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
  }
  return before.length - matched;
}

export function cleanAiWatermarks(
  text: string,
  options: CleanAiWatermarksOptions = { normalizeSpaces: true }
): CleanAiWatermarksResult {
  if (!text) {
    return {
      cleanedText: '',
      removedCount: 0,
      replacedSpaceCount: 0,
      replacedConfusableCount: 0,
      nfkcChangedCount: 0,
      totalModifications: 0,
      details: {},
    };
  }

  const normalizeSpaces = options.normalizeSpaces === true;
  const stripEmojiGlue = options.stripEmojiGlue === true;
  const stripBidi = options.stripBidi === true;
  const treatConfusables = options.aggressiveHomoglyphs === true;

  // Iterate by code point so surrogate pairs stay intact.
  const cps = Array.from(text, (ch) => ch.codePointAt(0) as number);
  const validFlagTags = validFlagTagIndices(cps);
  const validBidiEmbeddings = validBidiEmbeddingIndices(cps);

  let removedCount = 0;
  let replacedSpaceCount = 0;
  let replacedConfusableCount = 0;
  const details: Record<string, number> = {};
  const chars: string[] = [];
  let prevKept: number | null = null;

  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i];
    const action = decide(cp, {
      prevKept,
      prevInput: i > 0 ? cps[i - 1] : null,
      nextInput: i + 1 < cps.length ? cps[i + 1] : null,
      validFlagTag: validFlagTags.has(i),
      validBidiEmbedding: validBidiEmbeddings.has(i),
      normalizeSpaces,
      stripEmojiGlue,
      stripBidi,
      treatConfusables,
    });

    if (action === 'strip') {
      removedCount++;
      details[hex(cp)] = (details[hex(cp)] || 0) + 1;
      continue;
    }

    if (action === 'space' || action === 'confusable') {
      const isSpace = action === 'space';
      const replacement = isSpace ? SPACE_HOMOGLYPHS[cp] : LATIN_CONFUSABLES[cp];
      if (isSpace) replacedSpaceCount++;
      else replacedConfusableCount++;
      chars.push(replacement);
      const key = `${hex(cp)} (${isSpace ? 'Space' : 'Confusable'})`;
      details[key] = (details[key] || 0) + 1;
      prevKept = replacement.codePointAt(0) as number;
      continue;
    }

    chars.push(chr(cp));
    if (!isGlue(cp)) prevKept = cp;
  }

  let cleanedText = chars.join('');
  let nfkcChangedCount = 0;
  if (options.nfkc === true) {
    const normalized = cleanedText.normalize('NFKC');
    if (normalized !== cleanedText) {
      const before = Array.from(cleanedText, (ch) => ch.codePointAt(0) as number);
      const after = Array.from(normalized, (ch) => ch.codePointAt(0) as number);
      nfkcChangedCount = nfkcChangedChars(before, after) || 1;
      details.NFKC = (details.NFKC || 0) + nfkcChangedCount;
      cleanedText = normalized;
    }
  }

  return {
    cleanedText,
    removedCount,
    replacedSpaceCount,
    replacedConfusableCount,
    nfkcChangedCount,
    totalModifications: removedCount + replacedSpaceCount + replacedConfusableCount + nfkcChangedCount,
    details,
  };
}

/** How many characters cleanAiWatermarks() would remove or replace. */
export function countAiWatermarks(
  text: string,
  options: CleanAiWatermarksOptions = { normalizeSpaces: true }
): number {
  if (!text) return 0;
  return cleanAiWatermarks(text, options).totalModifications;
}
