import ZipWorker from '../workers/zip.worker?worker';
import { downloadBlob } from './format';

let toastImpl: ((type: 'info' | 'success' | 'error', title: string, message?: string) => void) | null = null;

export function bindZipToasts(
  notify: (type: 'info' | 'success' | 'error', title: string, message?: string) => void
): void {
  toastImpl = notify;
}

export async function createZip(
  files: Array<{ name: string; blob: Blob }>,
  onProgress?: (index: number, total: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = new ZipWorker();
    const cancel = () => worker.terminate();
    worker.onmessage = async (e: MessageEvent) => {
      const msg = e.data as { type: string; buffer?: ArrayBuffer; message?: string; count?: number };
      if (msg.type === 'done' && msg.buffer) {
        worker.terminate();
        resolve(new Blob([msg.buffer], { type: 'application/zip' }));
      } else if (msg.type === 'error') {
        worker.terminate();
        reject(new Error(msg.message ?? 'Zip failed'));
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || 'Zip worker failed'));
    };
    (async () => {
      try {
        const buffers: Array<{ name: string; data: ArrayBuffer }> = [];
        for (let i = 0; i < files.length; i += 1) {
          const f = files[i];
          buffers.push({ name: f.name, data: await f.blob.arrayBuffer() });
          onProgress?.(i + 1, files.length);
        }
        const transfers = buffers.map((b) => b.data);
        worker.postMessage({ files: buffers, compression: 6 }, transfers);
      } catch (err) {
        cancel();
        toastImpl?.('error', 'Could not read files for ZIP', err instanceof Error ? err.message : undefined);
        reject(err);
      }
    })();
  });
}

export async function downloadZip(files: Array<{ name: string; blob: Blob }>, zipName: string): Promise<void> {
  const blob = await createZip(files);
  downloadBlob(blob, zipName);
}
