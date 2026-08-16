/**
 * AI Invisible Watermark & Provenance Cleaner (Layer A)
 * Strips zero-width chars, invisible unicode markers, bidi overrides,
 * tag characters, variation selectors, and homoglyphs used by LLMs (ChatGPT, Claude, Gemini, etc.)
 *
 * The decision rules follow `text_unicode.py` from guillaumemeyer/watermarks-remover
 * (MIT), including its "preserve multilingual Unicode" pass: characters that are
 * load-bearing in real text — emoji ZWJ/VS sequences, ZWNJ/ZWJ inside Arabic,
 * Indic, Khmer or Mongolian words, complete flag tag sequences, CJK and Mongolian
 * variation sequences, RTL directional marks and balanced LRE/RLE…PDF pairs — are
 * kept, while the same characters used as stray carriers are still removed.
 * Set `stripEmojiGlue` for the paranoid mode that strips them all.
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
const chr = (cp: number): string => String.fromCodePoint(cp);

const isTagChar = (cp: number): boolean => cp >= 0xe0000 && cp <= 0xe007f;
const isVarSelectorSupp = (cp: number): boolean => cp >= 0xe0100 && cp <= 0xe01ef;

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
}

export interface CleanAiWatermarksResult {
  cleanedText: string;
  removedCount: number;
  replacedSpaceCount: number;
  totalModifications: number;
  details: Record<string, number>;
}

type Action = 'keep' | 'strip' | 'replace';

interface DecideContext {
  prevKept: number | null;
  prevInput: number | null;
  nextInput: number | null;
  validFlagTag: boolean;
  validBidiEmbedding: boolean;
  normalizeSpaces: boolean;
  stripEmojiGlue: boolean;
  stripBidi: boolean;
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
  }

  if (STRIP_CODEPOINTS.has(cp) || isTagChar(cp) || isVarSelectorSupp(cp)) return 'strip';
  if (ctx.normalizeSpaces && SPACE_HOMOGLYPHS[cp] !== undefined) return 'replace';
  return 'keep';
}

const hex = (cp: number): string => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;

export function cleanAiWatermarks(
  text: string,
  options: CleanAiWatermarksOptions = { normalizeSpaces: true }
): CleanAiWatermarksResult {
  if (!text) {
    return {
      cleanedText: '',
      removedCount: 0,
      replacedSpaceCount: 0,
      totalModifications: 0,
      details: {},
    };
  }

  const normalizeSpaces = options.normalizeSpaces === true;
  const stripEmojiGlue = options.stripEmojiGlue === true;
  const stripBidi = options.stripBidi === true;

  // Iterate by code point so surrogate pairs stay intact.
  const cps = Array.from(text, (ch) => ch.codePointAt(0) as number);
  const validFlagTags = validFlagTagIndices(cps);
  const validBidiEmbeddings = validBidiEmbeddingIndices(cps);

  let removedCount = 0;
  let replacedSpaceCount = 0;
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
    });

    if (action === 'strip') {
      removedCount++;
      details[hex(cp)] = (details[hex(cp)] || 0) + 1;
      continue;
    }

    if (action === 'replace') {
      replacedSpaceCount++;
      const replacement = SPACE_HOMOGLYPHS[cp];
      chars.push(replacement);
      const key = `${hex(cp)} (Space)`;
      details[key] = (details[key] || 0) + 1;
      prevKept = replacement.codePointAt(0) as number;
      continue;
    }

    chars.push(chr(cp));
    if (!isGlue(cp)) prevKept = cp;
  }

  return {
    cleanedText: chars.join(''),
    removedCount,
    replacedSpaceCount,
    totalModifications: removedCount + replacedSpaceCount,
    details,
  };
}

/** How many characters cleanAiWatermarks() would remove or replace. */
export function countAiWatermarks(text: string): number {
  if (!text) return 0;
  return cleanAiWatermarks(text, { normalizeSpaces: true }).totalModifications;
}
