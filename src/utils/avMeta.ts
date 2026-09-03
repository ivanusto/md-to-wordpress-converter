/*
 * Detect and strip C2PA / AI-related metadata from audio and video containers:
 * MP4/MOV/M4A/M4V (ISOBMFF), WAV (RIFF), MP3 (ID3v2) and FLAC (C2PA's
 * standardized ID3v2 GEOB carrier).
 *
 * TypeScript port of `js/av_meta.js` in ivanusto/unmark-web, which is itself a
 * port of `service/scripts/av_meta.py` from guillaumemeyer/watermarks-remover
 * (MIT). Same box/chunk/frame policy, same marker heuristics. Samples and
 * waveforms are never touched, and a box/chunk/frame is either kept
 * byte-identical or dropped whole, so a container can never come out
 * semantically mangled.
 *
 * Two drivers sit on the same primitives:
 *
 *   inspectAv(u8) / cleanAv(u8, opts)          whole buffer, what the golden
 *                                              tests pin against unmark-web
 *   inspectAvFile(file) / cleanAvFile(file)    reads box and chunk headers
 *                                              through File.slice() and returns
 *                                              a Blob of File slices
 *
 * The second exists because video is not image-sized. Metadata is a few hundred
 * bytes at known offsets and an ISOBMFF drop is an equal-size `free` box, so a
 * clean is the original file with a few ranges overwritten: there is no reason
 * to hold a gigabyte in a tab to produce it. tests/avMeta.test.ts asserts the
 * two drivers agree on every fixture, and that both agree with unmark-web.
 *
 * A truncated MP4 keeps its media. Upstream's `_strip_moov_udta` used to
 * rebuild the file from the boxes that parsed and drop everything after them,
 * so a truncated upload lost its media while the action list said the tail was
 * kept. Reported as guillaumemeyer/watermarks-remover#240 and fixed upstream by
 * #242, which also added the `inspectionIncomplete` report carried through the
 * strip results below: a file that could not be read to the end is reported as
 * unverified rather than clean.
 */
import {
  AI_META_HINTS,
  C2PA_MARKERS,
  buildIsobmffBox,
  containsAny,
  containsC2paProvBox,
  inspectIsobmff,
  isobmffFreeBox,
  parseIsobmffBoxes,
  stripIsobmff,
} from './imageMeta';

export type AvFormat = 'mp4' | 'wav' | 'mp3' | 'flac' | 'unknown';

export interface AvInspectResult {
  format: AvFormat;
  hasC2pa: boolean;
  hasAiMetadata: boolean;
  findings: string[];
  notes: string[];
}

export interface AvCleanResult {
  format: AvFormat;
  data: Uint8Array;
  actions: string[];
  /** The file ended mid-box: the tail was preserved but never inspected. */
  inspectionIncomplete: boolean;
}

export interface AvCleanFileResult {
  format: AvFormat;
  blob: Blob;
  actions: string[];
  inspectionIncomplete: boolean;
}

interface Layer {
  hasC2pa: boolean;
  hasAiMetadata: boolean;
  findings: string[];
}

const latin1 = (u8: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return s;
};

const be32 = (u8: Uint8Array, p: number): number =>
  ((u8[p] << 24) | (u8[p + 1] << 16) | (u8[p + 2] << 8) | u8[p + 3]) >>> 0;

const le32 = (u8: Uint8Array, p: number): number =>
  (u8[p] | (u8[p + 1] << 8) | (u8[p + 2] << 16) | (u8[p + 3] << 24)) >>> 0;

function concat(parts: Uint8Array[]): Uint8Array {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

const EMPTY = new Uint8Array(0);

export const AV_EXTS = ['mp4', 'mov', 'm4a', 'm4v', 'wav', 'mp3', 'flac'];

export const SUPPORTED_AV_EXTENSIONS = AV_EXTS.map((e) => `.${e}`);

const C2PA_STRONG = new Set(['c2pa', 'contentcredentials', 'jumb', 'contentauth']);
const classifyC2pa = (hits: string[]): boolean =>
  hits.some((h) => C2PA_STRONG.has(h.toLowerCase()));
const hints = (u8: Uint8Array): string[] => containsAny(u8, AI_META_HINTS);

/** Sniff MP4/MOV/M4A/M4V (ISOBMFF), WAV, MP3 or FLAC from magic bytes. */
export function detectAvFormat(u8: Uint8Array): AvFormat {
  if (u8.length >= 12 && latin1(u8.subarray(4, 8)) === 'ftyp') return 'mp4';
  if (u8.length >= 12 && latin1(u8.subarray(0, 4)) === 'RIFF' && latin1(u8.subarray(8, 12)) === 'WAVE')
    return 'wav';
  if (latin1(u8.subarray(0, 4)) === 'fLaC') return 'flac';
  if (u8.length >= 10 && latin1(u8.subarray(0, 3)) === 'ID3') {
    const parsed = parseId3v2Frames(u8);
    if (parsed !== null && latin1(u8.subarray(parsed.total, parsed.total + 4)) === 'fLaC') return 'flac';
    return 'mp3';
  }
  if (u8.length >= 2 && u8[0] === 0xff && (u8[1] & 0xe0) === 0xe0) return 'mp3'; // MPEG sync, no ID3v2
  return 'unknown';
}

// ------------------------------------------------------------ MP4 / MOV / M4A
/* Top-level C2PA (jumb/c2pa) and XMP (uuid) detection and stripping reuse
 * inspectIsobmff/stripIsobmff from imageMeta.ts unchanged: that is the mechanism
 * the C2PA spec defines for the ISOBMFF family, already proven for AVIF and
 * HEIC. moov/udta, where QuickTime user-data generator tags live, is
 * MP4-specific and handled here. */

function inspectMoovUdta(u8: Uint8Array): Layer {
  const findings: string[] = [];
  let hasC2pa = false;
  let hasAiMetadata = false;
  for (const { fourcc, payload } of parseIsobmffBoxes(u8).boxes) {
    if (fourcc !== 'moov') continue;
    for (const sub of parseIsobmffBoxes(payload).boxes) {
      if (sub.fourcc !== 'udta') continue;
      const hits = hints(sub.payload);
      if (hits.length) {
        hasAiMetadata = true;
        if (classifyC2pa(hits)) hasC2pa = true;
        findings.push(`MP4 moov/udta box: ${hits.slice(0, 8).join(', ')}`);
      }
    }
  }
  return { hasC2pa, hasAiMetadata, findings };
}

function stripMoovUdta(
  u8: Uint8Array,
  { stripAllMetadata = true }: { stripAllMetadata?: boolean } = {}
): { data: Uint8Array; actions: string[]; inspectionIncomplete: boolean } {
  const actions: string[] = [];
  const out: Uint8Array[] = [];
  const { boxes, scannedEnd } = parseIsobmffBoxes(u8);
  for (const { fourcc, payload, headerSize } of boxes) {
    if (fourcc !== 'moov') {
      out.push(buildIsobmffBox(fourcc, payload, headerSize));
      continue;
    }
    const newMoov: Uint8Array[] = [];
    for (const sub of parseIsobmffBoxes(payload).boxes) {
      if (sub.fourcc === 'udta' && (stripAllMetadata || hints(sub.payload).length)) {
        actions.push('drop moov/udta box (generator/user-data tags)');
        newMoov.push(isobmffFreeBox(sub.size, sub.headerSize));
        continue;
      }
      newMoov.push(buildIsobmffBox(sub.fourcc, sub.payload, sub.headerSize));
    }
    out.push(buildIsobmffBox('moov', concat(newMoov), headerSize));
  }
  /* Everything past the last box that parsed is the media itself on a truncated
   * upload, and the earlier stripIsobmff pass had already preserved it. */
  if (scannedEnd < u8.length) out.push(u8.subarray(scannedEnd));
  /* A tail too short to hold a box header is not worth reporting, which is the
   * threshold upstream picked for inspection_incomplete. */
  return { data: concat(out), actions, inspectionIncomplete: u8.length - scannedEnd >= 8 };
}

export function inspectMp4(u8: Uint8Array, { byteScan = true }: { byteScan?: boolean } = {}): Layer {
  const iso = inspectIsobmff(u8, 'mp4', { byteScan });
  const udta = inspectMoovUdta(u8);
  return {
    hasC2pa: iso.hasC2pa || udta.hasC2pa,
    hasAiMetadata: iso.hasAiMetadata || udta.hasAiMetadata,
    findings: iso.findings.concat(udta.findings),
  };
}

const NO_MP4_ACTION = 'no MP4 metadata boxes removed (already clean or none matched)';

export function stripMp4(
  u8: Uint8Array,
  { stripAllMetadata = true }: { stripAllMetadata?: boolean } = {}
): { data: Uint8Array; actions: string[]; inspectionIncomplete: boolean } {
  const iso = stripIsobmff(u8, 'mp4', { stripAllMetadata });
  const udta = stripMoovUdta(iso.data, { stripAllMetadata });
  const actions = iso.actions
    .filter((a) => !a.startsWith('no MP4 metadata'))
    .concat(udta.actions);
  return {
    data: udta.data,
    actions: actions.length ? actions : [NO_MP4_ACTION],
    inspectionIncomplete: udta.inspectionIncomplete,
  };
}

// ---------------------------------------------------------------------- ID3v2
/* Shared by MP3 files and WAV's optional `id3 ` chunk. */

interface Id3Frame {
  id: Uint8Array;
  payload: Uint8Array;
}

interface Id3Tag {
  total: number;
  major: number;
  frames: Id3Frame[];
}

export interface Id3Region {
  /** null means the file is left exactly as it was. */
  replacement: Uint8Array | null;
  total: number;
  actions: string[];
}

const id3v2Size = (u8: Uint8Array, off: number): number =>
  ((u8[off] & 0x7f) << 21) | ((u8[off + 1] & 0x7f) << 14) | ((u8[off + 2] & 0x7f) << 7) | (u8[off + 3] & 0x7f);

const id3v2SizeBytes = (n: number): Uint8Array =>
  new Uint8Array([(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f]);

function id3v2FramesStart(u8: Uint8Array, total: number, major: number): number | null {
  let pos = 10;
  if (!(u8[5] & 0x40)) return pos;
  if (pos + 4 > total) return null;
  const extSize = major === 4 ? id3v2Size(u8, pos) : be32(u8, pos) + 4;
  pos += extSize;
  return pos <= total ? pos : null;
}

/* The tag header on its own: version and declared length, before anything is
 * parsed. A tag whose declared length runs past the bytes that are there is
 * truncated, which watermarks-remover#201 reports and works around rather than
 * silently finding nothing. The footer is deliberately left out of `total`, as
 * the reference's check is, so a tag missing only its footer still goes down
 * the ordinary parse path and fails there. */
function id3v2Declared(head: Uint8Array): { major: number; total: number } | null {
  if (head.length < 10 || latin1(head.subarray(0, 3)) !== 'ID3') return null;
  return { major: head[3], total: 10 + id3v2Size(head, 6) };
}

const isTruncatedId3v2 = (declared: { total: number } | null, size: number): boolean =>
  declared !== null && declared.total > size;

/** The inspect half of the truncated case, shared by both drivers. */
function truncatedId3v2Report(
  { major, total }: { major: number; total: number },
  present: number,
  hits: string[]
): Layer {
  const findings = [
    // The em dash is the reference's: the finding string is what the golden
    // file pins, so the punctuation this project drops from its own copy stays
    // here.
    `truncated ID3v2.${major} tag detected (${present} bytes present, ${total} declared) ` +
      '— metadata may be incomplete',
  ];
  if (hits.length) findings.push(`partial ID3v2.${major} tag markers: ${hits.slice(0, 8).join(', ')}`);
  return { hasC2pa: classifyC2pa(hits), hasAiMetadata: hits.length > 0, findings };
}

/* An MPEG audio frame header: sync word, then version, layer, bitrate, sample
 * rate and emphasis fields that all have reserved values. Checking them is what
 * separates the start of the audio from two bytes that merely look like a sync
 * word, which is the whole point of the scan below. */
function isValidMp3FrameHeader(u8: Uint8Array, offset: number): boolean {
  if (offset + 4 > u8.length) return false;
  const b1 = u8[offset + 1];
  const b2 = u8[offset + 2];
  if (u8[offset] !== 0xff || (b1 & 0xe0) !== 0xe0) return false;
  if (((b1 >> 3) & 0x03) === 1 || ((b1 >> 1) & 0x03) === 0) return false; // version 01, layer 00
  const bitrate = (b2 >> 4) & 0x0f;
  if (bitrate === 0x00 || bitrate === 0x0f) return false; // free, bad
  if (((b2 >> 2) & 0x03) === 0x03) return false; // sample rate 11
  return (u8[offset + 3] & 0x03) !== 0x02; // emphasis 10
}

/** First offset at or after `start` that begins an audio frame, or -1. */
function findMp3FrameHeader(u8: Uint8Array, start: number): number {
  for (let i = start; i + 4 <= u8.length; i++) if (isValidMp3FrameHeader(u8, i)) return i;
  return -1;
}

/**
 * Parse an ID3v2 tag at the start of u8 -> {total, major, frames} or null.
 * frames is empty for v2.2 (3-byte frame IDs), which is detected but never
 * decomposed: callers fall back to byte-scanning and dropping the whole tag,
 * which is always safe.
 */
export function parseId3v2Frames(u8: Uint8Array): Id3Tag | null {
  if (u8.length < 10 || latin1(u8.subarray(0, 3)) !== 'ID3') return null;
  const major = u8[3];
  const framesEnd = 10 + id3v2Size(u8, 6);
  const footerSize = major === 4 && u8[5] & 0x10 ? 10 : 0;
  const total = framesEnd + footerSize;
  if (total > u8.length) return null;
  if (footerSize) {
    const footer = u8.subarray(framesEnd, total);
    if (latin1(footer.subarray(0, 3)) !== '3DI') return null;
    for (let i = 0; i < 7; i++) if (footer[3 + i] !== u8[3 + i]) return null;
  }
  if (major < 3) return { total, major, frames: [] };

  const frames: Id3Frame[] = [];
  const framesStart = id3v2FramesStart(u8, framesEnd, major);
  if (framesStart === null) return null;
  let pos = framesStart;
  while (pos + 10 <= framesEnd) {
    const id = u8.subarray(pos, pos + 4);
    if (!id[0] && !id[1] && !id[2] && !id[3]) break; // padding
    const frameSize = major === 4 ? id3v2Size(u8, pos + 4) : be32(u8, pos + 4);
    const frameStart = pos + 10;
    const frameEnd = frameStart + frameSize;
    if (frameEnd > framesEnd) return null;
    frames.push({ id, payload: u8.subarray(frameStart, frameEnd) });
    pos = frameEnd;
  }
  for (let i = pos; i < framesEnd; i++) if (u8[i] !== 0) return null; // padding must be zero
  return { total, major, frames };
}

export function inspectId3v2(u8: Uint8Array): Layer {
  const declared = id3v2Declared(u8);
  if (isTruncatedId3v2(declared, u8.length)) {
    return truncatedId3v2Report(declared!, u8.length, hints(u8));
  }
  const parsed = parseId3v2Frames(u8);
  if (parsed === null) return { hasC2pa: false, hasAiMetadata: false, findings: [] };
  const { total, major, frames } = parsed;
  const findings: string[] = [];
  let hasAiMetadata = false;
  let hasC2pa = false;

  if (!frames.length) {
    const hits = hints(u8.subarray(0, total));
    if (hits.length) {
      hasAiMetadata = true;
      hasC2pa = classifyC2pa(hits);
      findings.push(`ID3v2.${major} tag: ${hits.slice(0, 8).join(', ')}`);
    }
    return { hasC2pa, hasAiMetadata, findings };
  }

  for (const { id, payload } of frames) {
    const hits = hints(payload);
    if (hits.length) {
      hasAiMetadata = true;
      if (classifyC2pa(hits)) hasC2pa = true;
      findings.push(`ID3v2 frame ${latin1(id)}: ${hits.slice(0, 8).join(', ')}`);
    }
  }
  return { hasC2pa, hasAiMetadata, findings };
}

/**
 * The tag rewrite both drivers share: the first `total` bytes of the input
 * become `replacement`, and everything after it is untouched.
 */
export function stripId3v2Region(
  u8: Uint8Array,
  { stripAllMetadata = true }: { stripAllMetadata?: boolean } = {}
): Id3Region {
  const unchanged = (actions: string[]): Id3Region => ({ replacement: null, total: 0, actions });
  const declared = id3v2Declared(u8);
  if (isTruncatedId3v2(declared, u8.length)) {
    /* The tag's frame boundaries are unknowable, so watermarks-remover#201
     * drops everything up to the first audio frame instead. A file with no
     * frame to find is left exactly as it was rather than emptied. Keep mode
     * makes no difference: a tag that cannot be read cannot be filtered. */
    const audio = findMp3FrameHeader(u8, 10);
    if (audio === -1) {
      return unchanged([
        `cannot locate valid audio frame in truncated ID3v2.${declared!.major} tag; preserving file`,
      ]);
    }
    return {
      replacement: EMPTY,
      total: audio,
      actions: [`drop truncated ID3v2.${declared!.major} tag (found audio frame at offset ${audio})`],
    };
  }
  const parsed = parseId3v2Frames(u8);
  if (parsed === null) return unchanged([]);
  const { total, major, frames } = parsed;
  const dropped = [`drop ID3v2.${major} tag (${total} bytes)`];

  if (!frames.length) {
    // v2.2, or an empty v2.3/v2.4 tag: frame boundaries were never decoded, so a
    // whole-tag drop is the only safe edit.
    if (!stripAllMetadata && !hints(u8.subarray(0, total)).length) {
      return unchanged(['no ID3v2 tag removed (no AI/C2PA markers found)']);
    }
    return { replacement: EMPTY, total, actions: dropped };
  }
  if (stripAllMetadata) return { replacement: EMPTY, total, actions: dropped };

  const kept: Uint8Array[] = [];
  const actions: string[] = [];
  for (const { id, payload } of frames) {
    const hits = hints(payload);
    if (hits.length) {
      actions.push(`drop ID3v2 frame ${latin1(id)}: ${hits.slice(0, 8).join(', ')}`);
      continue;
    }
    const sizeBytes =
      major === 4
        ? id3v2SizeBytes(payload.length)
        : new Uint8Array([
            (payload.length >>> 24) & 0xff,
            (payload.length >>> 16) & 0xff,
            (payload.length >>> 8) & 0xff,
            payload.length & 0xff,
          ]);
    kept.push(id, sizeBytes, new Uint8Array([0, 0]), payload);
  }
  if (!actions.length) return unchanged(['no ID3v2 frames removed (already clean or none matched)']);

  const body = concat(kept);
  const header = concat([new Uint8Array([0x49, 0x44, 0x33, major, 0, 0]), id3v2SizeBytes(body.length)]);
  return { replacement: concat([header, body]), total, actions };
}

// ----------------------------------------------------------------------- FLAC
/* Only C2PA's standardized ID3v2 GEOB carrier. Native FLAC metadata blocks are
 * ordinary tags and are left alone, matching upstream. */

function geobTextEnd(payload: Uint8Array, start: number, encoding: number): number | null {
  const step = encoding === 0 || encoding === 3 ? 1 : 2;
  for (let pos = start; pos <= payload.length - step; pos += step) {
    let terminated = true;
    for (let k = 0; k < step; k++)
      if (payload[pos + k] !== 0) {
        terminated = false;
        break;
      }
    if (terminated) return pos + step;
  }
  return null;
}

function isC2paGeob(id: Uint8Array, payload: Uint8Array): boolean {
  if (latin1(id) !== 'GEOB' || !payload.length || payload[0] > 3) return false;
  let mimeEnd = -1;
  for (let i = 1; i < payload.length; i++)
    if (payload[i] === 0) {
      mimeEnd = i;
      break;
    }
  if (mimeEnd < 0) return false;
  if (latin1(payload.subarray(1, mimeEnd)).toLowerCase() !== 'application/c2pa') return false;
  const filenameEnd = geobTextEnd(payload, mimeEnd + 1, payload[0]);
  if (filenameEnd === null) return false;
  const descriptionEnd = geobTextEnd(payload, filenameEnd, payload[0]);
  return descriptionEnd !== null && descriptionEnd < payload.length;
}

export function inspectFlac(u8: Uint8Array): Layer {
  const parsed = parseId3v2Frames(u8);
  if (parsed === null) return { hasC2pa: false, hasAiMetadata: false, findings: [] };
  if (parsed.frames.some(({ id, payload }) => isC2paGeob(id, payload))) {
    return {
      hasC2pa: true,
      hasAiMetadata: true,
      findings: ['C2PA-related manifest in ID3v2 frame GEOB: application/c2pa'],
    };
  }
  return { hasC2pa: false, hasAiMetadata: false, findings: [] };
}

export function stripFlacRegion(
  u8: Uint8Array,
  { stripAllMetadata = true }: { stripAllMetadata?: boolean } = {}
): Id3Region {
  const unchanged = (actions: string[]): Id3Region => ({ replacement: null, total: 0, actions });
  const parsed = parseId3v2Frames(u8);
  if (parsed === null)
    return unchanged(['no FLAC ID3v2 metadata removed (already clean or none matched)']);
  const { total, major, frames } = parsed;
  if (stripAllMetadata) {
    return { replacement: EMPTY, total, actions: [`drop FLAC ID3v2.${major} tag (${total} bytes)`] };
  }

  const kept: Uint8Array[] = [];
  const actions: string[] = [];
  const framesStart = id3v2FramesStart(u8, total, major);
  if (framesStart === null)
    return unchanged(['no FLAC C2PA metadata removed (invalid ID3v2 extended header)']);
  let pos = framesStart;
  for (const { id, payload } of frames) {
    const frameEnd = pos + 10 + payload.length;
    if (isC2paGeob(id, payload)) actions.push('drop FLAC ID3v2 frame GEOB: application/c2pa');
    else kept.push(u8.subarray(pos, frameEnd));
    pos = frameEnd;
  }
  if (!actions.length) return unchanged(['no FLAC C2PA metadata removed (already clean or none matched)']);
  const body = concat(kept);
  if (!body.length) return { replacement: EMPTY, total, actions };

  // Clear the extended-header and footer flags: neither survives the rewrite.
  const header = concat([u8.subarray(0, 5), new Uint8Array([u8[5] & ~0x50]), id3v2SizeBytes(body.length)]);
  return { replacement: concat([header, body]), total, actions };
}

// ------------------------------------------------------------------ WAV (RIFF)
/* Chunks are word-aligned, so an odd-sized chunk carries one pad byte that
 * belongs to it and not to the next chunk. */

const WAV_ID3 = new Set(['id3 ', 'ID3 ']);

/** Classify one RIFF chunk. `payload` may be null when only the id matters. */
function wavChunkKind(cid: string, payload: Uint8Array | null): string | null {
  if (cid === 'C2PA') return 'C2PA';
  if (cid === 'LIST' && payload !== null && latin1(payload.subarray(0, 4)) === 'INFO') return 'LIST INFO';
  if (WAV_ID3.has(cid)) return 'id3';
  return null;
}

/** Chunks whose payload has to be read before the keep/drop call can be made. */
const wavNeedsPayload = (cid: string): boolean => cid === 'LIST' || WAV_ID3.has(cid);

export function inspectWav(u8: Uint8Array): Layer {
  const findings: string[] = [];
  let hasAiMetadata = false;
  let hasC2pa = false;
  let pos = 12; // past "RIFF" + size + "WAVE"
  while (pos + 8 <= u8.length) {
    const cid = latin1(u8.subarray(pos, pos + 4));
    const csize = le32(u8, pos + 4);
    const cend = pos + 8 + csize;
    if (cend > u8.length) break;
    const payload = u8.subarray(pos + 8, cend);
    const r = inspectWavChunk(cid, payload);
    if (r !== null) {
      if (r.hasAiMetadata) hasAiMetadata = true;
      if (r.hasC2pa) hasC2pa = true;
      findings.push(...r.findings);
    }
    pos = cend + (csize & 1);
  }
  return { hasC2pa, hasAiMetadata, findings };
}

/** The per-chunk half of inspectWav, shared with the slice driver. */
function inspectWavChunk(cid: string, payload: Uint8Array | null): Layer | null {
  const kind = wavChunkKind(cid, payload);
  if (kind === 'C2PA')
    return { hasC2pa: true, hasAiMetadata: false, findings: ['WAV C2PA-related manifest chunk'] };
  if (kind === 'LIST INFO') {
    const hits = hints(payload as Uint8Array);
    if (!hits.length) return null;
    return {
      hasC2pa: classifyC2pa(hits),
      hasAiMetadata: true,
      findings: [`WAV LIST INFO chunk: ${hits.slice(0, 8).join(', ')}`],
    };
  }
  if (kind === 'id3') {
    const sub = inspectId3v2(payload as Uint8Array);
    if (!sub.hasAiMetadata) return null;
    return {
      hasC2pa: sub.hasC2pa,
      hasAiMetadata: true,
      findings: sub.findings.map((f) => `WAV id3 chunk / ${f}`),
    };
  }
  return null;
}

/** The per-chunk half of stripWav: does this chunk go, and under what label. */
function wavChunkDrop(cid: string, payload: Uint8Array | null, stripAllMetadata: boolean): string | null {
  const kind = wavChunkKind(cid, payload);
  if (kind === null) return null;
  if (kind === 'C2PA') return 'drop WAV C2PA chunk';
  if (stripAllMetadata || hints(payload as Uint8Array).length) return `drop WAV ${kind} chunk`;
  return null;
}

export function stripWav(
  u8: Uint8Array,
  { stripAllMetadata = true }: { stripAllMetadata?: boolean } = {}
): { data: Uint8Array; actions: string[] } {
  const actions: string[] = [];
  const kept: Uint8Array[] = [];
  let pos = 12;
  while (pos + 8 <= u8.length) {
    const cid = latin1(u8.subarray(pos, pos + 4));
    const csize = le32(u8, pos + 4);
    const cend = pos + 8 + csize;
    if (cend > u8.length) {
      kept.push(u8.subarray(pos));
      pos = u8.length;
      break;
    }
    const payload = u8.subarray(pos + 8, cend);
    const pad = csize & 1;
    const action = wavChunkDrop(cid, payload, stripAllMetadata);
    if (action !== null) actions.push(action);
    else kept.push(u8.subarray(pos, cend + pad));
    pos = cend + pad;
  }
  const body = concat(kept);
  const head = u8.slice(0, 12);
  const riffSize = head.length + body.length - 8;
  head[4] = riffSize & 0xff;
  head[5] = (riffSize >>> 8) & 0xff;
  head[6] = (riffSize >>> 16) & 0xff;
  head[7] = (riffSize >>> 24) & 0xff;
  if (!actions.length) actions.push('no WAV metadata chunks removed (already clean or none matched)');
  return { data: concat([head, body]), actions };
}

// --------------------------------------------------------- buffer driver (API)

const UNSUPPORTED = 'unsupported format (MP4/MOV/M4A/WAV/MP3/FLAC)';
const UNKNOWN_NOTE = 'format not fully inspected; only MP4/MOV/M4A/WAV/MP3/FLAC are supported';

export function inspectAv(u8: Uint8Array): AvInspectResult {
  const fmt = detectAvFormat(u8);
  const r: Layer =
    fmt === 'mp4'
      ? inspectMp4(u8)
      : fmt === 'wav'
        ? inspectWav(u8)
        : fmt === 'mp3'
          ? inspectId3v2(u8)
          : fmt === 'flac'
            ? inspectFlac(u8)
            : { hasC2pa: false, hasAiMetadata: false, findings: [UNSUPPORTED] };
  /* hasAiMetadata is r.hasAiMetadata and nothing more: upstream reports a WAV
   * whose only marker is a bare C2PA chunk as hasC2pa without hasAiMetadata, and
   * or-ing the two here would quietly diverge on exactly that file. Every other
   * format's inspector already folds C2PA into hasAiMetadata itself. */
  return {
    format: fmt,
    hasC2pa: r.hasC2pa,
    hasAiMetadata: r.hasAiMetadata,
    findings: r.findings,
    notes: fmt === 'unknown' ? [UNKNOWN_NOTE] : [],
  };
}

/**
 * Throws on an unsupported format. inspectionIncomplete means the file ended
 * mid-box, so the tail was preserved but never inspected, and the result cannot
 * be called clean. Only MP4 can set it.
 */
export function cleanAv(
  u8: Uint8Array,
  { stripAllMetadata = true }: { stripAllMetadata?: boolean } = {}
): AvCleanResult {
  const fmt = detectAvFormat(u8);
  if (fmt === 'mp4') return { format: fmt, ...stripMp4(u8, { stripAllMetadata }) };
  if (fmt === 'wav') {
    return { format: fmt, ...stripWav(u8, { stripAllMetadata }), inspectionIncomplete: false };
  }
  if (fmt === 'mp3' || fmt === 'flac') {
    const region =
      fmt === 'mp3'
        ? stripId3v2Region(u8, { stripAllMetadata })
        : stripFlacRegion(u8, { stripAllMetadata });
    const data =
      region.replacement === null ? u8 : concat([region.replacement, u8.subarray(region.total)]);
    return { format: fmt, data, actions: region.actions, inspectionIncomplete: false };
  }
  throw new Error(`unsupported audio/video format for cleaning: ${fmt}`);
}

// ---------------------------------------------------------- slice driver (API)
/* Everything below reads through File.slice() and never holds more than one
 * metadata region at a time. The results are the same as the buffer driver's,
 * which tests/avMeta.test.ts asserts on every fixture. */

const SCAN_CHUNK = 4 << 20;
/* Enough of an ID3v2 tag to learn how long the rest of it is. The tag itself is
 * then read whole, which is bounded by the file: real ones are kilobytes, and
 * cover art pushes a few into megabytes. */
const ID3_HEADER = 10;

const bytesOf = async (file: Blob, start: number, end: number): Promise<Uint8Array> =>
  new Uint8Array(await file.slice(start, Math.min(end, file.size)).arrayBuffer());

/**
 * containsAny over a whole File without holding it: chunks overlap by the
 * longest needle minus one, so a marker straddling a boundary is still found,
 * and hits are merged back into needle order.
 */
export async function containsAnyInFile(
  file: Blob,
  needles: string[],
  chunkSize = SCAN_CHUNK
): Promise<string[]> {
  let longest = 0;
  for (const n of needles) if (n.length > longest) longest = n.length;
  const overlap = Math.max(longest - 1, 0);
  const found = new Set<string>();
  let pos = 0;
  while (pos < file.size && found.size < needles.length) {
    const end = Math.min(pos + chunkSize, file.size);
    const u8 = await bytesOf(file, pos === 0 ? 0 : pos - overlap, end);
    for (const hit of containsAny(u8, needles)) found.add(hit);
    pos = end;
  }
  return needles.filter((n) => found.has(n));
}

/**
 * The chunked counterpart of imageMeta's containsC2paProvBox, for the same
 * reason containsAnyInFile exists: the buffer driver scans the whole file at
 * once, this one has to reach the same answer without holding it. The match
 * window is the `uuid` fourcc plus the 20 bytes after it, so consecutive chunks
 * overlap by one byte less than that.
 */
export async function containsC2paProvBoxInFile(file: Blob, chunkSize = SCAN_CHUNK): Promise<boolean> {
  const overlap = 27;
  let pos = 0;
  while (pos < file.size) {
    const end = Math.min(pos + chunkSize, file.size);
    const u8 = await bytesOf(file, Math.max(0, pos - overlap), end);
    if (containsC2paProvBox(u8)) return true;
    pos = end;
  }
  return false;
}

interface BoxIndexEntry {
  fourcc: string;
  start: number;
  size: number;
}

/** Walk top-level ISOBMFF boxes, reading only headers. */
async function isobmffBoxIndex(file: Blob): Promise<{ boxes: BoxIndexEntry[]; scannedEnd: number }> {
  const boxes: BoxIndexEntry[] = [];
  let pos = 0;
  while (pos + 8 <= file.size) {
    const head = await bytesOf(file, pos, pos + 16);
    if (head.length < 8) break;
    let size = be32(head, 0);
    const fourcc = latin1(head.subarray(4, 8));
    let headerSize = 8;
    if (size === 1) {
      if (head.length < 16) break;
      size = be32(head, 8) * 4294967296 + be32(head, 12);
      headerSize = 16;
    } else if (size === 0) {
      size = file.size - pos;
    }
    if (size < headerSize || pos + size > file.size) break;
    boxes.push({ fourcc, start: pos, size });
    pos += size;
  }
  return { boxes, scannedEnd: pos };
}

/* Media payload: never read, never rewritten. Everything else is small enough to
 * pull in whole, and has to be to decide anything about it. */
const MP4_OPAQUE = new Set(['mdat', 'free', 'skip', 'wide', 'ftyp']);

async function inspectMp4File(file: Blob): Promise<Layer> {
  const { boxes } = await isobmffBoxIndex(file);
  const findings: string[] = [];
  let hasC2pa = false;
  let hasAiMetadata = false;
  if (!boxes.length) {
    const whole = await containsAnyInFile(file, C2PA_MARKERS);
    if (whole.length) {
      hasC2pa = true;
      findings.push(`byte-scan C2PA markers: ${whole.slice(0, 6).join(', ')}`);
    }
    findings.push('not a valid MP4 (no ISOBMFF boxes found)');
    return { hasC2pa, hasAiMetadata: hasAiMetadata || hasC2pa, findings };
  }
  const udtaFindings: string[] = [];
  let udtaC2pa = false;
  let udtaAi = false;
  for (const box of boxes) {
    if (MP4_OPAQUE.has(box.fourcc)) continue;
    const u8 = await bytesOf(file, box.start, box.start + box.size);
    const iso = inspectIsobmff(u8, 'mp4', { byteScan: false });
    if (iso.hasC2pa) hasC2pa = true;
    if (iso.hasAiMetadata) hasAiMetadata = true;
    findings.push(...iso.findings);
    const udta = inspectMoovUdta(u8);
    if (udta.hasC2pa) udtaC2pa = true;
    if (udta.hasAiMetadata) udtaAi = true;
    udtaFindings.push(...udta.findings);
  }
  // The whole-file scan the buffer driver runs at the end of inspectIsobmff,
  // before the moov/udta findings are appended.
  const whole = await containsAnyInFile(file, C2PA_MARKERS);
  if (whole.length && !hasC2pa) {
    hasC2pa = true;
    findings.push(`byte-scan C2PA markers: ${whole.slice(0, 6).join(', ')}`);
  } else if (!whole.length && !hasC2pa && (await containsC2paProvBoxInFile(file))) {
    hasC2pa = true;
    findings.push('byte-scan C2PA BMFF content-provenance user type');
  }
  hasAiMetadata = hasAiMetadata || hasC2pa; // inspectIsobmff folds these together
  findings.push(...udtaFindings);
  return { hasC2pa: hasC2pa || udtaC2pa, hasAiMetadata: hasAiMetadata || udtaAi, findings };
}

interface FileParts {
  parts: BlobPart[];
  actions: string[];
  inspectionIncomplete?: boolean;
}

async function cleanMp4File(
  file: Blob,
  { stripAllMetadata = true }: { stripAllMetadata?: boolean } = {}
): Promise<FileParts> {
  const { boxes, scannedEnd } = await isobmffBoxIndex(file);
  if (!boxes.length) throw new Error('not a valid MP4 (no ISOBMFF boxes)');
  const parts: BlobPart[] = [];
  const isoActions: string[] = [];
  const udtaActions: string[] = [];
  for (const box of boxes) {
    if (MP4_OPAQUE.has(box.fourcc)) {
      parts.push(file.slice(box.start, box.start + box.size));
      continue;
    }
    const u8 = await bytesOf(file, box.start, box.start + box.size);
    const iso = stripIsobmff(u8, 'mp4', { stripAllMetadata });
    isoActions.push(...iso.actions.filter((a) => !a.startsWith('no MP4 metadata')));
    const udta = stripMoovUdta(iso.data, { stripAllMetadata });
    udtaActions.push(...udta.actions);
    parts.push(new Blob([udta.data as BlobPart]));
  }
  const tailActions: string[] = [];
  /* isobmffBoxIndex only yields boxes that parsed whole, so the per-box
   * stripMoovUdta calls above never see truncation. The file-level tail is the
   * one that decides inspectionIncomplete, on the same >= 8 threshold. */
  const inspectionIncomplete = file.size - scannedEnd >= 8;
  if (scannedEnd < file.size) {
    const tail = file.size - scannedEnd;
    parts.push(file.slice(scannedEnd));
    if (tail >= 8) tailActions.push(`kept ${tail} bytes of truncated tail (file truncated)`);
  }
  const actions = [...isoActions, ...tailActions, ...udtaActions];
  return { parts, actions: actions.length ? actions : [NO_MP4_ACTION], inspectionIncomplete };
}

/** Read only as much of an ID3v2 tag as the header says it is. */
async function id3v2Region(file: Blob): Promise<Uint8Array | null> {
  const head = await bytesOf(file, 0, ID3_HEADER);
  if (head.length < ID3_HEADER || latin1(head.subarray(0, 3)) !== 'ID3') return null;
  const footer = head[3] === 4 && head[5] & 0x10 ? 10 : 0;
  const total = ID3_HEADER + id3v2Size(head, 6) + footer;
  if (total > file.size) return null;
  return bytesOf(file, 0, total);
}

async function inspectTagFile(file: Blob, inspectTag: (u8: Uint8Array) => Layer): Promise<Layer> {
  const region = await id3v2Region(file);
  if (region === null) return { hasC2pa: false, hasAiMetadata: false, findings: [] };
  return inspectTag(region);
}

/* MP3 only, and only for the truncated tag id3v2Region() cannot return: the
 * marker scan then covers the whole file, the way the buffer driver's does.
 * FLAC needs no counterpart, because a FLAC whose tag is truncated is detected
 * as an MP3 in the first place: the fLaC magic sits after the tag, at an offset
 * the truncated header no longer locates. */
async function inspectMp3File(file: Blob): Promise<Layer> {
  const declared = id3v2Declared(await bytesOf(file, 0, ID3_HEADER));
  if (!isTruncatedId3v2(declared, file.size)) return inspectTagFile(file, inspectId3v2);
  return truncatedId3v2Report(declared!, file.size, await containsAnyInFile(file, AI_META_HINTS));
}

/** findMp3FrameHeader over a Blob: chunks overlap by the 3 bytes a header could
 * straddle, and the scan stops at the first frame it finds. */
async function findMp3FrameHeaderInFile(file: Blob, chunkSize = SCAN_CHUNK): Promise<number> {
  let pos = ID3_HEADER;
  while (pos + 4 <= file.size) {
    const end = Math.min(pos + chunkSize, file.size);
    const found = findMp3FrameHeader(await bytesOf(file, pos, end + 3), 0);
    if (found !== -1) return pos + found;
    pos = end;
  }
  return -1;
}

async function cleanTagFile(
  file: Blob,
  stripRegion: (u8: Uint8Array, opts: { stripAllMetadata?: boolean }) => Id3Region,
  opts: { stripAllMetadata?: boolean }
): Promise<FileParts> {
  const region = await id3v2Region(file);
  if (region === null) {
    const r = stripRegion(new Uint8Array(0), opts);
    return { parts: [file.slice(0)], actions: r.actions };
  }
  const r = stripRegion(region, opts);
  if (r.replacement === null) return { parts: [file.slice(0)], actions: r.actions };
  return { parts: [r.replacement as BlobPart, file.slice(r.total)], actions: r.actions };
}

async function cleanMp3File(file: Blob, opts: { stripAllMetadata?: boolean }): Promise<FileParts> {
  const declared = id3v2Declared(await bytesOf(file, 0, ID3_HEADER));
  if (!isTruncatedId3v2(declared, file.size)) return cleanTagFile(file, stripId3v2Region, opts);
  const audio = await findMp3FrameHeaderInFile(file);
  if (audio === -1) {
    return {
      parts: [file.slice(0)],
      actions: [
        `cannot locate valid audio frame in truncated ID3v2.${declared!.major} tag; preserving file`,
      ],
    };
  }
  return {
    parts: [file.slice(audio)],
    actions: [`drop truncated ID3v2.${declared!.major} tag (found audio frame at offset ${audio})`],
  };
}

interface WavChunkEntry {
  cid: string;
  payload: Uint8Array | null;
  start: number;
  end: number;
}

/** Walk RIFF chunks, reading headers and only the chunks that could matter. */
async function wavChunkIndex(
  file: Blob
): Promise<{ chunks: WavChunkEntry[]; tailStart: number; overrun: boolean }> {
  const chunks: WavChunkEntry[] = [];
  let pos = 12;
  let overrun = false;
  while (pos + 8 <= file.size) {
    const head = await bytesOf(file, pos, pos + 8);
    if (head.length < 8) break;
    const cid = latin1(head.subarray(0, 4));
    const csize = le32(head, 4);
    const cend = pos + 8 + csize;
    if (cend > file.size) {
      overrun = true;
      break;
    }
    const pad = csize & 1;
    const payload = wavNeedsPayload(cid) ? await bytesOf(file, pos + 8, cend) : null;
    chunks.push({ cid, payload, start: pos, end: cend + pad });
    pos = cend + pad;
  }
  return { chunks, tailStart: pos, overrun };
}

async function inspectWavFile(file: Blob): Promise<Layer> {
  const { chunks } = await wavChunkIndex(file);
  const findings: string[] = [];
  let hasAiMetadata = false;
  let hasC2pa = false;
  for (const { cid, payload } of chunks) {
    const r = inspectWavChunk(cid, payload);
    if (r === null) continue;
    if (r.hasAiMetadata) hasAiMetadata = true;
    if (r.hasC2pa) hasC2pa = true;
    findings.push(...r.findings);
  }
  return { hasC2pa, hasAiMetadata, findings };
}

async function cleanWavFile(
  file: Blob,
  { stripAllMetadata = true }: { stripAllMetadata?: boolean } = {}
): Promise<FileParts> {
  const { chunks, tailStart, overrun } = await wavChunkIndex(file);
  const actions: string[] = [];
  const parts: BlobPart[] = [];
  let body = 0;
  for (const { cid, payload, start, end } of chunks) {
    const action = wavChunkDrop(cid, payload, stripAllMetadata);
    if (action !== null) {
      actions.push(action);
      continue;
    }
    parts.push(file.slice(start, end));
    body += end - start;
  }
  if (overrun) {
    parts.push(file.slice(tailStart));
    body += file.size - tailStart;
  }
  const head = await bytesOf(file, 0, 12);
  const riffSize = head.length + body - 8;
  head[4] = riffSize & 0xff;
  head[5] = (riffSize >>> 8) & 0xff;
  head[6] = (riffSize >>> 16) & 0xff;
  head[7] = (riffSize >>> 24) & 0xff;
  if (!actions.length) actions.push('no WAV metadata chunks removed (already clean or none matched)');
  return { parts: [head as BlobPart, ...parts], actions };
}

/** Sniff the format of a File without reading past its header. */
export async function detectAvFormatFile(file: Blob): Promise<AvFormat> {
  const head = await bytesOf(file, 0, 12);
  const fmt = detectAvFormat(head);
  if (fmt !== 'mp3') return fmt;
  // detectAvFormat needs the whole ID3v2 tag to tell a tagged FLAC from an MP3.
  if (latin1(head.subarray(0, 3)) !== 'ID3') return fmt;
  const region = await id3v2Region(file);
  if (region === null) return 'mp3';
  const parsed = parseId3v2Frames(region);
  if (parsed === null) return 'mp3';
  const next = await bytesOf(file, parsed.total, parsed.total + 4);
  return latin1(next) === 'fLaC' ? 'flac' : 'mp3';
}

/** The same report inspectAv() returns for the same bytes. */
export async function inspectAvFile(file: Blob): Promise<AvInspectResult> {
  const fmt = await detectAvFormatFile(file);
  const r: Layer =
    fmt === 'mp4'
      ? await inspectMp4File(file)
      : fmt === 'wav'
        ? await inspectWavFile(file)
        : fmt === 'mp3'
          ? await inspectMp3File(file)
          : fmt === 'flac'
            ? await inspectTagFile(file, inspectFlac)
            : { hasC2pa: false, hasAiMetadata: false, findings: [UNSUPPORTED] };
  return {
    format: fmt,
    hasC2pa: r.hasC2pa,
    hasAiMetadata: r.hasAiMetadata,
    findings: r.findings,
    notes: fmt === 'unknown' ? [UNKNOWN_NOTE] : [],
  };
}

/**
 * The Blob is assembled from slices of the original File, so the bytes that are
 * not being changed never enter memory.
 */
export async function cleanAvFile(
  file: Blob,
  { stripAllMetadata = true, type = '' }: { stripAllMetadata?: boolean; type?: string } = {}
): Promise<AvCleanFileResult> {
  const fmt = await detectAvFormatFile(file);
  let r: FileParts;
  if (fmt === 'mp4') r = await cleanMp4File(file, { stripAllMetadata });
  else if (fmt === 'wav') r = await cleanWavFile(file, { stripAllMetadata });
  else if (fmt === 'mp3') r = await cleanMp3File(file, { stripAllMetadata });
  else if (fmt === 'flac') r = await cleanTagFile(file, stripFlacRegion, { stripAllMetadata });
  else throw new Error(`unsupported audio/video format for cleaning: ${fmt}`);
  return {
    format: fmt,
    blob: new Blob(r.parts, type ? { type } : undefined),
    actions: r.actions,
    inspectionIncomplete: r.inspectionIncomplete === true,
  };
}
