/**
 * Generates Litely PWA icons as PNGs using only Node built-ins.
 * Design: dark rounded app tile with three "tool tray" bars.
 * Run: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// ---------- minimal PNG encoder ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0; // filter none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, rowStart + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ---------- signed distance helpers ----------
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const BG_TOP = [31, 35, 42];
const BG_BOTTOM = [17, 19, 24];
const BAR_TOP = [236, 238, 244];
const BAR_MID = [148, 156, 170];
const BAR_ACCENT = [99, 111, 245];

/**
 * Render the mark.
 * @param size output pixels
 * @param mode 'regular' (rounded tile + transparent corners) | 'maskable' (full bleed)
 */
function renderIcon(size, mode) {
  const px = new Uint8ClampedArray(size * size * 4);
  const s = mode === 'maskable' ? 1 : 0.92;
  const inset = (size * (1 - s)) / 2;
  const tileR = size * 0.22;
  // geometry in normalized units
  const bw = 0.29; // half width of the tile in normalized coords
  const bh = 0.29;
  const cx = 0.5;
  const cy = 0.5;
  const barW = 0.3; // half width of bars
  const barH = 0.032;
  const y1 = 0.36;
  const y2 = 0.5;
  const y3 = 0.64;
  const barR = 0.03;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nxp = (x + 0.5 - inset) / (size * s);
      const nyp = (y + 0.5 - inset) / (size * s);
      const i = (y * size + x) * 4;
      // background tile
      let d = sdRoundRect(nxp, nyp, cx, cy, bw, bh, 0.14);
      const t = clamp01((nyp - inset / size - 0.08) / 0.7);
      let col = mix(BG_TOP, BG_BOTTOM, t);
      let alpha = clamp01(0.5 - d) * (mode === 'maskable' ? 1 : 1);
      // subtle bottom shade
      if (nyp > 0.62) {
        const shade = (nyp - 0.62) / 0.5;
        col = mix(col, [0, 0, 0], shade * 0.35);
      }
      if (mode === 'maskable') {
        // full-bleed rounded-square bg instead of transparent corners
        d = sdRoundRect(nxp, nyp, cx, cy, 0.5, 0.5, 0.12);
        col = mix(BG_TOP, BG_BOTTOM, clamp01(nyp / 1));
        alpha = 1;
      }
      const bars = [
        { y: y1, c: BAR_TOP },
        { y: y2, c: BAR_MID },
        { y: y3, c: BAR_ACCENT }
      ];
      for (const bar of bars) {
        const bd = sdRoundRect(nxp, nyp, cx, bar.y, barW, barH, barR);
        if (bd < 0) {
          col = bar.c;
          break;
        }
      }
      px[i] = col[0];
      px[i + 1] = col[1];
      px[i + 2] = col[2];
      px[i + 3] = Math.round(alpha * 255);
    }
  }
  return encodePng(size, size, px);
}

const targets = [
  { file: 'icon-192.png', size: 192, mode: 'regular' },
  { file: 'icon-512.png', size: 512, mode: 'regular' },
  { file: 'icon-maskable-512.png', size: 512, mode: 'maskable' },
  { file: 'apple-touch-icon.png', size: 180, mode: 'maskable' }
];

for (const t of targets) {
  writeFileSync(join(outDir, t.file), renderIcon(t.size, t.mode));
  console.log('wrote', join('public/icons', t.file));
}
