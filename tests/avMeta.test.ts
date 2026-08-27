import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import {
  AV_EXTS,
  cleanAv,
  cleanAvFile,
  detectAvFormat,
  detectAvFormatFile,
  inspectAv,
  inspectAvFile,
} from '../src/utils/avMeta';
import { AV_SAMPLES } from './samples';
import golden from './golden/avMeta.json';

const sha = (u8: Uint8Array): string =>
  createHash('sha256').update(Buffer.from(u8)).digest('hex').slice(0, 16);

interface GoldenClean {
  sha?: string;
  length?: number;
  actions?: string[];
  inspectionIncomplete?: boolean;
  error?: string;
}
interface GoldenEntry {
  format: string;
  inspect: { hasC2pa: boolean; hasAiMetadata: boolean; findings: string[]; notes: string[] };
  clean: Record<string, GoldenClean>;
}
const expected = golden as Record<string, GoldenEntry>;

/** A File over the same bytes, for the slice driver. */
const asFile = (data: Uint8Array, name = 'sample.bin'): File =>
  new File([data as BlobPart], name);

const bytesOfBlob = async (blob: Blob): Promise<Uint8Array> =>
  new Uint8Array(await blob.arrayBuffer());

describe('avMeta', () => {
  it('covers every sample in the golden file', () => {
    expect(Object.keys(AV_SAMPLES).sort()).toEqual(Object.keys(expected).sort());
  });

  for (const [name, data] of Object.entries(AV_SAMPLES)) {
    describe(name, () => {
      const want = expected[name];

      it('detects the format', () => {
        expect(detectAvFormat(data)).toBe(want.format);
      });

      it('reports the same findings', () => {
        const got = inspectAv(data);
        expect(got.format).toBe(want.format);
        expect(got.hasC2pa).toBe(want.inspect.hasC2pa);
        expect(got.hasAiMetadata).toBe(want.inspect.hasAiMetadata);
        expect(got.findings).toEqual(want.inspect.findings);
        expect(got.notes).toEqual(want.inspect.notes);
      });

      for (const stripAllMetadata of [true, false]) {
        it(`produces the same bytes with stripAllMetadata=${stripAllMetadata}`, () => {
          const w = want.clean[String(stripAllMetadata)];
          if (w.error !== undefined) {
            expect(() => cleanAv(data, { stripAllMetadata })).toThrow(w.error);
            return;
          }
          const got = cleanAv(data, { stripAllMetadata });
          expect(got.actions).toEqual(w.actions);
          expect(got.data.length).toBe(w.length);
          expect(sha(got.data)).toBe(w.sha);
          expect(got.inspectionIncomplete).toBe(w.inspectionIncomplete);
        });
      }

      it('is idempotent and keeps the container recognisable', () => {
        if (want.clean.true.error !== undefined) return;
        const once = cleanAv(data, {}).data;
        const twice = cleanAv(once, {}).data;
        expect(Array.from(twice)).toEqual(Array.from(once));
        expect(detectAvFormat(once)).toBe(want.format);
      });

      // The slice driver walks headers through File.slice() instead of holding
      // the file. It has to reach the buffer driver's answer either way.
      it('the slice driver detects the same format', async () => {
        expect(await detectAvFormatFile(asFile(data))).toBe(want.format);
      });

      it('the slice driver reports the same findings', async () => {
        const got = await inspectAvFile(asFile(data));
        const buffered = inspectAv(data);
        expect(got).toEqual(buffered);
      });

      for (const stripAllMetadata of [true, false]) {
        it(`the slice driver produces the same bytes with stripAllMetadata=${stripAllMetadata}`, async () => {
          const w = want.clean[String(stripAllMetadata)];
          if (w.error !== undefined) {
            await expect(cleanAvFile(asFile(data), { stripAllMetadata })).rejects.toThrow(w.error);
            return;
          }
          const got = await cleanAvFile(asFile(data), { stripAllMetadata });
          const out = await bytesOfBlob(got.blob);
          expect(got.format).toBe(want.format);
          expect(got.actions).toEqual(w.actions);
          expect(out.length).toBe(w.length);
          expect(sha(out)).toBe(w.sha);
          expect(got.inspectionIncomplete).toBe(w.inspectionIncomplete);
        });
      }
    });
  }

  it('names every extension it claims to support', () => {
    expect(AV_EXTS).toEqual(['mp4', 'mov', 'm4a', 'm4v', 'wav', 'mp3', 'flac']);
  });

  it('rejects data that is not audio or video it understands', async () => {
    const notAv = AV_SAMPLES.not_av;
    expect(detectAvFormat(notAv)).toBe('unknown');
    expect(inspectAv(notAv).findings).toEqual(['unsupported format (MP4/MOV/M4A/WAV/MP3/FLAC)']);
    expect(() => cleanAv(notAv)).toThrow(/unsupported audio\/video format/);
    await expect(cleanAvFile(asFile(notAv))).rejects.toThrow(/unsupported audio\/video format/);
  });

  it('never rewrites the media payload', async () => {
    // mdat is the samples. A cleaned MP4 keeps it byte for byte and keeps its
    // length, because a dropped box becomes an equal-size `free` box.
    const src = AV_SAMPLES.mp4_udta_and_xmp;
    const mdatOf = (u8: Uint8Array): string => {
      const hex = Buffer.from(u8).toString('hex');
      const at = hex.indexOf(Buffer.from('mdat').toString('hex'));
      return hex.slice(at);
    };
    const cleaned = cleanAv(src, {}).data;
    expect(cleaned.length).toBe(src.length);
    expect(mdatOf(cleaned)).toBe(mdatOf(src));

    const sliced = await bytesOfBlob((await cleanAvFile(asFile(src))).blob);
    expect(Array.from(sliced)).toEqual(Array.from(cleaned));
  });

  it('keeps the media of a truncated MP4 and says the inspection was incomplete', async () => {
    // guillaumemeyer/watermarks-remover#240, fixed upstream by #242.
    const whole = AV_SAMPLES.mp4_udta_ai;
    const data = whole.subarray(0, whole.length - 256);
    const got = cleanAv(data, {});
    expect(got.data.length).toBe(data.length);
    expect(got.inspectionIncomplete).toBe(true);
    expect(Buffer.from(got.data).includes('Generated by OpenAI Sora')).toBe(false);
    // The truncated tail is copied through verbatim.
    expect(Array.from(got.data.subarray(-256))).toEqual(Array.from(data.subarray(-256)));

    const sliced = await cleanAvFile(asFile(data));
    expect(Array.from(await bytesOfBlob(sliced.blob))).toEqual(Array.from(got.data));
    expect(sliced.inspectionIncomplete).toBe(true);
  });

  it('leaves a complete MP4 unflagged', async () => {
    const src = AV_SAMPLES.mp4_udta_ai;
    expect(cleanAv(src, {}).inspectionIncomplete).toBe(false);
    expect((await cleanAvFile(asFile(src))).inspectionIncomplete).toBe(false);
  });
});
