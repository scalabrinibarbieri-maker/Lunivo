/**
 * Lunivo V7: cria margem segura no PNG da splash NATIVA usando os pixels originais.
 * Nada é redesenhado. Mais espaço à direita protege o último O contra o recorte
 * circular das splash screens do Android 12+.
 * A imagem é gerada no postinstall para não incluir binários redundantes no ZIP.
 */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const ROOT = path.resolve(__dirname, '..');
const SRC = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'assets/lunivo-logo.png');
const DEST = process.argv[3] ? path.resolve(process.argv[3]) : path.join(ROOT, 'assets/lunivo-logo-splash.png');
const SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');

function readPng(filename) {
  const source = fs.readFileSync(filename);
  if (!source.subarray(0, 8).equals(SIGNATURE)) throw Error('A logo original nao e um PNG valido');
  let ptr = 8, header = null, palette = null, transparency = null;
  const compressed = [];
  while (ptr + 12 <= source.length) {
    const size = source.readUInt32BE(ptr);
    const type = source.toString('ascii', ptr + 4, ptr + 8);
    if (ptr + size + 12 > source.length) throw Error('PNG truncado: ' + type);
    const data = source.subarray(ptr + 8, ptr + 8 + size);
    if (type === 'IHDR') header = {
      width: data.readUInt32BE(0), height: data.readUInt32BE(4), depth: data[8],
      mode: data[9], compression: data[10], filter: data[11], interlace: data[12],
    };
    if (type === 'PLTE') palette = data;
    if (type === 'tRNS') transparency = data;
    if (type === 'IDAT') compressed.push(data);
    ptr += size + 12;
    if (type === 'IEND') break;
  }
  if (!header) throw Error('PNG sem IHDR');
  const { width: w, height: h, depth, mode, interlace } = header;
  if (w < 2 || h < 2 || w * h > 25_000_000) throw Error('Dimensoes de logo inesperadas');
  if (header.compression !== 0 || header.filter !== 0 || interlace !== 0) throw Error('PNG nao entrelacado necessario');
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[mode];
  if (!channels || ![1, 2, 4, 8, 16].includes(depth)) throw Error('Formato PNG nao suportado');
  if (mode !== 0 && mode !== 3 && depth < 8) throw Error('Formato de cor incomum');
  const stride = Math.ceil(w * channels * depth / 8);
  const bpp = Math.max(1, Math.ceil(channels * depth / 8));
  const inflated = zlib.inflateSync(Buffer.concat(compressed));
  if (inflated.length < h * (stride + 1)) throw Error('Dados PNG insuficientes');
  const pixels = Buffer.alloc(w * h * 4);
  let old = Buffer.alloc(stride), offset = 0;
  const sample = (row, pixel, channel) => {
    const index = pixel * channels + channel;
    if (depth === 8) return row[index];
    if (depth === 16) return row[index * 2];
    const bit = index * depth;
    const raw = (row[bit >> 3] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
    return Math.round(raw * 255 / ((1 << depth) - 1));
  };
  for (let y = 0; y < h; y++) {
    const filter = inflated[offset++];
    const row = Buffer.from(inflated.subarray(offset, offset + stride));
    offset += stride;
    if (filter > 4) throw Error('Filtro PNG invalido');
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? row[i - bpp] : 0;
      const b = old[i];
      const c = i >= bpp ? old[i - bpp] : 0;
      let predictor = 0;
      if (filter === 1) predictor = a;
      else if (filter === 2) predictor = b;
      else if (filter === 3) predictor = Math.floor((a + b) / 2);
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      row[i] = (row[i] + predictor) & 255;
    }
    for (let x = 0; x < w; x++) {
      const out = (y * w + x) * 4;
      if (mode === 6) {
        for (let ch = 0; ch < 4; ch++) pixels[out + ch] = sample(row, x, ch);
      } else if (mode === 2) {
        for (let ch = 0; ch < 3; ch++) pixels[out + ch] = sample(row, x, ch);
        pixels[out + 3] = 255;
        if (transparency) {
          const rr = transparency.readUInt16BE(0), gg = transparency.readUInt16BE(2), bb = transparency.readUInt16BE(4);
          if (pixels[out] === (depth === 8 ? rr & 255 : rr >> 8) && pixels[out + 1] === (depth === 8 ? gg & 255 : gg >> 8) && pixels[out + 2] === (depth === 8 ? bb & 255 : bb >> 8)) pixels[out + 3] = 0;
        }
      } else if (mode === 4) {
        pixels[out] = pixels[out + 1] = pixels[out + 2] = sample(row, x, 0);
        pixels[out + 3] = sample(row, x, 1);
      } else if (mode === 0) {
        pixels[out] = pixels[out + 1] = pixels[out + 2] = sample(row, x, 0);
        pixels[out + 3] = 255;
      } else {
        const idx = depth === 8 ? row[x] : ((row[(x * depth) >> 3] >> (8 - depth - ((x * depth) & 7))) & ((1 << depth) - 1));
        if (!palette || idx * 3 + 2 >= palette.length) throw Error('PNG com paleta invalida');
        pixels[out] = palette[idx * 3];
        pixels[out + 1] = palette[idx * 3 + 1];
        pixels[out + 2] = palette[idx * 3 + 2];
        pixels[out + 3] = transparency?.[idx] ?? 255;
      }
    }
    old = row;
  }
  return { w, h, pixels };
}
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  return c >>> 0;
});
function chunk(type, data) {
  const label = Buffer.from(type, 'ascii');
  const frame = Buffer.concat([label, data]);
  let crc = 0xffffffff;
  for (let i = 0; i < frame.length; i++) crc = CRC_TABLE[(crc ^ frame[i]) & 255] ^ (crc >>> 8);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const check = Buffer.alloc(4); check.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, frame, check]);
}
function pngRgba(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const stride = width * 4;
  const unfiltered = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) rgba.copy(unfiltered, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(unfiltered, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function main() {
  const { w, h, pixels } = readPng(SRC);
  let minX = w, maxX = -1, minY = h, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (pixels[(y * w + x) * 4 + 3] > 2) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) throw Error('Logo sem pixels visiveis');
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  // A borda esquerda e a direita têm área transparente real, sem mascarar letras.
  // O lado direito recebe folga adicional para o 'O' final do nome Lunivo.
  const safeLeftX = Math.max(42, Math.ceil(cw * 0.28));
  const safeRightX = Math.max(60, Math.ceil(cw * 0.40));
  const safeY = Math.max(28, Math.ceil(ch * 0.25));
  const nw = cw + safeLeftX + safeRightX, nh = ch + safeY * 2;
  const output = Buffer.alloc(nw * nh * 4);
  for (let y = 0; y < ch; y++) pixels.copy(output, ((y + safeY) * nw + safeLeftX) * 4, ((y + minY) * w + minX) * 4, ((y + minY) * w + minX + cw) * 4);
  const serialized = pngRgba(nw, nh, output);
  if (!fs.existsSync(DEST) || !fs.readFileSync(DEST).equals(serialized)) {
    fs.mkdirSync(path.dirname(DEST), { recursive: true });
    fs.writeFileSync(DEST, serialized);
  }
  console.log(`Splash Lunivo V7: ${w}x${h} -> ${nw}x${nh}, margens sem alterar pixels (${safeLeftX}px esquerda, ${safeRightX}px direita, ${safeY}px vertical)`);
}
main();
