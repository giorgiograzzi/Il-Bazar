#!/usr/bin/env node
// Ridimensiona un PNG RGB a 8 bit non interlacciato (quello prodotto da Chromium headless)
// senza dipendenze esterne, usando solo zlib nativo di Node. Serve unicamente per generare
// le icone della PWA a partire dagli screenshot ad alta risoluzione (evita un bug di
// Chromium headless che produce screenshot corrotti per --window-size molto piccoli).
//
// Uso: node scripts/resize-png.js input.png output.png dimensione

const fs = require("node:fs");
const zlib = require("node:zlib");

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function leggiPng(percorso) {
  const buf = fs.readFileSync(percorso);
  let offset = 8; // firma PNG
  let width, height, bitDepth, colorType;
  const idatParti = [];
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatParti.push(data);
    }
    offset += 8 + len + 4;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`Formato PNG non supportato (bitDepth=${bitDepth}, colorType=${colorType})`);
  }
  const canali = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idatParti));

  const bpp = canali;
  const stride = width * canali;
  const pixels = Buffer.alloc(height * stride);
  let pos = 0;
  let prevRow = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filtro = raw[pos++];
    const row = raw.subarray(pos, pos + stride);
    pos += stride;
    const out = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[x - bpp] : 0;
      const b = prevRow[x];
      const c = x >= bpp ? prevRow[x - bpp] : 0;
      let valore;
      switch (filtro) {
        case 0: valore = row[x]; break;
        case 1: valore = row[x] + a; break;
        case 2: valore = row[x] + b; break;
        case 3: valore = row[x] + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          valore = row[x] + pred;
          break;
        }
        default: throw new Error(`Filtro PNG sconosciuto: ${filtro}`);
      }
      out[x] = valore & 0xff;
    }
    out.copy(pixels, y * stride);
    prevRow = out;
  }
  return { width, height, canali, pixels };
}

function ridimensiona({ width, height, canali, pixels }, nuovaDim) {
  const out = Buffer.alloc(nuovaDim * nuovaDim * canali);
  const scalaX = width / nuovaDim;
  const scalaY = height / nuovaDim;
  for (let ny = 0; ny < nuovaDim; ny++) {
    const y0 = Math.floor(ny * scalaY);
    const y1 = Math.max(y0 + 1, Math.floor((ny + 1) * scalaY));
    for (let nx = 0; nx < nuovaDim; nx++) {
      const x0 = Math.floor(nx * scalaX);
      const x1 = Math.max(x0 + 1, Math.floor((nx + 1) * scalaX));
      const somme = new Array(canali).fill(0);
      let conteggio = 0;
      for (let y = y0; y < y1 && y < height; y++) {
        for (let x = x0; x < x1 && x < width; x++) {
          const idx = (y * width + x) * canali;
          for (let ch = 0; ch < canali; ch++) somme[ch] += pixels[idx + ch];
          conteggio++;
        }
      }
      const outIdx = (ny * nuovaDim + nx) * canali;
      for (let ch = 0; ch < canali; ch++) {
        out[outIdx + ch] = Math.round(somme[ch] / conteggio);
      }
    }
  }
  return out;
}

function scrivPng(percorso, dim, canali, pixels) {
  const stride = dim * canali;
  const conFiltro = Buffer.alloc((stride + 1) * dim);
  for (let y = 0; y < dim; y++) {
    conFiltro[y * (stride + 1)] = 0; // filtro "None"
    pixels.copy(conFiltro, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(conFiltro, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(dim, 0);
  ihdr.writeUInt32BE(dim, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = canali === 4 ? 6 : 2; // color type
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const firma = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const file = Buffer.concat([
    firma,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(percorso, file);
}

const [, , inputPath, outputPath, dimStr] = process.argv;
if (!inputPath || !outputPath || !dimStr) {
  console.error("Uso: node scripts/resize-png.js input.png output.png dimensione");
  process.exit(1);
}
const sorgente = leggiPng(inputPath);
const nuovaDim = parseInt(dimStr, 10);
const pixelRidotti = ridimensiona(sorgente, nuovaDim);
scrivPng(outputPath, nuovaDim, sorgente.canali, pixelRidotti);
console.log(`${inputPath} (${sorgente.width}x${sorgente.height}) -> ${outputPath} (${nuovaDim}x${nuovaDim})`);
