/* Lazy PDF page rendering. The heavy pdfjs-dist module and its worker
   are only imported the first time a page preview is actually requested. */

type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<{ getViewport: (o: { scale: number }) => { width: number; height: number }; render: (p: unknown) => { promise: Promise<unknown> } }>;
  destroy: () => Promise<void>;
};

export interface PdfHandle {
  numPages: number;
  destroy: () => void;
  getPageSize: (pageNumber: number) => { width: number; height: number };
  /** internal: re-open a page and render it. */
  render: (pageNumber: number, canvas: HTMLCanvasElement, targetWidth: number) => Promise<void>;
}

type PdfjsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (params: { data: ArrayBuffer; isEvalSupported?: boolean }) => {
    promise: Promise<PdfDoc>;
  };
};

let pdfjsMod: PdfjsModule | null = null;
let workerBroken = false;

async function ensurePdfjs(): Promise<PdfjsModule> {
  if (pdfjsMod) return pdfjsMod;
  const mod = await import('pdfjs-dist');
  if (!workerBroken) {
    try {
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default as string;
      mod.GlobalWorkerOptions.workerSrc = workerUrl;
    } catch {
      workerBroken = true;
    }
  }
  pdfjsMod = mod as PdfjsModule;
  return pdfjsMod;
}

export async function loadPdfHandle(file: File): Promise<PdfHandle> {
  const pdfjs = await ensurePdfjs();
  const data = await file.arrayBuffer();
  let doc: PdfDoc | null = null;
  try {
    const task = pdfjs.getDocument({ data, isEvalSupported: false });
    try {
      doc = await task.promise;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/worker|script|import/i.test(msg) && !workerBroken) {
        // Fall back to the main-thread "fake worker" if the dedicated worker broke.
        workerBroken = true;
        pdfjs.GlobalWorkerOptions.workerSrc = '';
        const retry = pdfjs.getDocument({ data, isEvalSupported: false });
        doc = await retry.promise;
      } else {
        throw err;
      }
    }
  } catch {
    throw new Error(
      "This file couldn't be opened as a PDF. It may be corrupted, password-protected, or not actually a PDF."
    );
  }
  const captured = doc;
  const numPages = captured.numPages;
  let destroyed = false;
  return {
    numPages,
    destroy: () => {
      if (!destroyed) {
        destroyed = true;
        void captured.destroy();
      }
    },
    getPageSize: () => ({ width: 1, height: 1 }),
    render: async (pageNumber: number, canvas: HTMLCanvasElement, targetWidth: number) => {
      if (destroyed) throw new Error('Preview was closed.');
      const page = await captured.getPage(pageNumber);
      const vp1 = page.getViewport({ scale: 1 });
      const scale = targetWidth / Math.max(1, vp1.width);
      const viewport = page.getViewport({ scale });
      const maxHeight = 900;
      if (viewport.height > maxHeight) {
        const capped = page.getViewport({ scale: (scale * maxHeight) / viewport.height });
        const ctx = canvas.getContext('2d');
        canvas.width = Math.max(1, Math.floor(capped.width));
        canvas.height = Math.max(1, Math.floor(capped.height));
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport: capped } as never).promise;
        return;
      }
      const ctx = canvas.getContext('2d');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      if (!ctx) return;
      await page.render({ canvasContext: ctx, viewport } as never).promise;
    }
  };
}
