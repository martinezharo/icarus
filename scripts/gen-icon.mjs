/**
 * Generates `app-icon.png` — a 1024x1024 source icon that `tauri icon` expands
 * into every platform format. Pure Node (zlib only), so it runs fully offline.
 *
 * The mark: a thin luminous ring with a muted center dot on deep-ink black —
 * the same monochrome identity as the app. Replace `app-icon.png` with your own
 * artwork any time and re-run `npm run icon`.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SIZE = 1024;
const ink = [9, 9, 11]; //  #09090b background
const crisp = [250, 250, 250]; // #fafafa ring
const muted = [113, 113, 122]; // #71717a center dot

const cx = SIZE / 2;
const cy = SIZE / 2;
const rOuter = 360;
const rInner = 300;
const rDot = 70;

// Soft anti-aliased coverage for a circle boundary at radius `r`.
const edge = (d, r) => Math.max(0, Math.min(1, r + 1.0 - d));

const px = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4;
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);

    let [r, g, b] = ink;

    // Ring = inside outer edge AND outside inner edge.
    const ring = edge(d, rOuter) * (1 - edge(d, rInner));
    if (ring > 0) {
      r = ink[0] + (crisp[0] - ink[0]) * ring;
      g = ink[1] + (crisp[1] - ink[1]) * ring;
      b = ink[2] + (crisp[2] - ink[2]) * ring;
    }

    // Center dot (drawn over background, sits inside the ring's hole).
    const dot = edge(d, rDot);
    if (dot > 0) {
      r = r + (muted[0] - r) * dot;
      g = g + (muted[1] - g) * dot;
      b = b + (muted[2] - b) * dot;
    }

    px[i] = Math.round(r);
    px[i + 1] = Math.round(g);
    px[i + 2] = Math.round(b);
    px[i + 3] = 255;
  }
}

// --- Minimal PNG encoder (RGBA, 8-bit, filter type 0) -----------------------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
// 10..12 = compression / filter / interlace = 0

// Prefix each scanline with filter byte 0.
const raw = Buffer.alloc(SIZE * (1 + SIZE * 4));
for (let y = 0; y < SIZE; y++) {
  const dst = y * (1 + SIZE * 4);
  raw[dst] = 0;
  px.copy(raw, dst + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'app-icon.png');
writeFileSync(out, png);
console.log(`Wrote ${out} (${SIZE}x${SIZE}, ${png.length} bytes)`);
