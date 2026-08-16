import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { detectFormat, inspect, clean } from '../src/utils/imageMeta';
import { IMAGE_SAMPLES } from './samples';
import golden from './golden/imageMeta.json';

const sha = (u8: Uint8Array): string => createHash('sha256').update(Buffer.from(u8)).digest('hex').slice(0, 16);

interface GoldenEntry {
  format: string;
  inspect: { hasC2pa: boolean; hasAiMetadata: boolean; findings: string[] };
  clean: Record<string, { sha: string; length: number; actions: string[] }>;
}
const expected = golden as Record<string, GoldenEntry>;

describe('imageMeta', () => {
  it('covers every sample in the golden file', () => {
    expect(Object.keys(IMAGE_SAMPLES).sort()).toEqual(Object.keys(expected).sort());
  });

  for (const [name, data] of Object.entries(IMAGE_SAMPLES)) {
    describe(name, () => {
      const want = expected[name];

      it('detects the format', () => {
        expect(detectFormat(data)).toBe(want.format);
      });

      it('reports the same findings', () => {
        const got = inspect(data);
        expect(got.format).toBe(want.format);
        expect(got.hasC2pa).toBe(want.inspect.hasC2pa);
        expect(got.hasAiMetadata).toBe(want.inspect.hasAiMetadata);
        expect(got.findings).toEqual(want.inspect.findings);
      });

      for (const stripAllMetadata of [true, false]) {
        it(`produces the same bytes with stripAllMetadata=${stripAllMetadata}`, () => {
          const got = clean(data, { stripAllMetadata });
          const w = want.clean[String(stripAllMetadata)];
          expect(got.actions).toEqual(w.actions);
          expect(got.data.length).toBe(w.length);
          expect(sha(got.data)).toBe(w.sha);
        });
      }

      it('is idempotent and keeps the container valid', () => {
        const once = clean(data, {}).data;
        const twice = clean(once, {}).data;
        expect(Array.from(twice)).toEqual(Array.from(once));
        expect(detectFormat(once)).toBe(want.format);
      });
    });
  }

  it('rejects data that is not an image it understands', () => {
    const notAnImage = Uint8Array.from('this is plain text, not an image', (c) => c.charCodeAt(0));
    expect(detectFormat(notAnImage)).toBe('unknown');
    expect(inspect(notAnImage).findings).toEqual(['unsupported image format']);
    expect(() => clean(notAnImage)).toThrow(/unsupported image format/);
  });

  it('never rewrites pixel data', () => {
    // The IDAT payload of a cleaned PNG must survive byte-for-byte: no re-encode.
    const src = IMAGE_SAMPLES.png_exif_c2pa;
    const idatOf = (u8: Uint8Array): string => {
      const hex = Buffer.from(u8).toString('hex');
      const at = hex.indexOf(Buffer.from('IDAT').toString('hex'));
      return hex.slice(at, at + 64);
    };
    expect(idatOf(clean(src, {}).data)).toBe(idatOf(src));
  });
});
