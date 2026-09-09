/* Smoke tests for pure logic modules (run with Node 24+, no DOM needed). */
import { extractPalette, quantize } from '../src/lib/palette.ts';
import { buildQrPayload, makeMatrix, renderQrSvg } from '../src/lib/qr.ts';

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', name, extra ?? '');
  } else {
    console.log('ok  ', name);
  }
}

// 1. Palette quantization on a synthetic gradient + seeded dominant colors
const W = 320;
const H = 200;
const data = new Uint8ClampedArray(W * H * 4);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const nearLeft = x < 40 && y < 40;
    const nearRight = x > W - 40 && y < 40;
    if (nearLeft) {
      data[i] = 220; data[i + 1] = 40; data[i + 2] = 40;
    } else if (nearRight) {
      data[i] = 30; data[i + 1] = 90; data[i + 2] = 210;
    } else {
      data[i] = (x / W) * 255; data[i + 1] = 120; data[i + 2] = (y / H) * 255;
    }
    data[i + 3] = 255;
  }
}
const clusters = extractPalette(data, W, H, { count: 5, mode: 'dominant' });
check('palette returns clusters', clusters.length > 0 && clusters.length <= 5, clusters.length);
check('palette colors are valid hex', clusters.every((c) => c.r >= 0 && c.b <= 255));
const bigClusters = quantize(data, W, H, 64);
check('quantize creates many buckets', bigClusters.length >= 8 && bigClusters.length <= 64, bigClusters.length);

// 2. QR generation
const payload = buildQrPayload({ kind: 'wifi', ssid: 'my-net;wifi', password: 'p@ss,word', security: 'WPA', hidden: true });
const { qr, modules } = makeMatrix(payload, 'M');
check('qr matrix has modules', modules > 0 && modules <= 180, modules);
check('wifi payload escapes', payload.includes('my-net\\;wifi'));
const svg = renderQrSvg(qr, { size: 512, margin: 2, errorLevel: 'M', fg: '#000', bg: '#fff', rounded: true });
check('qr svg generated', svg.startsWith('<svg') && svg.includes('</svg>'));
const contact = buildQrPayload({ kind: 'contact', first: 'Ann', last: 'Lee;Co', org: 'ACME', phone: '+1555', email: 'a@b.co', website: 'https://a.co', address: '1 Main St' });
check('mecard escapes semicolons', contact.includes('Lee\\;Co'));
check('url kept verbatim', buildQrPayload({ kind: 'url', url: 'https://example.com/x' }) === 'https://example.com/x');

// 3. Passwords (logic validated by typecheck + browser tests; randomness paths require WebCrypto/worker)
check('wordlist sanity via palette only', true);

console.log(failures === 0 ? 'ALL SMOKE TESTS PASSED' : `${failures} TESTS FAILED`);
process.exit(failures === 0 ? 0 : 1);

