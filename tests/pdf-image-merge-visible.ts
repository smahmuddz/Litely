/* Regression: merging an image into a PDF must produce a page that actually
   renders pixels (PNGs from some in-browser encoders embed but come out blank).
   Uses the real pdf.worker source + pdfjs rasterization. */

import fs from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';

const posts = [];
const handlers = {};
globalThis.self = {
  set onmessage(fn) { handlers.main = fn; },
  get onmessage() { return handlers.main; },
  postMessage(m) { posts.push(m); }
};

const worker = await import('../src/workers/pdf.worker.ts');

let failures = 0;
function check(name, cond, extra) {
  if (!cond) { failures++; console.error('FAIL', name, extra ?? ''); }
  else console.log('ok  ', name);
}

async function run(m) {
  const b = posts.length;
  await handlers.main({ data: m });
  return posts.slice(b);
}

const c = createCanvas(400, 300);
const ctx = c.getContext('2d');
const g = ctx.createLinearGradient(0, 0, 400, 0);
g.addColorStop(0, '#ff0000');
g.addColorStop(1, '#0040ff');
ctx.fillStyle = g;
ctx.fillRect(0, 0, 400, 300);
const jpg = Buffer.from(c.toBuffer('image/jpeg', 95));
const buf = jpg.buffer.slice(jpg.byteOffset, jpg.byteOffset + jpg.byteLength);

const a = await run({ id: 'v1', type: 'merge-add-image', buffer: buf, mime: 'image/jpeg', name: 'photo.jpg', index: 0 });
check('jpeg accepted', a.some((x) => x.type === 'merge-added'));
const b = await run({ id: 'v2', type: 'merge-finish', name: 'merged.pdf' });
const out = b.find((x) => x.type === 'merge-result');
check('merge result exists', !!out);
if (out) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(out.buffer), isEvalSupported: false }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 0.5 });
  const cc = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
  await page.render({ canvasContext: cc.getContext('2d'), viewport: vp }).promise;
  const im = cc.getContext('2d').getImageData(0, 0, cc.width, cc.height).data;
  let nonWhite = 0;
  for (let i = 0; i < im.length; i += 4) {
    if (!(im[i] > 250 && im[i + 1] > 250 && im[i + 2] > 250)) nonWhite++;
  }
  check('image page renders visible pixels', nonWhite > 1000, nonWhite);
}

console.log(failures === 0 ? 'PDF IMAGE RENDER PASSED' : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
