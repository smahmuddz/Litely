import { zipSync, type Zippable } from 'fflate';

type PostMsg = { postMessage: (m: unknown, transfer?: Transferable[]) => void };
const post = (m: unknown, transfer?: Transferable[]) =>
  (self as unknown as PostMsg).postMessage(m, transfer);

self.onmessage = async (e: MessageEvent) => {
  const { files, compression } = e.data as {
    files: Array<{ name: string; data: ArrayBuffer }>;
    compression?: number;
  };
  try {
    const entries: Zippable = {};
    let size = 0;
    for (const f of files) {
      const bytes = new Uint8Array(f.data);
      entries[f.name] = bytes;
      size += bytes.byteLength;
      post({ type: 'progress', name: f.name, size });
    }
    const level = Math.max(0, Math.min(9, compression ?? 6)) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
    const zipped = zipSync(entries, { level });
    post(
      { type: 'done', buffer: zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength), count: files.length },
      [zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer]
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Zip creation failed';
    post({ type: 'error', message });
  }
};
