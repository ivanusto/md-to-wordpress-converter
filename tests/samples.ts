/**
 * Synthetic images and text carrying the invisible-marker cases the cleaners have
 * to handle. These mirror the parity fixtures in ivanusto/unmark-web
 * (tests/test_image_meta_parity.py and tests/test_layer_a_parity.py), so the
 * golden files here pin this project against that verified reference.
 */
import { deflateSync, crc32 } from 'node:zlib';

const cat = (...parts: Uint8Array[]): Uint8Array => {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
const bytes = (s: string): Uint8Array => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);
const be32 = (n: number): Uint8Array => new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
const le32 = (n: number): Uint8Array => new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
const be16 = (n: number): Uint8Array => new Uint8Array([(n >>> 8) & 0xff, n & 0xff]);
const zeros = (n: number): Uint8Array => new Uint8Array(n);

type Blob = string | Uint8Array;
const buf = (b: Blob): Uint8Array => (typeof b === 'string' ? bytes(b) : b);

// ---------------------------------------------------------------- PNG
const PNG_SIG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function pngChunk(type: string, payload: Blob): Uint8Array {
  const t = bytes(type);
  const p = buf(payload);
  return cat(be32(p.length), t, p, be32(crc32(Buffer.from(cat(t, p)))));
}
function makePng(extra: Array<[string, Blob]>): Uint8Array {
  const ihdr = pngChunk('IHDR', cat(be32(1), be32(1), new Uint8Array([8, 6, 0, 0, 0])));
  const idat = pngChunk('IDAT', new Uint8Array(deflateSync(Buffer.from([0x00, 0xff, 0x00, 0x00, 0xff]))));
  const half = Math.floor(extra.length / 2);
  const head = extra.slice(0, half).map(([t, p]) => pngChunk(t, p));
  const tail = extra.slice(half).map(([t, p]) => pngChunk(t, p));
  return cat(PNG_SIG, ihdr, ...head, idat, ...tail, pngChunk('IEND', ''));
}

// ---------------------------------------------------------------- JPEG
const jpegSeg = (marker: number, payload: Blob): Uint8Array => {
  const p = buf(payload);
  return cat(new Uint8Array([0xff, marker]), be16(p.length + 2), p);
};
function makeJpeg(apps: Array<[number, Blob]>): Uint8Array {
  return cat(
    new Uint8Array([0xff, 0xd8]),
    jpegSeg(0xe0, 'JFIF\x00\x01\x02\x00\x00\x01\x00\x01\x00\x00'),
    ...apps.map(([m, p]) => jpegSeg(m, p)),
    jpegSeg(0xdb, cat(zeros(1), zeros(64))),
    jpegSeg(0xc0, '\x08\x00\x01\x00\x01\x01\x01\x11\x00'),
    jpegSeg(0xc4, cat(zeros(1), zeros(16), zeros(1))),
    jpegSeg(0xda, '\x01\x01\x00\x00\x3f\x00'),
    new Uint8Array([0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd9])
  );
}

// ---------------------------------------------------------------- WebP
function riffChunk(fourcc: string, payload: Blob): Uint8Array {
  const p = buf(payload);
  return cat(bytes(fourcc), le32(p.length), p, p.length & 1 ? zeros(1) : zeros(0));
}
function makeWebp(chunks: Array<[string, Blob]>, flags: number): Uint8Array {
  const body = cat(
    bytes('WEBP'),
    riffChunk('VP8X', new Uint8Array([flags, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
    ...chunks.map(([f, p]) => riffChunk(f, p)),
    riffChunk('VP8 ', zeros(11))
  );
  return cat(bytes('RIFF'), le32(body.length), body);
}

// ---------------------------------------------------------------- AVIF / HEIC
function isoBox(fourcc: string, payload: Blob): Uint8Array {
  const p = buf(payload);
  return cat(be32(p.length + 8), bytes(fourcc), p);
}
const isoMeta = (sub: Array<[string, Blob]>): Uint8Array => cat(zeros(4), ...sub.map(([f, p]) => isoBox(f, p)));
const makeIsobmff = (brand: string, boxes: Array<[string, Blob]>): Uint8Array =>
  cat(
    isoBox('ftyp', cat(bytes(brand), zeros(4), bytes(brand), bytes('mif1'))),
    ...boxes.map(([f, p]) => isoBox(f, p)),
    isoBox('mdat', zeros(8))
  );

const XMP_AI =
  '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF><digitalSourceType>trainedAlgorithmicMedia</digitalSourceType></rdf:RDF></x:xmpmeta>';
const JUMBF = bytes(
  '\x00\x00\x00\x1fjumb\x00\x00\x00\x17jumdc2pa\x00\x11\x00\x10\x80\x00\x00\xaa\x008\x9bq\x03c2pa\x00'
);
const XMP_UUID = new Uint8Array([
  0xbe, 0x7a, 0xcf, 0xcb, 0x97, 0xa9, 0x42, 0xe8, 0x9c, 0x71, 0x99, 0x94, 0x91, 0xe3, 0xaf, 0xac,
]);
const HDLR: [string, Uint8Array] = ['hdlr', cat(zeros(12), bytes('pict'))];

export const IMAGE_SAMPLES: Record<string, Uint8Array> = {
  png_clean: makePng([]),
  png_text: makePng([
    ['tEXt', 'Software\x00Photoshop'],
    ['iTXt', 'XML:com.adobe.xmp\x00\x00\x00\x00\x00' + XMP_AI],
  ]),
  png_exif_c2pa: makePng([
    ['eXIf', 'MM\x00*'],
    ['caBX', JUMBF],
    ['tIME', zeros(7)],
    ['pHYs', zeros(9)],
  ]),
  png_private_c2pa: makePng([
    ['prVt', 'hello contentcredentials'],
    ['tRNS', '\x00\x00'],
  ]),
  jpeg_clean: makeJpeg([]),
  jpeg_exif_xmp: makeJpeg([
    [0xe1, 'Exif\x00\x00MM\x00*'],
    [0xe1, 'http://ns.adobe.com/xap/1.0/\x00' + XMP_AI],
    [0xfe, 'a comment'],
  ]),
  jpeg_c2pa: makeJpeg([
    [0xeb, cat(bytes('JP\x00\x01'), JUMBF)],
    [0xe2, cat(bytes('ICC_PROFILE\x00'), zeros(20))],
    [0xee, cat(bytes('Adobe'), zeros(7))],
  ]),
  webp_clean: makeWebp([], 0x10),
  webp_meta: makeWebp(
    [
      ['ICCP', zeros(9)],
      ['EXIF', 'MM\x00*OpenAI'],
      ['XMP ', XMP_AI],
    ],
    0x10 | 0x20 | 0x08 | 0x04
  ),
  webp_c2pa: makeWebp([['C2PA', JUMBF]], 0x10),
  avif_clean: makeIsobmff('avif', [['meta', isoMeta([HDLR])]]),
  avif_xmp_c2pa: makeIsobmff('avif', [
    ['uuid', cat(XMP_UUID, bytes(XMP_AI))],
    ['jumb', JUMBF],
    ['meta', isoMeta([HDLR, ['iinf', '\x00\x00\x00\x01 Generated by OpenAI']])],
  ]),
  avif_uuid_plain: makeIsobmff('avif', [['uuid', cat(new Uint8Array(16).fill(0x11), bytes('harmless camera note'))]]),
  heic_meta: makeIsobmff('heic', [
    ['meta', isoMeta([HDLR, ['uuid', cat(XMP_UUID, bytes(XMP_AI))], ['xml ', '<note>contentcredentials</note>']])],
  ]),
  heic_c2pa_box: makeIsobmff('heix', [
    ['c2pa', JUMBF],
    ['meta', isoMeta([HDLR])],
  ]),
};

/** The Layer A cases from upstream's parity suite. */
export const TEXT_CASES: string[] = [
  'plain ascii',
  'zero​width​space and­soft­hyphen ﻿ bom',
  'bidi ‮evil‬ and ⁦iso⁩ and ‎‏ marks',
  'emoji glue: ❤️ ⚠️ \u{1F468}‍\u{1F469}‍\u{1F467} ❤️‍\u{1F525} keycap 1️⃣',
  'flag: \u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F} end',
  'persian می‌روم devanagari क्‍ष isolated‌ joiner',
  'mongolian ᠠ᠋ letter, isolated ᠋; khmer ក឴ ok, stray ឴; hangul ᄀᅠ ok, stray ᅠ',
  'arabic cf ؀١ ۝٢ syriac ܏ kaithi \u{110BD}',
  'spaces: nbsp thin 　ideo narrow  figure ',
  'confusables: АВС аео ＡＢＣ ａｂｃ',
  'vs: a︀b️c \u{E0100}d \u{E01EF}; tags \u{E0001}\u{E0041}; pua \u{F0000}\u{100000}',
  'other cf: \u{1BCA0} shorthand, \u{13430} egyptian,   not cf',
  'nfkc: ＡＢ 　 ① ﬁ',
  'mixed ​\u{1F600}️‍\u{1F4A9}​ end \u{1F3F4}\u{E0067} stray\u{E0067}',
];

export interface TextOptionSet {
  name: string;
  options: Record<string, boolean>;
}

/** Option combinations mirroring upstream's OPTION_SETS, plus this project's own switches. */
export const TEXT_OPTION_SETS: TextOptionSet[] = [
  { name: 'default', options: { normalizeSpaces: true } },
  { name: 'nfkc', options: { normalizeSpaces: true, nfkc: true } },
  { name: 'aggressive', options: { normalizeSpaces: true, aggressiveHomoglyphs: true } },
  { name: 'no-spaces', options: { normalizeSpaces: false } },
  { name: 'paranoid', options: { normalizeSpaces: true, stripEmojiGlue: true } },
  { name: 'strip-bidi', options: { normalizeSpaces: true, stripBidi: true } },
  { name: 'strip-pua', options: { normalizeSpaces: true, stripPrivateUse: true } },
  {
    name: 'everything',
    options: {
      normalizeSpaces: true,
      nfkc: true,
      aggressiveHomoglyphs: true,
      stripEmojiGlue: true,
      stripBidi: true,
      stripPrivateUse: true,
    },
  },
];
