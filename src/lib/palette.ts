export type PaletteMode = 'dominant' | 'vibrant' | 'muted' | 'balanced';

export interface Cluster {
  r: number;
  g: number;
  b: number;
  pop: number;
  sat: number;
  light: number;
}

export interface ExtractOptions {
  count: number;
  mode: PaletteMode;
}

const hex = (r: number, g: number, b: number) => {
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
};

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

interface Bucket {
  start: number;
  end: number;
  rMin: number;
  rMax: number;
  gMin: number;
  gMax: number;
  bMin: number;
  bMax: number;
}

/**
 * Median-cut quantization over a packed RGBA buffer. Produces a list of
 * color clusters that represent the image's color distribution rather
 * than sampling a few random pixels.
 */
export function quantize(data: Uint8ClampedArray, width: number, height: number, targetBuckets: number): Cluster[] {
  const len = width * height;
  const px = new Uint32Array(len);
  const rArr = new Uint8Array(len);
  const gArr = new Uint8Array(len);
  const bArr = new Uint8Array(len);
  const alphaArr = new Uint8Array(len);
  let n = 0;
  for (let i = 0; i < len; i += 1) {
    const idx = i * 4;
    const a = data[idx + 3];
    if (a < 40) continue; // skip nearly transparent pixels
    px[n] = (data[idx] << 16) | (data[idx + 1] << 8) | data[idx + 2];
    rArr[n] = data[idx];
    gArr[n] = data[idx + 1];
    bArr[n] = data[idx + 2];
    alphaArr[n] = a;
    n += 1;
  }
  if (n === 0) return [];
  const count = n;

  const boxes: Bucket[] = [];
  const range = (b: Bucket) => {
    b.rMin = 255;
    b.rMax = 0;
    b.gMin = 255;
    b.gMax = 0;
    b.bMin = 255;
    b.bMax = 0;
    for (let i = b.start; i < b.end; i += 1) {
      const c = px[i];
      const r = (c >> 16) & 255;
      const g = (c >> 8) & 255;
      const bl = c & 255;
      if (r < b.rMin) b.rMin = r;
      if (r > b.rMax) b.rMax = r;
      if (g < b.gMin) b.gMin = g;
      if (g > b.gMax) b.gMax = g;
      if (bl < b.bMin) b.bMin = bl;
      if (bl > b.bMax) b.bMax = bl;
    }
  };

  const split = (b: Bucket): [Bucket, Bucket] | null => {
    const rd = b.rMax - b.rMin;
    const gd = b.gMax - b.gMin;
    const bd = b.bMax - b.bMin;
    if (rd + gd + bd === 0 || b.end - b.start <= 1) return null;
    let axis: 'r' | 'g' | 'b';
    if (rd >= gd && rd >= bd) axis = 'r';
    else if (gd >= bd) axis = 'g';
    else axis = 'b';
    const mid = (b.start + b.end) >> 1;
    // sort subsection by chosen channel
    const view = px.subarray(b.start, b.end);
    const key =
      axis === 'r'
        ? (i: number) => (view[i] >> 16) & 255
        : axis === 'g'
          ? (i: number) => (view[i] >> 8) & 255
          : (i: number) => view[i] & 255;
    const idx = Array.from({ length: view.length }, (_, i) => i);
    idx.sort((a, z) => key(a) - key(z));
    const sorted = new Uint32Array(view.length);
    const sR = new Uint8Array(view.length);
    const sG = new Uint8Array(view.length);
    const sB = new Uint8Array(view.length);
    const sA = new Uint8Array(view.length);
    for (let i = 0; i < idx.length; i += 1) {
      sorted[i] = view[idx[i]];
      sR[i] = rArr[b.start + idx[i]];
      sG[i] = gArr[b.start + idx[i]];
      sB[i] = bArr[b.start + idx[i]];
      sA[i] = alphaArr[b.start + idx[i]];
    }
    px.set(sorted, b.start);
    rArr.set(sR, b.start);
    gArr.set(sG, b.start);
    bArr.set(sB, b.start);
    alphaArr.set(sA, b.start);
    const left: Bucket = { start: b.start, end: mid, rMin: 0, rMax: 0, gMin: 0, gMax: 0, bMin: 0, bMax: 0 };
    const right: Bucket = { start: mid, end: b.end, rMin: 0, rMax: 0, gMin: 0, gMax: 0, bMin: 0, bMax: 0 };
    range(left);
    range(right);
    return [left, right];
  };

  const root: Bucket = { start: 0, end: count, rMin: 0, rMax: 0, gMin: 0, gMax: 0, bMin: 0, bMax: 0 };
  range(root);
  boxes.push(root);

  while (boxes.length < targetBuckets) {
    // pick the box with the largest color range and at least 2 pixels
    let best = -1;
    let bestScore = -1;
    for (let i = 0; i < boxes.length; i += 1) {
      const b = boxes[i];
      if (b.end - b.start < 2) continue;
      const score = (b.rMax - b.rMin) + (b.gMax - b.gMin) + (b.bMax - b.bMin);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best === -1) break;
    const parts = split(boxes[best]);
    if (!parts) break;
    boxes.splice(best, 1, parts[0], parts[1]);
  }

  return boxes
    .filter((b) => b.end > b.start)
    .map((b) => {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      const pop = b.end - b.start;
      for (let i = b.start; i < b.end; i += 1) {
        rSum += (px[i] >> 16) & 255;
        gSum += (px[i] >> 8) & 255;
        bSum += px[i] & 255;
      }
      const r = rSum / pop;
      const g = gSum / pop;
      const bl = bSum / pop;
      const { s, l } = rgbToHsl(r, g, bl);
      return { r, g, b: bl, pop, sat: s, light: l };
    });
}

function score(cluster: Cluster, mode: PaletteMode, maxPop: number): number {
  const popNorm = Math.pow(cluster.pop / maxPop, 0.6);
  const mid = 1 - Math.abs(cluster.light - 52) / 80;
  switch (mode) {
    case 'dominant':
      return popNorm;
    case 'vibrant':
      return popNorm * (0.45 + cluster.sat / 100) * (0.6 + 0.4 * mid);
    case 'muted': {
      const mutedness = cluster.sat <= 42 ? 1 : Math.max(0, 1 - (cluster.sat - 42) / 40);
      return popNorm * (0.35 + 0.65 * mutedness) * (0.7 + 0.3 * mid);
    }
    case 'balanced': {
      const chroma = Math.min(1, cluster.sat / 75);
      return popNorm * (0.55 + 0.45 * chroma);
    }
  }
}

function distSq(a: Cluster, b: Cluster): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

/** Top-level entry: quantize an image buffer to a palette of `count` colors. */
export function extractPalette(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  opts: ExtractOptions
): Cluster[] {
  const want = Math.max(1, Math.min(12, opts.count));
  const targetBuckets = Math.max(want * 8, 48);
  const clusters = quantize(data, width, height, Math.min(targetBuckets, 640));
  if (clusters.length === 0) return [];

  const maxPop = Math.max(...clusters.map((c) => c.pop));
  const scored = clusters
    .map((c) => ({ cluster: c, score: score(c, opts.mode, maxPop) }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.cluster);

  const picked: Cluster[] = [];
  for (const c of scored) {
    if (picked.length >= want) break;
    // dedupe visually-similar colors
    if (picked.every((p) => distSq(p, c) > 2400)) picked.push(c);
  }
  // if too few unique, relax similarity threshold
  if (picked.length < Math.min(want, clusters.length)) {
    for (const c of scored) {
      if (picked.length >= Math.min(want, clusters.length)) break;
      if (picked.every((p) => distSq(p, c) > 600)) picked.push(c);
    }
  }
  return picked.slice(0, want);
}

export function clustersToHex(clusters: Cluster[]): string[] {
  return clusters.map((c) => hex(c.r, c.g, c.b));
}
