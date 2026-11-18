'use strict';
/* Generator ikon Capybara AI — wajah capybara flat, digambar procedural */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const OUT = path.join(__dirname, '..', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];

function render(size, maskable) {
  const S = 4, W = size * S;
  const buf = new Float64Array(W * W * 4);
  const k = W / 100;
  const px = (x, y, r, g, b, a) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    if (ix < 0 || iy < 0 || ix >= W || iy >= W) return;
    const o = (iy * W + ix) * 4;
    const na = a + buf[o + 3] * (1 - a);
    buf[o] = (r * a + buf[o] * buf[o + 3] * (1 - a)) / na;
    buf[o + 1] = (g * a + buf[o + 1] * buf[o + 3] * (1 - a)) / na;
    buf[o + 2] = (b * a + buf[o + 2] * buf[o + 3] * (1 - a)) / na;
    buf[o + 3] = na;
  };
  const inside = (x, y, x0, y0, x1, y1, rad) => {
    const qx = Math.abs(x - (x0 + x1) / 2) - ((x1 - x0) / 2 - rad);
    const qy = Math.abs(y - (y0 + y1) / 2) - ((y1 - y0) / 2 - rad);
    const dist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad;
    return -dist; // >0 di dalam
  };
  const rrect = (x0, y0, x1, y1, rad, colFn) => {
    for (let y = Math.floor(y0 * k); y < Math.ceil(y1 * k); y++) {
      for (let x = Math.floor(x0 * k); x < Math.ceil(x1 * k); x++) {
        const cx = (x + 0.5) / k, cy = (y + 0.5) / k;
        const d = inside(cx, cy, x0, y0, x1, y1, rad);
        const aa = clamp01(d * k / 1.6 + 0.5);
        if (aa > 0) {
          const [r, g, b] = colFn(cx, cy);
          px(x, y, r, g, b, aa);
        }
      }
    }
  };
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const ellipse = (cx, cy, rx, ry, col) => {
    const [r, g, b, a] = col;
    for (let y = Math.floor((cy - ry) * k); y <= Math.ceil((cy + ry) * k); y++)
      for (let x = Math.floor((cx - rx) * k); x <= Math.ceil((cx + rx) * k); x++) {
        const dx = ((x + 0.5) / k - cx) / rx, dy = ((y + 0.5) / k - cy) / ry;
        const d = dx * dx + dy * dy;
        const aa = clamp01((1 - Math.sqrt(d)) * rx * 1.6 + 0.5);
        if (aa > 0) px(x, y, r, g, b, a * aa);
      }
  };

  if (maskable) { // latar penuh moss gelap
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) px(x, y, 20, 23, 18, 1);
  }

  const BROWN_T = [179, 128, 90], BROWN_B = [125, 83, 48];   // gradien kepala
  const BROWN_D = [94, 60, 33];                               // gelap (telinga dalam, muzzle)
  const DARK = [30, 21, 14];                                  // mata & hidung
  const CREAM = [240, 232, 216];                              // gigi

  // telinga
  rrect(15, 12.5, 30, 27, 4.5, () => BROWN_B);
  rrect(70, 12.5, 85, 27, 4.5, () => BROWN_B);
  rrect(19.5, 16.5, 25.5, 24, 2.4, () => BROWN_D);
  rrect(74.5, 16.5, 80.5, 24, 2.4, () => BROWN_D);

  // kepala — gradien vertikal hangat
  rrect(10, 21, 90, 85, 17, (cx, cy) => mix(BROWN_T, BROWN_B, clamp01((cy - 21) / 64)));

  // pipi sedikit lebih terang
  ellipse(30, 58, 9.5, 7, [190, 143, 101, 0.55]);
  ellipse(70, 58, 9.5, 7, [190, 143, 101, 0.55]);

  // mata — tetes gelap dengan kilau
  ellipse(33, 45, 4.6, 5.6, [DARK[0], DARK[1], DARK[2], 1]);
  ellipse(67, 45, 4.6, 5.6, [DARK[0], DARK[1], DARK[2], 1]);
  ellipse(31.6, 43.4, 1.5, 1.7, [245, 240, 225, 1]);
  ellipse(65.6, 43.4, 1.5, 1.7, [245, 240, 225, 1]);

  // moncong lebar khas capybara
  rrect(26, 56, 74, 78, 10, (cx, cy) => mix(BROWN_D, [72, 46, 26], clamp01((cy - 56) / 22)));
  // hidung besar tumpul
  ellipse(50, 62.5, 8.6, 5.2, [DARK[0], DARK[1], DARK[2], 1]);
  // gigi tunggal kebanggaan
  rrect(46.4, 68.6, 53.6, 75.5, 1.6, () => CREAM);

  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
      const o = ((y * S + dy) * W + (x * S + dx)) * 4;
      r += buf[o]; g += buf[o + 1]; b += buf[o + 2]; a += buf[o + 3];
    }
    const n = S * S, o = (y * size + x) * 4;
    out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n); out[o + 2] = Math.round(b / n); out[o + 3] = Math.round((a / n) * 255);
  }
  return out;
}

const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body)); return Buffer.concat([len, body, crc]); };
function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1); }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

for (const size of [192, 512]) {
  fs.writeFileSync(path.join(OUT, `icon-${size}.png`), encodePng(Buffer.from(render(size, false).buffer), size));
}
fs.writeFileSync(path.join(OUT, 'icon-maskable-512.png'), encodePng(Buffer.from(render(512, true).buffer), 512));
console.log('ikon Capybara AI selesai');
