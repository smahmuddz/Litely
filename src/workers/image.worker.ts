import UPNG from 'upng-js';
import type { ImageSettings } from '../lib/types';

/* ============================================================
   Image processing worker  -  decode + resize + re-encode entirely
   off the main thread. Streams one file at a time to keep memory low.
   ============================================================ */

type PostMsg = {
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

const post = (message: unknown, transfer?: Transferable[]) =>
  (self as unknown as PostMsg).postMessage(message, transfer);

const MAX_DIMENSION = 16384;
const MAX_PIXELS = 49_000_000;

interface OutFile {
  sourceName: string;
  width: number;
  height: number;
  mime: string;
  sourceFormat: string;
  origWidth: number;
  origHeight: number;
}

function sniff(bytes: Uint8Array): { kind: 'jpeg' | 'png' | 'webp' | 'avif' | 'gif'; mime: string } | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { kind: 'jpeg', mime: 'image/jpeg' };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return { kind: 'png', mime: 'image/png' };
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50)
      return { kind: 'webp', mime: 'image/webp' };
  }
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const s = String.fromCharCode(...bytes.slice(8, 16));
    if (/avif|avis/i.test(s)) return { kind: 'avif', mime: 'image/avif' };
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46)
    return { kind: 'gif', mime: 'image/gif' };
  return null;
}

const extFor = (kind: string) =>
  kind === 'jpeg' ? 'jpg' : kind === 'avif' ? 'avif' : kind === 'png' ? 'png' : kind === 'webp' ? 'webp' : kind;

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (/out of memory|allocat/i.test(lower))
    return 'This image is too large for the browser to process in memory. Try resizing it to a smaller dimension first.';
  if (/corrupt|decode|not a valid|could not|cannot be opened/i.test(lower))
    return 'The image file could not be decoded. It may be corrupted, truncated or an unsupported variant.';
  if (/canvas|dimension|maximum|exceed/i.test(lower))
    return 'The image exceeds the browser canvas size limit. Try processing at a smaller size.';
  if (/avif|encode|unsupported/i.test(lower))
    return 'This browser could not encode the requested format. Try WebP or PNG instead.';
  return 'The image could not be processed. It may be corrupted or unsupported.';
}

function computeSize(
  w: number,
  h: number,
  s: ImageSettings['resize']
): { width: number; height: number } {
  const clampDim = (wd: number, hd: number) => {
    let W = Math.max(1, Math.round(wd));
    let H = Math.max(1, Math.round(hd));
    const ratio = Math.min(1, MAX_DIMENSION / Math.max(W, H));
    W = Math.round(W * Math.min(1, ratio));
    H = Math.round(H * Math.min(1, ratio));
    if (W * H > MAX_PIXELS) {
      const r = Math.sqrt(MAX_PIXELS / (W * H));
      W = Math.round(W * r);
      H = Math.round(H * r);
    }
    return { width: Math.max(1, W), height: Math.max(1, H) };
  };
  const noUpscale = (wd: number, hd: number, min: number) =>
    Math.min(min, Math.max(1, Math.round(wd)));
  switch (s.mode) {
    case 'original':
      return clampDim(w, h);
    case 'percent': {
      const p = Math.min(400, Math.max(1, s.value || 100)) / 100;
      return clampDim(w * p, h * p);
    }
    case 'width': {
      if (s.lockAspect) {
        const tw = noUpscale(s.value || w, w, w);
        return clampDim(tw, (tw / w) * h);
      }
      return clampDim(s.value || w, h);
    }
    case 'height': {
      if (s.lockAspect) {
        const th = noUpscale(s.value || h, h, h);
        return clampDim((th / h) * w, th);
      }
      return clampDim(w, s.value || h);
    }
    case 'maxWidth': {
      const tw = s.value && s.value < w ? s.value : w;
      return clampDim(tw, (tw / w) * h);
    }
    case 'maxHeight': {
      const th = s.value && s.value < h ? s.value : h;
      return clampDim((th / h) * w, th);
    }
    case 'custom': {
      if (s.lockAspect) {
        const tw = noUpscale(s.width || w, w, w);
        return clampDim(tw, (tw / w) * h);
      }
      const cw = s.width && s.width > 0 ? s.width : w;
      const ch = s.height && s.height > 0 ? s.height : h;
      return clampDim(cw, ch);
    }
    default:
      return clampDim(w, h);
  }
}

function hasVisibleAlpha(data: Uint8ClampedArray): boolean {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) return true;
  }
  return false;
}

const PNG_QUALITY_TO_COLORS = (q: number): number => {
  if (q >= 0.85) return 256;
  if (q >= 0.7) return 128;
  if (q >= 0.55) return 64;
  if (q >= 0.35) return 32;
  return 16;
};

async function encodePngQuantized(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  colors: number,
  dither: boolean
): Promise<Blob> {
  const rgba = new Uint8Array(data.buffer, data.byteOffset, data.length);
  const buf = UPNG.encode([rgba], width, height, colors, dither ? [0.6] : undefined) as ArrayBuffer;
  return new Blob([buf], { type: 'image/png' });
}

async function encodeLosslessPng(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  fallbackCanvas: OffscreenCanvas
): Promise<Blob> {
  try {
    const rgba = new Uint8Array(data.buffer, data.byteOffset, data.length);
    const buf = UPNG.encode([rgba], width, height, 0) as ArrayBuffer;
    return new Blob([buf], { type: 'image/png' });
  } catch {
    return fallbackCanvas.convertToBlob({ type: 'image/png' });
  }
}

interface SettingsLike extends ImageSettings {}

async function processOne(file: File, settings: SettingsLike): Promise<OutFile & { blob: Blob }> {
  const bytes = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const detected = sniff(bytes);
  if (!detected) {
    const err = new Error('unsupported');
    (err as Error & { code?: string }).code = 'decode';
    throw err;
  }

  let targetKind: 'jpeg' | 'png' | 'webp' | 'avif';
  if (settings.format === 'original') {
    if (detected.kind === 'gif') throw new Error('GIF is not a supported output  -  choose another format.');
    targetKind = detected.kind;
  } else {
    targetKind = settings.format;
  }

  const mime = `image/${targetKind}`;

  // Keep-identical fast path: user asked to preserve the original bytes.
  const keepOriginal =
    !settings.removeMetadata &&
    settings.format === 'original' &&
    settings.quality >= 1 &&
    settings.resize.mode === 'original' &&
    !settings.pngQuantize;
  if (keepOriginal) {
    const info = await decodeInfo(file);
    return {
      ...info,
      origWidth: info.width,
      origHeight: info.height,
      sourceName: file.name,
      sourceFormat: detected.kind,
      blob: file.slice(0, file.size, detected.mime),
      mime: detected.mime
    };
  }

  let bitmap: ImageBitmap | null = null;
  let canvas: OffscreenCanvas | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (e) {
    throw new Error(`decode:${friendlyError(e)}`);
  }
  if (bitmap.width > MAX_DIMENSION || bitmap.height > MAX_DIMENSION) {
    throw new Error(
      `The image is ${bitmap.width}×${bitmap.height}px  -  larger than browsers can paint (max ${MAX_DIMENSION}px). Try a smaller source or resize first.`
    );
  }

  try {
    const origWidth = bitmap.width;
    const origHeight = bitmap.height;
    const size = computeSize(bitmap.width, bitmap.height, settings.resize);
    canvas = new OffscreenCanvas(size.width, size.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D is unavailable.');

    ctx.clearRect(0, 0, size.width, size.height);

    // Background fill for JPEG flattening (transparent pixels would turn black).
    if (targetKind === 'jpeg') {
      const bg =
        settings.background === 'black'
          ? '#000000'
          : settings.background === 'custom'
            ? settings.backgroundColor || '#ffffff'
            : '#ffffff';
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size.width, size.height);
    }

    // Enable high-quality downscale.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close();
    bitmap = null;

    const outW = size.width;
    const outH = size.height;

    if (targetKind === 'png') {
      const data = ctx.getImageData(0, 0, outW, outH);
      let blob: Blob;
      if (settings.pngQuantize) {
        const colors = PNG_QUALITY_TO_COLORS(settings.quality);
        const dither = colors <= 64;
        blob = await encodePngQuantized(data.data, outW, outH, colors, dither);
      } else {
        blob = await encodeLosslessPng(data.data, outW, outH, canvas);
      }
      return {
        sourceName: file.name,
        width: outW,
        height: outH,
        origWidth,
        origHeight,
        mime: 'image/png',
        sourceFormat: detected.kind,
        blob
      };
    }

    const opts: ImageEncodeOptions = { type: mime, quality: clampQuality(settings.quality) };
    let blob: Blob;
    try {
      blob = await canvas.convertToBlob(opts);
    } catch (e) {
      throw new Error(
        settings.format === 'avif'
          ? 'This browser does not support encoding AVIF images. Try WebP instead.'
          : `encode:${friendlyError(e)}`
      );
    }
    if (blob.type !== mime && !blob.type) {
      throw new Error(`encode:This browser could not encode ${mime}.`);
    }
    if (settings.format === 'avif' && blob.type !== 'image/avif') {
      throw new Error('This browser does not support encoding AVIF images. Try WebP instead.');
    }
    return {
      sourceName: file.name,
      width: outW,
      height: outH,
      origWidth,
      origHeight,
      mime: blob.type || mime,
      sourceFormat: detected.kind,
      blob
    };
  } finally {
    if (bitmap) bitmap.close();
  }
}

function clampQuality(q: number): number {
  return Math.min(1, Math.max(0.05, q));
}

async function decodeInfo(file: File): Promise<{ width: number; height: number }> {
  const b = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const w = b.width;
  const h = b.height;
  b.close();
  return { width: w, height: h };
}

self.onmessage = async (e: MessageEvent) => {
  const { file, settings, index } = e.data as {
    file: File;
    settings: SettingsLike;
    index: number;
  };
  try {
    const res = await processOne(file, settings);
    post({ type: 'result', index, ...res });
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Unknown error';
    const code = raw.startsWith('decode') || raw.startsWith('encode') ? raw.slice(0, raw.indexOf(':')) : 'generic';
    const message = code === 'generic' ? raw : raw.slice(raw.indexOf(':') + 1);
    post({ type: 'error', index, code, message });
  }
};
