const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function decodeA85(input) {
  let str = input.replace(/\s+/g, '');
  if (str.endsWith('~>')) str = str.slice(0, -2);
  if (str.startsWith('<~')) str = str.slice(2);
  const out = [];
  let i = 0;
  while (i < str.length) {
    if (str[i] === 'z') { out.push(0, 0, 0, 0); i++; continue; }
    let chunk = str.slice(i, i + 5);
    let pad = 5 - chunk.length;
    let val = 0;
    for (let c = 0; c < 5; c++) {
      let code = (c < chunk.length) ? chunk.charCodeAt(c) - 33 : 84;
      val = val * 85 + code;
    }
    for (let b = 3; b >= pad; b--) {
      out.push((val >> (b * 8)) & 0xff);
    }
    i += chunk.length;
  }
  return Buffer.from(out);
}

const pdfPath = 'C:/Users/PC/.gemini/antigravity-ide/brain/23e2d9dc-0e88-407d-80d9-4cd19f105cc3/.user_uploaded/media_1791044931324.pdf';
const pdf = fs.readFileSync(pdfPath, 'latin1');

const idx0 = pdf.indexOf('/Subtype /Image');
const sStart0 = pdf.indexOf('stream', idx0);
const sEnd0 = pdf.indexOf('endstream', sStart0);
const rgb = zlib.inflateSync(decodeA85(pdf.substring(sStart0 + 6, sEnd0).trim()));

const idx1 = pdf.indexOf('/Subtype /Image', idx0 + 20);
const sStart1 = pdf.indexOf('stream', idx1);
const sEnd1 = pdf.indexOf('endstream', sStart1);
const alpha = zlib.inflateSync(decodeA85(pdf.substring(sStart1 + 6, sEnd1).trim()));

const origWidth = 609;
const origHeight = 401;

// Crop bounds:
// Stamp & signature are between minX: 17, maxX: 600, minY: 51, maxY: 392
const cropX1 = 12;
const cropX2 = 605;
const cropY1 = 48;
const cropY2 = 398;
const cropW = cropX2 - cropX1;
const cropH = cropY2 - cropY1;

const scanlines = Buffer.alloc(cropH * (1 + cropW * 4));
let scanlineOffset = 0;

for (let y = cropY1; y < cropY2; y++) {
  scanlines[scanlineOffset++] = 0; // Filter byte: None
  for (let x = cropX1; x < cropX2; x++) {
    const origIdx = y * origWidth + x;
    const rgbOffset = origIdx * 3;
    scanlines[scanlineOffset++] = rgb[rgbOffset];
    scanlines[scanlineOffset++] = rgb[rgbOffset + 1];
    scanlines[scanlineOffset++] = rgb[rgbOffset + 2];
    scanlines[scanlineOffset++] = alpha[origIdx];
  }
}

const compressed = zlib.deflateSync(scanlines);

const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(cropW, 0);
ihdr.writeUInt32BE(cropH, 4);
ihdr[8] = 8;
ihdr[9] = 6; // RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const ihdrChunk = makeChunk('IHDR', ihdr);
const idatChunk = makeChunk('IDAT', compressed);
const iendChunk = makeChunk('IEND', Buffer.alloc(0));

const croppedPng = Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);

if (!fs.existsSync('public/images')) {
  fs.mkdirSync('public/images', { recursive: true });
}

fs.writeFileSync('public/images/admin-signature.png', croppedPng);
fs.writeFileSync('public/admin-signature.png', croppedPng);
console.log('Saved cropped PNG, dimensions:', cropW, 'x', cropH, 'size:', croppedPng.length);

const base64Data = 'data:image/png;base64,' + croppedPng.toString('base64');
const tsContent = `export const DEFAULT_ADMIN_SIGNATURE = ${JSON.stringify(base64Data)};\nexport const DEFAULT_ADMIN_SIGNATURE_PATH = "/images/admin-signature.png";\n`;
fs.writeFileSync('lib/default-admin-signature.ts', tsContent);
console.log('Saved lib/default-admin-signature.ts');
