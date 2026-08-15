/**
 * AI Invisible Watermark & Provenance Cleaner (Layer A)
 * Strips zero-width chars, invisible unicode markers, bidi overrides,
 * tag characters, variation selectors, and homoglyphs used by LLMs (ChatGPT, Claude, Gemini, etc.)
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

export interface CleanAiWatermarksResult {
  cleanedText: string;
  removedCount: number;
  replacedSpaceCount: number;
  totalModifications: number;
  details: Record<string, number>;
}

export function cleanAiWatermarks(
  text: string,
  options: { normalizeSpaces?: boolean } = { normalizeSpaces: true }
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

  let removedCount = 0;
  let replacedSpaceCount = 0;
  const details: Record<string, number> = {};

  const chars: string[] = [];
  // Use for...of to properly iterate over Unicode code points / surrogate pairs
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;

    // Check Unicode tag characters (U+E0000..U+E007F) and Variation Selectors Supplement (U+E0100..U+E01EF)
    const isTagChar = cp >= 0xe0000 && cp <= 0xe007f;
    const isVarSelectorSupp = cp >= 0xe0100 && cp <= 0xe01ef;

    if (STRIP_CODEPOINTS.has(cp) || isTagChar || isVarSelectorSupp) {
      removedCount++;
      const hex = `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
      details[hex] = (details[hex] || 0) + 1;
      continue;
    }

    if (options.normalizeSpaces && SPACE_HOMOGLYPHS[cp] !== undefined) {
      replacedSpaceCount++;
      chars.push(SPACE_HOMOGLYPHS[cp]);
      const hex = `U+${cp.toString(16).toUpperCase().padStart(4, '0')} (Space)`;
      details[hex] = (details[hex] || 0) + 1;
      continue;
    }

    chars.push(ch);
  }

  return {
    cleanedText: chars.join(''),
    removedCount,
    replacedSpaceCount,
    totalModifications: removedCount + replacedSpaceCount,
    details,
  };
}

export function countAiWatermarks(text: string): number {
  if (!text) return 0;
  let count = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    if (
      STRIP_CODEPOINTS.has(cp) ||
      (cp >= 0xe0000 && cp <= 0xe007f) ||
      (cp >= 0xe0100 && cp <= 0xe01ef) ||
      SPACE_HOMOGLYPHS[cp] !== undefined
    ) {
      count++;
    }
  }
  return count;
}
