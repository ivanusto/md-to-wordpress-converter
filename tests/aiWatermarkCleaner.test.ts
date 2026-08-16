import { describe, it, expect } from 'vitest';
import { cleanAiWatermarks, countAiWatermarks } from '../src/utils/aiWatermarkCleaner';
import { TEXT_CASES, TEXT_OPTION_SETS } from './samples';
import golden from './golden/layerA.json';

interface GoldenEntry {
  cleaned: string;
  removedCount: number;
  replacedSpaceCount: number;
  replacedConfusableCount: number;
  nfkcChangedCount: number;
}
const expected = golden as Record<string, GoldenEntry>;

describe('aiWatermarkCleaner', () => {
  it('covers every case in the golden file', () => {
    const keys = TEXT_OPTION_SETS.flatMap((s) => TEXT_CASES.map((_, i) => `${s.name}#${i}`));
    expect(keys.sort()).toEqual(Object.keys(expected).sort());
  });

  for (const set of TEXT_OPTION_SETS) {
    describe(set.name, () => {
      TEXT_CASES.forEach((text, i) => {
        it(`case ${i}`, () => {
          const got = cleanAiWatermarks(text, set.options);
          const want = expected[`${set.name}#${i}`];
          expect(got.cleanedText).toBe(want.cleaned);
          expect(got.removedCount).toBe(want.removedCount);
          expect(got.replacedSpaceCount).toBe(want.replacedSpaceCount);
          expect(got.replacedConfusableCount).toBe(want.replacedConfusableCount);
          expect(got.nfkcChangedCount).toBe(want.nfkcChangedCount);
        });
      });
    });
  }

  describe('load-bearing invisibles survive the default clean', () => {
    const kept: Array<[string, string]> = [
      ['emoji family', '\u{1F468}‍\u{1F469}‍\u{1F467}'],
      ['subdivision flag', '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}'],
      ['persian ZWNJ', 'می‌روم'],
      ['devanagari ZWJ', 'क्‍ष'],
      ['CJK variation sequence', '葛\u{E0100}'],
      ['RTL mark', '‏١٢٣‎'],
      ['private-use icon glyph', ''],
    ];
    for (const [name, text] of kept) {
      it(name, () => {
        const r = cleanAiWatermarks(text, { normalizeSpaces: true });
        expect(r.cleanedText).toBe(text);
        expect(r.totalModifications).toBe(0);
      });
    }
  });

  describe('stray carriers are still removed', () => {
    const stripped: Array<[string, string, string]> = [
      ['zero-width space', 'a​b', 'ab'],
      ['BOM', 'a﻿b', 'ab'],
      ['soft hyphen', 'a­b', 'ab'],
      ['RLO override', 'a‮b', 'ab'],
      ['lone tag char', 'a\u{E0067}b', 'ab'],
      ['lone variation selector', 'a\u{E0100}b', 'ab'],
      ['ZWJ between letters', 'a‍b', 'ab'],
    ];
    for (const [name, input, want] of stripped) {
      it(name, () => {
        expect(cleanAiWatermarks(input, { normalizeSpaces: true }).cleanedText).toBe(want);
      });
    }
  });

  it('leaves ordinary prose alone', () => {
    const text = '# 標題\n\n這是一篇正常的文章，含 emoji 😀、程式碼 `const x = 1;` 與全形標點：「引號」（括號）。\n';
    const r = cleanAiWatermarks(text, { normalizeSpaces: true });
    expect(r.cleanedText).toBe(text);
    expect(r.totalModifications).toBe(0);
  });

  it('returns an empty result for empty input', () => {
    const r = cleanAiWatermarks('', { normalizeSpaces: true });
    expect(r).toEqual({
      cleanedText: '',
      removedCount: 0,
      replacedSpaceCount: 0,
      replacedConfusableCount: 0,
      nfkcChangedCount: 0,
      totalModifications: 0,
      details: {},
    });
  });

  it('countAiWatermarks agrees with what cleaning actually changes', () => {
    for (const set of TEXT_OPTION_SETS) {
      for (const text of TEXT_CASES) {
        expect(countAiWatermarks(text, set.options)).toBe(cleanAiWatermarks(text, set.options).totalModifications);
      }
    }
  });
});
