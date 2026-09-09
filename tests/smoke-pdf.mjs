/* Validate the PDF approach used by pdf.worker: create, merge, split, reorder. */
import { PDFDocument, degrees } from 'pdf-lib';

async function makePdf(label, pages) {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([300, 420]);
    page.drawText(`${label} page ${i}`, { x: 60, y: 200, size: 18 });
  }
  return doc.save();
}

let failures = 0;
function check(name, cond, extra) {
  if (!cond) { failures++; console.error('FAIL', name, extra ?? ''); } else console.log('ok  ', name);
}

const a = await makePdf('A', 3);
const b = await makePdf('B', 2);

// merge
const merged = await PDFDocument.create();
for (const buf of [a, b]) {
  const src = await PDFDocument.load(buf, { throwOnInvalidObject: false });
  const pages = await merged.copyPages(src, src.getPageIndices());
  pages.forEach((p) => merged.addPage(p));
}
const mergedBytes = await merged.save();
const checkMerge = await PDFDocument.load(mergedBytes);
check('merge total pages', checkMerge.getPageCount() === 5);

// split: extract pages [1,3] (0 and 2)
const src = await PDFDocument.load(a);
const out = await PDFDocument.create();
for (const idx of [0, 2]) {
  const [p] = await out.copyPages(src, [idx]);
  out.addPage(p);
}
const outBytes = await out.save();
const checkSplit = await PDFDocument.load(outBytes);
check('extract count', checkSplit.getPageCount() === 2);

// reorder 3-page doc: order [2,0,1], rotate first to 90
const re = await PDFDocument.create();
for (const [i, orig] of [2, 0, 1].entries()) {
  const [p] = await re.copyPages(src, [orig]);
  re.addPage(p);
  if (i === 0) p.setRotation(degrees(90));
}
const reBytes = await re.save();
const checkRe = await PDFDocument.load(reBytes);
check('reorder count', checkRe.getPageCount() === 3);
const rot = checkRe.getPage(0).getRotation();
check('reorder rotation', rot.angle === 90, rot.angle);

console.log(failures === 0 ? 'PDF SMOKE PASSED' : 'PDF FAILURES');
process.exit(failures === 0 ? 0 : 1);
