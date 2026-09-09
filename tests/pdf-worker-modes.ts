/* End-to-end exercise of the REAL pdf.worker.ts source in Node.
   Creates a small PDF, then drives the worker's message handler for every
   split mode and asserts the same contract the UI depends on. */

const posts = [];
const handlers = {};
globalThis.self = {
  set onmessage(fn) { handlers.main = fn; },
  get onmessage() { return handlers.main; },
  postMessage(msg, transfer) { posts.push({ msg, transfer }); }
};

const worker = await import('../src/workers/pdf.worker.ts');

import { PDFDocument } from 'pdf-lib';

let failures = 0;
function check(name, cond, extra) {
  if (!cond) { failures++; console.error('FAIL', name, extra ?? ''); }
  else console.log('ok  ', name);
}

async function makePdf(pages) {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pages; i++) {
    const p = doc.addPage([220, 320]);
    p.drawText(`p${i}`, { x: 50, y: 150 });
  }
  const bytes = await doc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function runRequest(msg) {
  const before = posts.length;
  await handlers.main({ data: msg });
  const sent = posts.slice(before);
  posts.length = before;
  const result = sent.find((s) => s.msg.type !== 'pdf-progress' && s.msg.id) ?? sent.find((s) => s.msg.type === 'error');
  return result?.msg;
}

const buf = await makePdf(7);

// mode: extract (selected pages) → 1 combined PDF
{
  const out = await runRequest({ id: 'r1', type: 'transform', mode: 'extract', buffer: buf, base: 'doc.pdf', pages: [0, 2, 6] });
  check('extract returns a result', out?.type === 'transform-result', out?.type);
  check('extract creates 1 file', out?.files?.length === 1, out?.files?.length);
  check('extract page count correct', out?.files?.[0]?.buffer?.byteLength > 100);
}

// mode: ranges → one PDF per range
{
  const out = await runRequest({ id: 'r2', type: 'transform', mode: 'ranges', buffer: buf, base: 'doc', ranges: [{ from: 0, to: 1 }, { from: 4, to: 5 }] });
  check('ranges creates 2 files', out?.files?.length === 2, out?.files?.length);
}

// mode: each → one PDF per page
{
  const out = await runRequest({ id: 'r3', type: 'transform', mode: 'each', buffer: buf, base: 'doc' });
  check('each creates 7 files', out?.files?.length === 7, out?.files?.length);
}

// mode: groups of 3 → 3 PDFs (7 pages → 3+3+1)
{
  const out = await runRequest({ id: 'r4', type: 'transform', mode: 'groups', buffer: buf, base: 'doc', groupSize: 3 });
  check('groups creates 3 files', out?.files?.length === 3, out?.files?.length);
}

// reorder + rotate
{
  const out = await runRequest({ id: 'r5', type: 'transform', mode: 'reorder', buffer: buf, base: 'doc', order: [6, 0, 1, 2, 3, 4, 5], rotate: [90, 0, 0, 0, 0, 0, 0] });
  check('reorder returns one file', out?.type === 'transform-result' && out?.files?.length === 1, out?.type);
}

// merge an actual PNG image into a document (image → PDF page)
{
  const UPNG = (await import('upng-js')).default;
  const img = new Uint8Array(4 * 4 * 4);
  for (let i = 0; i < img.length; i += 4) {
    img[i] = 240; img[i + 1] = 120; img[i + 2] = 40; img[i + 3] = 255;
  }
  const png = UPNG.encode([img], 4, 4, 0);
  const a = await runRequest({ id: 'rA', type: 'merge-add-image', buffer: png, mime: 'image/png', name: 'shot.png', index: 0 });
  check('image accepted for merge', a?.type === 'merge-added', a?.type);
  const b = await runRequest({ id: 'rB', type: 'merge-finish', name: 'with-photo.pdf' });
  check('merged doc contains the image page', b?.type === 'merge-result' && b.pages === 1 && b.buffer && b.buffer.byteLength > 150, b?.type);
}

console.log(failures === 0 ? 'PDF WORKER MODES PASSED' : `${failures} FAILED`);

// Regression: a progress tick that reuses the request id must not resolve the
// request early with an empty file list (the "split produced 0 PDFs" bug).
{
  let resolved = null;
  const onProgress = [];
  const pending = new Map<string, unknown>([['reqX', {}]]);
  const handle = (m) => {
    if (m.type === 'pdf-progress') { onProgress.push(m); return; }
    if (m.id && pending.has(m.id)) {
      pending.delete(m.id);
      resolved = m;
    }
  };
  handle({ id: 'reqX', type: 'pdf-progress', detail: 3 });
  handle({ id: 'reqX', type: 'pdf-progress', detail: 6 });
  handle({ id: 'reqX', type: 'transform-result', files: [{ name: 'doc-1-3.pdf', buffer: new ArrayBuffer(8) }], count: 1 });
  check('progress ticks do not resolve the request', resolved?.type === 'transform-result' && resolved.files?.length === 1);
  check('progress ticks are surfaced', onProgress.length === 2);
}
process.exit(failures === 0 ? 0 : 1);
