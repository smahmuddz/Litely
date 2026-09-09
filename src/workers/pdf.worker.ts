import { PDFDocument, degrees } from 'pdf-lib';

type PostMsg = {
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};
const post = (message: unknown, transfer?: Transferable[]) =>
  (self as unknown as PostMsg).postMessage(message, transfer);

let mergeDoc: PDFDocument | null = null;
let mergePages = 0;

function friendly(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (/encrypted|password/i.test(lower))
    return 'This PDF is password-protected. Remove the password before processing.';
  if (/corrupt|invalid|not a pdf|damaged|header/i.test(lower))
    return 'This file could not be read as a PDF. It may be corrupted, or it may not actually be a PDF.';
  if (/memory|too large|overflow/i.test(lower))
    return 'This PDF is too large to process in the browser. Try a smaller file.';
  return 'The PDF could not be processed. It may be corrupted or unsupported.';
}

async function loadDoc(buffer: ArrayBuffer, name?: string): Promise<PDFDocument> {
  try {
    const doc = await PDFDocument.load(buffer, { throwOnInvalidObject: false });
    if (doc.isEncrypted) throw new Error('encrypted');
    return doc;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/encrypted|password/i.test(msg)) throw new Error('encrypted');
    throw e;
  }
}

async function copyAll(src: PDFDocument, out: PDFDocument): Promise<number> {
  const indices = src.getPageIndices();
  for (let i = 0; i < indices.length; i += 1) {
    const [page] = await out.copyPages(src, [indices[i]]);
    out.addPage(page);
    if (i % 40 === 39) post({ type: 'pdf-progress', detail: i + 1 });
  }
  return indices.length;
}

async function docFromPages(src: PDFDocument, outName: string, indices: number[]): Promise<{ name: string; buffer: ArrayBuffer }> {
  const out = await PDFDocument.create();
  for (const idx of indices) {
    const [page] = await out.copyPages(src, [idx]);
    out.addPage(page);
  }
  const bytes = await out.save();
  return { name: outName, buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer };
}

async function handleTransform(msg: any): Promise<void> {
  const { id, mode, buffer, base } = msg;
  const safeBase = base.replace(/\.pdf$/i, '');
  try {
    const src = await loadDoc(buffer);
    const total = src.getPageCount();

    if (mode === 'extract') {
      const want: number[] = Array.isArray(msg.pages) ? msg.pages : [];
      const indices = [...new Set(want)]
        .filter((n: number) => n >= 0 && n < total)
        .sort((a: number, b: number) => a - b);
      if (indices.length === 0) throw new Error('No valid pages selected.');
      const file = await docFromPages(src, `${safeBase}-extracted.pdf`, indices);
      post({ id, type: 'transform-result', files: [file], count: 1, sourcePages: total });
      return;
    }

    if (mode === 'ranges') {
      const ranges: Array<{ from: number; to: number }> = msg.ranges ?? [];
      const files: Array<{ name: string; buffer: ArrayBuffer }> = [];
      let fileIndex = 0;
      for (const r of ranges) {
        const idxs: number[] = [];
        for (let p = r.from; p <= r.to; p += 1) if (p >= 0 && p < total) idxs.push(p);
        if (idxs.length === 0) continue;
        fileIndex += 1;
        const label = r.from === r.to ? `${r.from + 1}` : `${r.from + 1}-${Math.min(r.to, total) + 1}`;
        files.push(await docFromPages(src, `${safeBase}-${label}.pdf`, idxs));
        post({ id, type: 'pdf-progress', detail: fileIndex });
      }
      if (files.length === 0) throw new Error('The page ranges did not match any pages in this PDF.');
      post({ id, type: 'transform-result', files, count: files.length, sourcePages: total });
      return;
    }

    if (mode === 'each') {
      const files: Array<{ name: string; buffer: ArrayBuffer }> = [];
      const batch: Array<{ name: string; buffer: ArrayBuffer }> = [];
      for (let p = 0; p < total; p += 1) {
        batch.push(await docFromPages(src, `${safeBase}-page-${p + 1}.pdf`, [p]));
        if (batch.length >= 40 || p === total - 1) {
          files.push(...batch);
          batch.length = 0;
        }
        post({ id, type: 'pdf-progress', detail: p + 1 });
      }
      post({ id, type: 'transform-result', files, count: files.length, sourcePages: total });
      return;
    }

    if (mode === 'groups') {
      const size = Math.max(1, msg.groupSize || 5);
      const files: Array<{ name: string; buffer: ArrayBuffer }> = [];
      let group = 1;
      for (let p = 0; p < total; p += size) {
        const end = Math.min(total, p + size);
        const idxs: number[] = [];
        for (let i = p; i < end; i += 1) idxs.push(i);
        const label = p + 1 === end ? `${p + 1}` : `${p + 1}-${end}`;
        files.push(await docFromPages(src, `${safeBase}-part-${group}-p${label}.pdf`, idxs));
        group += 1;
        post({ id, type: 'pdf-progress', detail: Math.min(end, total) });
      }
      post({ id, type: 'transform-result', files, count: files.length, sourcePages: total });
      return;
    }

    if (mode === 'reorder') {
      const order: number[] = msg.order ?? [];
      const rotate: number[] = msg.rotate ?? [];
      if (order.length !== total) throw new Error('Page list does not match the document.');
      const seen = new Set<number>();
      for (const o of order) {
        if (o < 0 || o >= total || seen.has(o)) throw new Error('Invalid page list.');
        seen.add(o);
      }
      const out = await PDFDocument.create();
      for (let i = 0; i < order.length; i += 1) {
        const [page] = await out.copyPages(src, [order[i]]);
        out.addPage(page);
        const rot = rotate[i] ?? 0;
        if (rot % 360 !== 0) {
          page.setRotation(degrees((page.getRotation().angle + rot) % 360));
        }
        if (i % 40 === 39) post({ id, type: 'pdf-progress', detail: i + 1 });
      }
      const bytes = await out.save();
      const outBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      post({ id, type: 'transform-result', files: [{ name: `${safeBase}-reordered.pdf`, buffer: outBuffer }], count: 1, sourcePages: total }, [outBuffer]);
      return;
    }

    throw new Error('Unknown PDF operation.');
  } catch (e) {
    post({ id, type: 'error', message: friendly(e) });
  }
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data as Record<string, unknown>;
  try {
    switch (msg.type) {
      case 'count': {
        const doc = await loadDoc(msg.buffer as ArrayBuffer);
        const bytes = new Uint8Array(msg.buffer as ArrayBuffer);
        post({
          type: 'count-result',
          id: msg.id,
          pages: doc.getPageCount(),
          size: bytes.byteLength,
          encrypted: doc.isEncrypted
        });
        break;
      }
      case 'merge-add': {
        if (!mergeDoc) mergeDoc = await PDFDocument.create();
        const src = await loadDoc(msg.buffer as ArrayBuffer);
        await copyAll(src, mergeDoc);
        mergePages = mergeDoc.getPageCount();
        post({ type: 'merge-added', id: msg.id, pages: mergePages, fileIndex: msg.index });
        break;
      }
      case 'merge-add-image': {
        if (!mergeDoc) mergeDoc = await PDFDocument.create();
        const bytes = new Uint8Array(msg.buffer as ArrayBuffer);
        const mime = String(msg.mime ?? 'image/png');
        const image =
          mime === 'image/jpeg'
            ? await mergeDoc.embedJpg(bytes)
            : mime === 'image/png'
              ? await mergeDoc.embedPng(bytes)
              : (() => {
                  throw new Error('This image format cannot be added to a PDF.');
                })();
        const iw = image.width;
        const ih = image.height;
        const portrait = ih >= iw;
        const pageW = portrait ? 595 : 842;
        const pageH = portrait ? 842 : 595;
        const margin = 28;
        const scale = Math.min((pageW - margin * 2) / iw, (pageH - margin * 2) / ih);
        const drawW = Math.round(iw * scale);
        const drawH = Math.round(ih * scale);
        const page = mergeDoc.addPage([pageW, pageH]);
        page.drawImage(image, {
          x: (pageW - drawW) / 2,
          y: (pageH - drawH) / 2,
          width: drawW,
          height: drawH
        });
        mergePages = mergeDoc.getPageCount();
        post({ type: 'merge-added', id: msg.id, pages: mergePages, fileIndex: msg.index });
        break;
      }
      case 'merge-finish': {
        if (!mergeDoc) throw new Error('No documents were added.');
        const bytes = await mergeDoc.save();
        mergeDoc = null;
        const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        post({ type: 'merge-result', id: msg.id, buffer: buf, pages: mergePages }, [buf]);
        break;
      }
      case 'merge-reset': {
        mergeDoc = null;
        mergePages = 0;
        post({ type: 'merge-reset-ok', id: msg.id });
        break;
      }
      case 'transform': {
        await handleTransform(msg);
        break;
      }
      default:
        post({ type: 'error', message: 'Unknown request' });
    }
  } catch (e) {
    const id = (msg?.id as string | undefined) ?? null;
    post({ type: 'error', id, message: friendly(e) });
  }
};
