import { extractPalette, type ExtractOptions } from '../lib/palette';

type PostMsg = { postMessage: (m: unknown, transfer?: Transferable[]) => void };
const post = (m: unknown) => (self as unknown as PostMsg).postMessage(m);

const MAX_SIDE = 640;

function friendly(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/decode|corrupt|not a valid|could not/i.test(msg))
    return 'The image could not be decoded. It may be corrupted or unsupported.';
  if (/too large|memory|dimension|canvas/i.test(msg))
    return 'The image is too large to analyze. Try a smaller image.';
  return 'The palette could not be extracted from this image.';
}

self.onmessage = async (e: MessageEvent) => {
  const { buffer, name, mime, options, id } = e.data as {
    buffer: ArrayBuffer;
    name: string;
    mime: string;
    options: ExtractOptions;
    id: number;
  };
  try {
    const blob = new Blob([buffer], { type: mime || 'image/png' });
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    try {
      const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas unavailable.');
      ctx.drawImage(bitmap, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const clusters = extractPalette(img.data, w, h, options);
      post({ type: 'result', id, clusters, width: bitmap.width, height: bitmap.height });
    } finally {
      bitmap.close();
    }
  } catch (err) {
    post({ type: 'error', id, message: friendly(err) });
  }
};
