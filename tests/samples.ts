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
const le16 = (n: number): Uint8Array => new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
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
/** Drop the last `cut` bytes, so the final box overruns the buffer. */
const truncateIsobmff = (data: Uint8Array, cut: number): Uint8Array => data.subarray(0, data.length - cut);

/**
 * A PNG cut mid-IDAT, with no IEND: the last chunk header declares more payload
 * than the file holds. Built without makePng because the cleaners stop walking
 * at IEND, so a tail appended after one is never reached.
 */
function makeTruncatedPng(extra: Array<[string, Blob]>, tail: Uint8Array): Uint8Array {
  const ihdr = pngChunk('IHDR', cat(be32(1), be32(1), new Uint8Array([8, 6, 0, 0, 0])));
  return cat(PNG_SIG, ihdr, ...extra.map(([t, p]) => pngChunk(t, p)), be32(4096), bytes('IDAT'), tail);
}

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

// C2PA ContentProvenanceBox user type for BMFF containers, upstream #264. A
// manifest lives in a top-level `uuid` box carrying this user type rather than
// in a `c2pa` box, so a payload with no ASCII marker is recognized by type.
export const C2PA_BMFF_UUID = new Uint8Array([
  0xd8, 0xfe, 0xc3, 0xd6, 0x1b, 0x0e, 0x48, 0x3c, 0x92, 0x97, 0x58, 0x28, 0x87, 0x7e, 0xc4, 0x81,
]);
const counting = (n: number): Uint8Array => Uint8Array.from({ length: n }, (_, i) => i + 1);
/** A top-level C2PA content-provenance `uuid` box payload. */
const c2paProv = (
  purpose = 'manifest',
  data: Blob = cat(bytes('c2pa'), zeros(8), bytes('jumb'), zeros(4)),
  { fullbox = false }: { fullbox?: boolean } = {}
): Uint8Array => cat(fullbox ? zeros(4) : zeros(0), C2PA_BMFF_UUID, bytes(purpose), zeros(1), data);

// ---------------------------------------------------------------- GIF
function gifExtension(label: number, payload: Blob): Uint8Array {
  const p = buf(payload);
  const parts: Uint8Array[] = [new Uint8Array([0x21, label])];
  for (let pos = 0; pos < p.length; pos += 255) {
    const chunk = p.subarray(pos, pos + 255);
    parts.push(new Uint8Array([chunk.length]), chunk);
  }
  parts.push(new Uint8Array([0x00]));
  return cat(...parts);
}

const makeGif = (extensions: Array<[number, Blob]>): Uint8Array => {
  const lsd = cat(le16(1), le16(1), new Uint8Array([0x00, 0x00, 0x00]));
  const image = cat(
    new Uint8Array([0x2c]),
    le16(0), le16(0), le16(1), le16(1),
    new Uint8Array([0x00, 0x02, 0x02, 0x02, 0x44, 0x00]),
  );
  return cat(bytes('GIF89a'), lsd, ...extensions.map(([l, p]) => gifExtension(l, p)), image, new Uint8Array([0x3b]));
};


/* watermarks-remover#308 caps a decompressed zTXt/iTXt value at 1 MiB: PNG text
 * is metadata, not a document, and a few hundred KB of crafted deflate expands
 * to hundreds of megabytes that the marker scan then copies again. */
const PNG_TEXT_CAP = 1 << 20;
const deflate = (text: string): Uint8Array => new Uint8Array(deflateSync(Buffer.from(text)));
/* Half a deflate stream: a text chunk that stops in the middle. #308 also
 * swapped zlib.decompress for a decompressobj, which hands back what it managed
 * to decode instead of raising, so markers in the surviving prefix are now
 * found where the whole chunk used to be discarded. */
const half = (stream: Uint8Array): Uint8Array => stream.subarray(0, stream.length >> 1);
const OVER_CAP = deflate('Generated by AI ' + 'A'.repeat(PNG_TEXT_CAP));
const AT_CAP = deflate('Generated by AI ' + 'A'.repeat(PNG_TEXT_CAP - 16));
const CUT_FLAT = half(deflate('Generated by OpenAI Sora '.repeat(100)));
const CUT_GENERATOR = half(deflate('ChatGPT made this image for you '.repeat(100)));

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
  // Upstream watermarks-remover#125: product names are matched only against the
  // values of the generator-bearing keys (Software / Creator / parameters),
  // never as a flat blob scan — hence the free-text negatives below.
  png_gen_software: makePng([['tEXt', 'Software\x00ChatGPT']]),
  png_gen_creator: makePng([['tEXt', 'Creator\x00DALL-E 3']]),
  png_gen_parameters: makePng([['tEXt', 'parameters\x00Steps: 20, Sampler: DPM++ 2M, Model: SDXL base 1.0']]),
  png_gen_parameters_plain: makePng([['tEXt', 'parameters\x00Steps: 20, Sampler: DPM++ 2M, Model: sd_xl_base_1.0']]),
  png_gen_lowercase: makePng([['tEXt', 'software\x00chatgpt']]),
  png_gen_free_text: makePng([['tEXt', 'Comment\x00Hiking near the Gemini constellation']]),
  png_gen_wrong_key: makePng([['tEXt', 'Title\x00Midjourney fan art']]),
  png_gen_ztxt: makePng([['zTXt', cat(bytes('Software\x00\x00'), new Uint8Array(deflateSync(Buffer.from('ChatGPT'))))]]),
  png_gen_itxt: makePng([['iTXt', 'Software\x00\x00\x00\x00\x00ChatGPT']]),
  png_gen_itxt_compressed: makePng([
    ['iTXt', cat(bytes('Software\x00\x01\x00\x00\x00'), new Uint8Array(deflateSync(Buffer.from('Midjourney v6'))))],
  ]),
  // Upstream watermarks-remover#127: flat markers must also match text that only
  // exists once the chunk is decompressed.
  png_ztxt_flat_hint: makePng([
    ['zTXt', cat(bytes('Comment\x00\x00'), new Uint8Array(deflateSync(Buffer.from('Generated by AI'))))],
  ]),
  png_itxt_flat_hint: makePng([
    ['iTXt', cat(bytes('Comment\x00\x01\x00\x00\x00'), new Uint8Array(deflateSync(Buffer.from('Generated by AI'))))],
  ]),
  png_itxt_utf8: makePng([['iTXt', new TextEncoder().encode('Description\x00\x00\x00\x00\x00\u756b\u3092 Midjourney \u3067\u751f\u6210')]]),
  // Undecodable payloads must degrade silently, exactly as zlib.error does.
  png_ztxt_corrupt: makePng([['zTXt', 'Software\x00\x00not-actually-zlib']]),
  png_itxt_truncated: makePng([['iTXt', 'Software\x00\x00\x00']]),
  // #308: over the cap the chunk is refused, not scanned.
  png_ztxt_over_cap: makePng([['zTXt', cat(bytes('Comment\x00\x00'), OVER_CAP)]]),
  png_itxt_over_cap: makePng([['iTXt', cat(bytes('Comment\x00\x01\x00\x00\x00'), OVER_CAP)]]),
  // Sixteen bytes under the cap, so the boundary is asserted, not assumed.
  png_ztxt_at_cap: makePng([['zTXt', cat(bytes('Comment\x00\x00'), AT_CAP)]]),
  // A deflate stream that stops early still yields the prefix it decoded.
  png_ztxt_cut_stream: makePng([['zTXt', cat(bytes('Comment\x00\x00'), CUT_FLAT)]]),
  png_ztxt_cut_generator: makePng([['zTXt', cat(bytes('Software\x00\x00'), CUT_GENERATOR)]]),
  png_itxt_cut_generator: makePng([['iTXt', cat(bytes('Software\x00\x01\x00\x00\x00'), CUT_GENERATOR)]]),
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
  // Upstream watermarks-remover#216: COM is unkeyed free text. Keep mode
  // preserves a benign comment, and the flat AI_META_HINTS entries that read as
  // ordinary prose ("Generated by", bare vendor names) are not COM hints. The
  // same change narrowed the whole-file byte scan, so "jumb" and the XMP
  // InstanceID namespace no longer promote a JPEG to C2PA on their own.
  jpeg_com_benign: makeJpeg([[0xfe, 'Family vacation, Shanghai, 2026-08-21']]),
  jpeg_com_generated_by: makeJpeg([[0xfe, 'Generated by ImageMagick 7.1']]),
  jpeg_com_vendor_name: makeJpeg([[0xfe, 'Claude Monet retrospective']]),
  jpeg_com_ai: makeJpeg([[0xfe, 'Generated by AI with OpenAI']]),
  jpeg_com_c2pa: makeJpeg([[0xfe, 'contentcredentials c2pa manifest note']]),
  jpeg_com_jumbo: makeJpeg([[0xfe, 'JUMBO family photo']]),
  jpeg_xmp_instanceid: makeJpeg([
    [
      0xe1,
      'http://ns.adobe.com/xap/1.0/\x00<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF ' +
        'xmlns:xmpMM="http://ns.adobe.com/xmp/InstanceID/"/></rdf:RDF></x:xmpmeta>',
    ],
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
  // Upstream watermarks-remover#182: an interrupted download leaves a box (or a
  // PNG chunk) whose declared length overruns the file. The tail has to survive,
  // or a recoverable image becomes an unopenable husk reported as already clean.
  avif_truncated_tail: truncateIsobmff(
    makeIsobmff('avif', [
      ['uuid', cat(XMP_UUID, bytes(XMP_AI))],
      ['meta', isoMeta([HDLR])],
    ]),
    4
  ),
  avif_truncated_junk: cat(makeIsobmff('avif', [['c2pa', JUMBF]]), new Uint8Array([0x00, 0x01, 0x02])),
  // Upstream #264. The merkle and no-marker payloads are what the old substring
  // scan missed entirely in keep mode; bad_offset is what it wrongly matched,
  // and it has to survive a keep-mode clean.
  avif_c2pa_prov_uuid: makeIsobmff('avif', [['uuid', c2paProv()]]),
  avif_c2pa_prov_no_marker: makeIsobmff('avif', [['uuid', c2paProv('manifest', counting(63))]]),
  avif_c2pa_prov_merkle: makeIsobmff('avif', [['uuid', c2paProv('merkle', counting(127))]]),
  avif_c2pa_prov_offset4: makeIsobmff('avif', [
    ['uuid', c2paProv('manifest', bytes('data'), { fullbox: true })],
  ]),
  avif_uuid_c2pa_bytes_bad_offset: makeIsobmff('avif', [
    ['uuid', cat(zeros(1), C2PA_BMFF_UUID, bytes('not-a-manifest'))],
  ]),
  avif_meta_c2pa_prov_uuid: makeIsobmff('avif', [
    ['meta', isoMeta([HDLR, ['uuid', c2paProv('manifest', counting(47))]])],
  ]),
  // The box walk stops at the overrunning mdat, so the manifest sits in the
  // unparsed tail and only the whole-file fallback can see it.
  avif_prov_uuid_in_tail: cat(
    isoBox('ftyp', cat(bytes('avif'), zeros(4), bytes('avif'), bytes('mif1'))),
    new Uint8Array([0x00, 0x00, 0xff, 0xff]),
    bytes('mdat'),
    bytes('uuid'),
    C2PA_BMFF_UUID,
    counting(31)
  ),
  png_truncated_tail: makeTruncatedPng([['tEXt', 'Software\x00ChatGPT']], new Uint8Array([1, 2, 3, 4, 5, 6])),
  gif_clean: makeGif([]),
  gif_comment_ai: makeGif([[0xfe, 'Generated by OpenAI']]),
  gif_comment_plain: makeGif([[0xfe, 'just a caption']]),
  gif_xmp: makeGif([[0xff, 'XMP DataXMP' + XMP_AI]]),
  gif_netscape_loop: makeGif([[0xff, cat(bytes('NETSCAPE2.0'), new Uint8Array([0x03, 0x01, 0x00, 0x00]))]]),
  gif_unknown_app: makeGif([[0xff, 'WHATEVER1.0payload']]),
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
  // Upstream watermarks-remover#133: late-assigned carriers, noncharacters,
  // reserved default-ignorables and visible-layout Cf controls. Each layout case
  // pairs the control next to its own script (kept) with the same control adrift
  // in Latin text (stripped), so one case exercises both branches.
  'mongolian fvs4 \u{1820}\u{180F} ok, stray \u{180F}',
  'hangul filler \u{3131}\u{3164} ok, stray \u{3164}; halfwidth \u{FFA1}\u{FFA0} ok, stray \u{FFA0}',
  'noncharacters \u{FDD0} \u{FFFE} \u{1FFFF} end',
  'reserved ignorable \u{2065} \u{FFF0} \u{E0000} \u{E0080} \u{E01F0} end',
  'egyptian \u{13000}\u{13430}\u{13001} vs floating \u{13430} here',
  'duployan \u{1BC00}\u{1BCA0}\u{1BC01} vs floating \u{1BCA0} here',
  'musical \u{1D100}\u{1D173}\u{1D101} vs floating \u{1D173} here',
  // Upstream watermarks-remover#200: Emoji=Yes singletons outside the block
  // ranges. A VS16 after one of them is presentation, not a carrier, so it is
  // kept; the same selector adrift after a plain letter is still stripped.
  'singletons \u{203C}\u{FE0F} \u{2049}\u{FE0F} \u{2139}\u{FE0F} \u{2934}\u{FE0F} \u{2935}\u{FE0F}, ' +
    'zwj \u{2139}\u{FE0F}\u{200D}\u{1F4A1}, stray a\u{FE0F} here',
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

// ------------------------------------------------------------ audio and video
/* Mirrors the AV fixtures in ivanusto/unmark-web (tests/test_av_meta_parity.py),
 * so tests/golden/avMeta.json pins this port against the same cases upstream's
 * Python is checked on. The ISOBMFF helpers above are reused unchanged. */

const syncsafe = (n: number): Uint8Array =>
  new Uint8Array([(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f]);

const makeMp4 = (
  boxes: Array<[string, Blob]>,
  { brand = 'isomiso2avc1mp41', mdat = 512 }: { brand?: string; mdat?: number } = {}
): Uint8Array =>
  cat(
    isoBox('ftyp', cat(bytes(brand.slice(0, 4)), new Uint8Array([0x00, 0x00, 0x02, 0x00]), bytes(brand))),
    ...boxes.map(([f, p]) => isoBox(f, p)),
    isoBox('mdat', zeros(mdat))
  );

const moov = (...sub: Uint8Array[]): [string, Uint8Array] => [
  'moov',
  cat(isoBox('mvhd', zeros(100)), ...sub),
];

const udta = (text: string): Uint8Array => isoBox('udta', cat(zeros(4), bytes('tool'), bytes(text)));

/** A well-formed ID3v2.3/2.4 tag. v2.2 needs makeId3v22 instead. */
function id3v2(
  frames: Array<[string, Blob]>,
  { major = 4, ext = false, footer = false, padding = 0 }:
    { major?: number; ext?: boolean; footer?: boolean; padding?: number } = {}
): Uint8Array {
  const parts: Uint8Array[] = [];
  // v2.4 counts the extended header's own size field; v2.3 does not.
  if (ext) parts.push(major === 4 ? cat(syncsafe(6), new Uint8Array([0x01, 0x00])) : cat(be32(6), zeros(6)));
  for (const [frameId, payload] of frames) {
    const p = buf(payload);
    parts.push(bytes(frameId), major === 4 ? syncsafe(p.length) : be32(p.length), zeros(2), p);
  }
  parts.push(zeros(padding));
  const body = cat(...parts);
  const flags = (ext ? 0x40 : 0) | (footer && major === 4 ? 0x10 : 0);
  const header = cat(bytes('ID3'), new Uint8Array([major, 0, flags]), syncsafe(body.length));
  const tag = cat(header, body);
  return footer && major === 4 ? cat(tag, bytes('3DI'), header.subarray(3, 10)) : tag;
}

/** A v2.2 tag: detected, never decomposed into frames. */
const makeId3v22 = (payload: Blob): Uint8Array => {
  const p = buf(payload);
  const body = cat(bytes('TT2'), new Uint8Array([0, 0, p.length]), p);
  return cat(bytes('ID3'), new Uint8Array([2, 0, 0]), syncsafe(body.length), body);
};

/**
 * A tag header claiming far more tag than the bytes that follow it.
 *
 * watermarks-remover#201: the frame boundaries of such a tag are unknowable, so
 * it is reported as truncated and dropped up to the first audio frame, rather
 * than silently yielding nothing.
 */
const truncatedId3v2 = (
  frames: Uint8Array,
  { major = 4, declared = 10_000 }: { major?: number; declared?: number } = {}
): Uint8Array => cat(bytes('ID3'), new Uint8Array([major, 0, 0]), syncsafe(declared), frames);

const id3v2Frame = (frameId: string, payload: Blob, major = 4): Uint8Array => {
  const p = buf(payload);
  return cat(bytes(frameId), major === 4 ? syncsafe(p.length) : be32(p.length), zeros(2), p);
};

const MPEG_FRAME = cat(new Uint8Array([0xff, 0xfb, 0x90, 0x00]), zeros(100));
const FLAC_STREAM = cat(bytes('fLaC'), new Uint8Array([0x80, 0x00, 0x00, 0x22]), zeros(34));

const geob = (
  mime: string,
  { encoding = 0, filename = bytes('c2pa'), description = bytes('manifest'),
    data = new Uint8Array([1, 2, 3]) }:
    { encoding?: number; filename?: Uint8Array; description?: Uint8Array; data?: Uint8Array } = {}
): Uint8Array =>
  cat(new Uint8Array([encoding]), bytes(mime), zeros(1), filename, zeros(1), description, zeros(1), data);

/* riffChunk above is the same word-aligned chunk this needs; WebP and WAV are
 * both RIFF. */

function makeWav(chunks: Array<[string, Blob]>): Uint8Array {
  const fmt = cat(le16(1), le16(1), le32(8000), le32(8000), le16(1), le16(8));
  const body = cat(
    riffChunk('fmt ', fmt),
    ...chunks.map(([cid, p]) => riffChunk(cid, p)),
    riffChunk('data', zeros(64))
  );
  return cat(bytes('RIFF'), le32(4 + body.length), bytes('WAVE'), body);
}

const AI_TEXT = cat(zeros(1), bytes('Generated by OpenAI Sora'));
const BENIGN_TEXT = cat(zeros(1), bytes('Recorded on a phone in Taipei'));

export const AV_SAMPLES: Record<string, Uint8Array> = {
  // ---- MP4 / MOV
  mp4_clean: makeMp4([moov()]),
  mp4_udta_ai: makeMp4([moov(udta('Generated by OpenAI Sora'))]),
  mp4_udta_benign: makeMp4([moov(udta('Recorded on a phone in Taipei'))]),
  mp4_xmp: makeMp4([moov(), ['uuid', cat(XMP_UUID, bytes(XMP_AI))]]),
  mp4_c2pa: makeMp4([moov(), ['jumb', JUMBF]]),
  mp4_uuid_plain: makeMp4([moov(), ['uuid', cat(new Uint8Array(16).fill(0x11), bytes('harmless camera note'))]]),
  mp4_meta: makeMp4([moov(), ['meta', cat(zeros(4), isoBox('iinf', 'Generated by OpenAI'))]]),
  mp4_udta_and_xmp: makeMp4([moov(udta('Generated by OpenAI Sora')), ['uuid', cat(XMP_UUID, bytes(XMP_AI))]]),
  mov_quicktime: makeMp4([moov(udta('Generated by OpenAI Sora'))], { brand: 'qt  qt  ' }),
  m4a_audio: makeMp4([moov(udta('SynthID'))], { brand: 'M4A M4A mp42' }),
  // Upstream #264, the same cases in a container the slice driver walks.
  mp4_c2pa_prov: makeMp4([moov(), ['uuid', c2paProv()]]),
  mp4_c2pa_prov_no_marker: makeMp4([moov(), ['uuid', c2paProv('manifest', counting(63))]]),
  mp4_c2pa_prov_merkle: makeMp4([moov(), ['uuid', c2paProv('merkle', counting(127))]]),
  mp4_c2pa_prov_fullbox: makeMp4([
    moov(),
    ['uuid', c2paProv('manifest', bytes('data'), { fullbox: true })],
  ]),
  mp4_c2pa_prov_update_last: cat(
    makeMp4([moov()]),
    isoBox('uuid', cat(C2PA_BMFF_UUID, bytes('update'), zeros(1), counting(31)))
  ),
  mp4_uuid_c2pa_bytes_bad_offset: makeMp4([
    moov(),
    ['uuid', cat(zeros(1), C2PA_BMFF_UUID, bytes('not-a-manifest'))],
  ]),
  // ---- WAV
  wav_clean: makeWav([]),
  wav_c2pa: makeWav([['C2PA', JUMBF]]),
  wav_info_ai: makeWav([['LIST', cat(bytes('INFO'), riffChunk('ISFT', cat(bytes('Generated by OpenAI'), zeros(1))))]]),
  wav_info_benign: makeWav([['LIST', cat(bytes('INFO'), riffChunk('ISFT', cat(bytes('Audacity 3.4'), zeros(1))))]]),
  wav_list_not_info: makeWav([['LIST', cat(bytes('adtl'), riffChunk('note', cat(bytes('Generated by OpenAI'), zeros(1))))]]),
  wav_id3_ai: makeWav([['id3 ', id3v2([['TSSE', AI_TEXT]])]]),
  wav_id3_benign: makeWav([['id3 ', id3v2([['TSSE', BENIGN_TEXT]])]]),
  // The chunk is intact; the ID3v2 tag inside it is not. inspectId3v2 is shared,
  // so the truncation report reaches the WAV findings too.
  wav_id3_truncated: makeWav([['id3 ', truncatedId3v2(id3v2Frame('TSSE', AI_TEXT))]]),
  wav_odd_chunk: makeWav([
    ['LIST', cat(bytes('INFO'), riffChunk('ISFT', cat(bytes('Generated by OpenAI'), zeros(1))))],
    ['note', 'odd'],
  ]),
  // A chunk whose declared size overruns: the remainder is copied verbatim.
  wav_overrun: cat(makeWav([]), bytes('junk'), le32(0xffff), bytes('tail')),
  // ---- MP3
  mp3_no_tag: cat(MPEG_FRAME, MPEG_FRAME, MPEG_FRAME),
  mp3_clean_v24: cat(id3v2([['TIT2', cat(zeros(1), bytes('A song'))]]), MPEG_FRAME),
  mp3_ai_v24: cat(id3v2([['TIT2', cat(zeros(1), bytes('A song'))], ['TSSE', AI_TEXT]]), MPEG_FRAME),
  mp3_ai_v23: cat(id3v2([['TIT2', cat(zeros(1), bytes('A song'))], ['TSSE', AI_TEXT]], { major: 3 }), MPEG_FRAME),
  mp3_ai_ext_v24: cat(id3v2([['TSSE', AI_TEXT]], { ext: true }), MPEG_FRAME),
  mp3_ai_ext_v23: cat(id3v2([['TSSE', AI_TEXT]], { major: 3, ext: true }), MPEG_FRAME),
  mp3_ai_footer_v24: cat(id3v2([['TSSE', AI_TEXT]], { footer: true }), MPEG_FRAME),
  mp3_padding: cat(id3v2([['TSSE', AI_TEXT]], { padding: 32 }), MPEG_FRAME),
  mp3_v22_ai: cat(makeId3v22(cat(zeros(1), bytes('Generated by OpenAI'))), MPEG_FRAME),
  mp3_v22_benign: cat(makeId3v22(cat(zeros(1), bytes('A song'))), MPEG_FRAME),
  mp3_geob_c2pa: cat(id3v2([['GEOB', geob('application/c2pa')]]), MPEG_FRAME),
  // ---- MP3 with a truncated ID3v2 tag (watermarks-remover#201)
  mp3_truncated_ai: cat(truncatedId3v2(id3v2Frame('TSSE', AI_TEXT)), MPEG_FRAME, MPEG_FRAME),
  mp3_truncated_benign: cat(
    truncatedId3v2(id3v2Frame('TIT2', cat(zeros(1), bytes('A song')))),
    MPEG_FRAME,
    MPEG_FRAME
  ),
  mp3_truncated_v23: cat(truncatedId3v2(id3v2Frame('TSSE', AI_TEXT, 3), { major: 3 }), MPEG_FRAME),
  // Nothing that looks like an audio frame follows, so the file is preserved
  // whole rather than emptied in the name of cleaning it.
  mp3_truncated_no_audio: truncatedId3v2(id3v2Frame('TSSE', AI_TEXT)),
  // A sync word whose bitrate index is the "bad" 1111: not a frame header, and
  // the scan has to keep looking past it.
  mp3_truncated_fake_sync: cat(
    truncatedId3v2(id3v2Frame('TSSE', AI_TEXT)),
    new Uint8Array([0xff, 0xfb, 0xf0, 0x00]),
    MPEG_FRAME
  ),
  // ---- FLAC
  flac_plain: FLAC_STREAM,
  flac_geob_c2pa: cat(id3v2([['GEOB', geob('application/c2pa')]]), FLAC_STREAM),
  flac_geob_other: cat(id3v2([['GEOB', geob('image/jpeg')]]), FLAC_STREAM),
  flac_geob_and_text: cat(
    id3v2([['TIT2', cat(zeros(1), bytes('A song'))], ['GEOB', geob('application/c2pa')]]),
    FLAC_STREAM
  ),
  flac_geob_utf16: cat(
    id3v2([['GEOB', geob('application/c2pa', {
      encoding: 1,
      filename: cat(bytes('c'), zeros(3)),
      description: cat(bytes('m'), zeros(3)),
    })]]),
    FLAC_STREAM
  ),
  flac_geob_only_ext: cat(id3v2([['GEOB', geob('application/c2pa')]], { ext: true }), FLAC_STREAM),
  // ---- not audio or video at all
  not_av: cat(PNG_SIG, zeros(64)),
};
